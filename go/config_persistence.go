package sdk

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"maps"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	rpc "github.com/cameraui/rpc/go"
)

const (
	remoteStoreTimeout = 10 * time.Second
	spillFileName      = ".pending-config.json"
	spillMaxAge        = 24 * time.Hour
	staleInstance      = "STALE_INSTANCE"
)

var remoteRetryDelays = []time.Duration{time.Second, 2 * time.Second, 5 * time.Second, 10 * time.Second}

type configPersistence interface {
	load(loc storeLocation) map[string]any
	save(loc storeLocation, values map[string]any) func() error
	flush() error
	close()
}

type pendingFlush struct {
	snapshot any
	err      error
	done     chan struct{}
}

func (p *pendingFlush) wait() error {
	// close(done) orders the read of err
	<-p.done
	return p.err
}

type coalescingWriter struct {
	flush func(snapshot any) error
	log   *Logger

	mu       sync.Mutex
	inFlight bool
	pending  *pendingFlush
}

func newCoalescingWriter(flush func(snapshot any) error, log *Logger) *coalescingWriter {
	return &coalescingWriter{flush: flush, log: log}
}

func (w *coalescingWriter) enqueue(snapshot any) *pendingFlush {
	w.mu.Lock()
	defer w.mu.Unlock()

	if w.pending == nil {
		w.pending = &pendingFlush{done: make(chan struct{})}
	}
	w.pending.snapshot = snapshot
	p := w.pending
	if !w.inFlight {
		w.inFlight = true
		go w.run()
	}
	return p
}

func (w *coalescingWriter) write(snapshot any) error {
	return w.enqueue(snapshot).wait()
}

func (w *coalescingWriter) run() {
	for {
		w.mu.Lock()
		p := w.pending
		w.pending = nil
		if p == nil {
			w.inFlight = false
			w.mu.Unlock()
			return
		}
		w.mu.Unlock()

		p.err = w.runFlush(p.snapshot)
		close(p.done)
	}
}

func (w *coalescingWriter) runFlush(snapshot any) (err error) {
	defer func() {
		if r := recover(); r != nil {
			err = fmt.Errorf("store: flush panicked: %v", r)
		}
	}()
	return w.flush(snapshot)
}

type filePersistence struct {
	path   string
	logger *Logger
	writer *coalescingWriter

	mu  sync.Mutex
	doc map[string]any
}

func newFilePersistence(path string, logger *Logger) (*filePersistence, error) {
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return nil, err
	}

	removeOrphanedStoreTmpFiles(path)

	doc, found, err := readStoreFile(path, logger)
	if err != nil {
		return nil, err
	}
	if !found {
		doc = map[string]any{}
	}

	doc, changed := upgradeStoreLayout(doc)
	// a fresh store persists its (possibly empty) envelope immediately
	if !found || changed {
		if err := writeStoreFile(path, doc, logger); err != nil {
			return nil, err
		}
	}
	backupStoreFile(path, logger)

	fp := &filePersistence{path: path, logger: logger, doc: doc}
	fp.writer = newCoalescingWriter(func(snapshot any) error {
		return writeStoreBytes(path, snapshot.([]byte), logger)
	}, logger)

	return fp, nil
}

func (fp *filePersistence) load(loc storeLocation) map[string]any {
	fp.mu.Lock()
	defer fp.mu.Unlock()

	values := readLocation(fp.doc, loc)
	if values == nil {
		return nil
	}
	copied, _ := deepCopyValue(values).(map[string]any)
	return copied
}

func (fp *filePersistence) flush() error { return nil }

func (fp *filePersistence) close() {}

func (fp *filePersistence) save(loc storeLocation, values map[string]any) func() error {
	fp.mu.Lock()
	if len(values) == 0 {
		// an empty value map reads the same as never set, deleting keeps empty sections out of the file
		deleteLocation(fp.doc, loc)
	} else {
		copied, _ := deepCopyValue(values).(map[string]any)
		writeLocation(fp.doc, loc, copied)
	}
	// encoding under the lock is safe, the doc is solely owned
	data, err := encodeEnvelope(fp.doc)
	if err != nil {
		fp.mu.Unlock()
		fp.logger.Error(fmt.Sprintf("store: encode for %s failed: %v", fp.path, err))
		return func() error { return err }
	}
	// enqueue before unlocking so flush order matches doc-install order
	p := fp.writer.enqueue(data)
	fp.mu.Unlock()
	return p.wait
}

type remotePersistence struct {
	proxy      *rpc.Proxy
	probe      *rpc.Proxy
	logger     *Logger
	writer     *coalescingWriter
	instanceID string
	spillPath  string

	mu      sync.Mutex
	cache   map[string]any
	rev     string
	seq     uint64
	saved   uint64
	attempt int
	retry   *time.Timer
	closed  bool
}

type remoteSnapshot struct {
	doc map[string]any
	seq uint64
}

type configSpill struct {
	InstanceID string         `json:"instanceId,omitempty"`
	BaseRev    string         `json:"baseRev,omitempty"`
	Doc        map[string]any `json:"doc"`
	At         int64          `json:"at"`
}

func newRemotePersistence(client *rpc.Client, pluginID, storagePath, instanceID string, logger *Logger) (*remotePersistence, error) {
	ns := getPluginNamespaces(pluginID)
	proxy := client.CreateProxy(ns.PluginConfigStoreRPC)
	// probe never retries on no responders, an older master has no load or putIfRev
	rp := &remotePersistence{
		proxy:      proxy,
		probe:      proxy.WithOptions(rpc.RequestOptions{NoResponderRetry: &rpc.NoResponderRetryOptions{MaxRetries: -1}}),
		logger:     logger,
		instanceID: instanceID,
		spillPath:  filepath.Join(storagePath, spillFileName),
		cache:      map[string]any{},
	}
	rp.writer = newCoalescingWriter(rp.flushSnapshot, logger)

	// a worker never created the storage folder of the plugin
	if err := os.MkdirAll(storagePath, 0o755); err != nil {
		logger.Debug("Could not create the storage folder for unsaved config changes:", err)
	}
	if err := rp.replaySpill(); err != nil {
		return nil, err
	}
	if err := rp.loadDoc(); err != nil {
		return nil, err
	}

	doc, changed := upgradeStoreLayout(rp.cache)
	rp.cache = doc
	if changed {
		rp.seq++
		if err := rp.flushSnapshot(remoteSnapshot{doc: snapshotStoreDoc(doc), seq: rp.seq}); err != nil {
			rp.close()
			return nil, err
		}
	}

	return rp, nil
}

func (rp *remotePersistence) load(loc storeLocation) map[string]any {
	rp.mu.Lock()
	defer rp.mu.Unlock()

	values := readLocation(rp.cache, loc)
	if values == nil {
		return nil
	}
	copied, _ := deepCopyValue(values).(map[string]any)
	return copied
}

func (rp *remotePersistence) save(loc storeLocation, values map[string]any) func() error {
	rp.mu.Lock()
	if len(values) == 0 {
		deleteLocation(rp.cache, loc)
	} else {
		copied, _ := deepCopyValue(values).(map[string]any)
		writeLocation(rp.cache, loc, copied)
	}
	rp.seq++
	snapshot := remoteSnapshot{doc: snapshotStoreDoc(rp.cache), seq: rp.seq}
	// synchronous, so a kill at any point after the save leaves the change on disk
	rp.writeSpillLocked(snapshot.doc)
	// enqueue before unlocking so flush order matches cache-install order
	p := rp.writer.enqueue(snapshot)
	rp.mu.Unlock()
	return p.wait
}

func (rp *remotePersistence) flush() error {
	rp.mu.Lock()
	if rp.saved >= rp.seq {
		rp.mu.Unlock()
		return nil
	}
	if rp.retry != nil {
		rp.retry.Stop()
		rp.retry = nil
	}
	p := rp.writer.enqueue(remoteSnapshot{doc: snapshotStoreDoc(rp.cache), seq: rp.seq})
	rp.mu.Unlock()
	return p.wait()
}

func (rp *remotePersistence) close() {
	rp.mu.Lock()
	defer rp.mu.Unlock()
	rp.closed = true
	if rp.retry != nil {
		rp.retry.Stop()
		rp.retry = nil
	}
}

func (rp *remotePersistence) flushSnapshot(snapshot any) error {
	snap := snapshot.(remoteSnapshot)
	args := []any{snap.doc}
	if rp.instanceID != "" {
		args = append(args, map[string]any{"instanceId": rp.instanceID})
	}

	ctx, cancel := context.WithTimeout(context.Background(), remoteStoreTimeout)
	defer cancel()
	result, err := rp.proxy.Invoke(ctx, "put", args...)

	rp.mu.Lock()
	defer rp.mu.Unlock()
	if err != nil && strings.Contains(err.Error(), staleInstance) {
		rp.logger.Warn(fmt.Sprintf("Dropped a config change: instance %s no longer runs the plugin", rp.instanceID))
		rp.settleLocked(snap.seq)
		return nil
	}
	if err != nil {
		if rp.attempt == 0 {
			// no responders: the master restarts, the change waits on disk
			if isNoResponders(err) {
				rp.logger.Debug("Saving the config failed, retrying:", err)
			} else {
				rp.logger.Warn("Saving the config failed, retrying:", err)
			}
		}
		rp.attempt++
		rp.scheduleRetryLocked()
		return err
	}

	rp.attempt = 0
	rp.rev = ""
	if saved, ok := normalizeStoreValue(result).(map[string]any); ok {
		rp.rev, _ = saved["rev"].(string)
	}
	rp.settleLocked(snap.seq)
	return nil
}

func (rp *remotePersistence) settleLocked(seq uint64) {
	rp.saved = max(rp.saved, seq)
	if rp.saved >= rp.seq {
		rp.removeSpill()
	} else {
		// a newer change builds on this save
		rp.writeSpillLocked(snapshotStoreDoc(rp.cache))
	}
}

func (rp *remotePersistence) scheduleRetryLocked() {
	if rp.closed || rp.retry != nil {
		return
	}
	delay := remoteRetryDelays[min(rp.attempt-1, len(remoteRetryDelays)-1)]
	rp.retry = time.AfterFunc(delay, rp.retrySave)
}

func (rp *remotePersistence) retrySave() {
	rp.mu.Lock()
	rp.retry = nil
	if rp.closed || rp.saved >= rp.seq {
		rp.mu.Unlock()
		return
	}
	p := rp.writer.enqueue(remoteSnapshot{doc: snapshotStoreDoc(rp.cache), seq: rp.seq})
	rp.mu.Unlock()
	_ = p.wait()
}

func (rp *remotePersistence) loadDoc() error {
	ctx, cancel := context.WithTimeout(context.Background(), remoteStoreTimeout)
	defer cancel()

	result, err := rp.probe.Invoke(ctx, "load")
	if err == nil {
		loaded, _ := normalizeStoreValue(result).(map[string]any)
		if doc, ok := loaded["doc"].(map[string]any); ok {
			rp.cache = doc
		}
		rp.rev, _ = loaded["rev"].(string)
		return nil
	}
	if !isNoResponders(err) {
		return err
	}

	result, err = rp.proxy.Invoke(ctx, "get")
	if err != nil {
		return err
	}
	if doc, ok := normalizeStoreValue(result).(map[string]any); ok {
		rp.cache = doc
	}
	return nil
}

func (rp *remotePersistence) replaySpill() error {
	data, err := os.ReadFile(rp.spillPath)
	if errors.Is(err, os.ErrNotExist) {
		return nil
	}
	var spill configSpill
	if err == nil {
		err = json.Unmarshal(data, &spill)
	}
	if err != nil {
		rp.logger.Warn("Dropped an unreadable unsaved config change:", err)
		rp.removeSpill()
		return nil
	}
	if len(spill.Doc) == 0 || time.Since(time.UnixMilli(spill.At)) > spillMaxAge {
		rp.logger.Warn("Dropped an unsaved config change older than 24 h")
		rp.removeSpill()
		return nil
	}
	if spill.BaseRev == "" {
		rp.logger.Warn("Dropped an unsaved config change made under an older camera.ui server")
		rp.removeSpill()
		return nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), remoteStoreTimeout)
	defer cancel()
	result, err := rp.probe.Invoke(ctx, "putIfRev", spill.Doc, spill.BaseRev, map[string]any{"instanceId": rp.instanceID, "madeBy": spill.InstanceID})
	switch {
	case err == nil:
		outcome, _ := normalizeStoreValue(result).(map[string]any)
		if applied, _ := outcome["applied"].(bool); applied {
			rp.logger.Log("Restored a config change the last run did not save")
		} else {
			rp.logger.Warn(fmt.Sprintf("Dropped an unsaved config change of the last run (instance %s), the config was saved in between", spill.InstanceID))
		}
	case isNoResponders(err):
		rp.logger.Warn("Dropped an unsaved config change, the camera.ui server is too old to take it")
	case strings.Contains(err.Error(), staleInstance):
		rp.logger.Warn("Dropped an unsaved config change: this instance no longer runs the plugin")
	default:
		// kept for the next start
		return err
	}
	rp.removeSpill()
	return nil
}

func (rp *remotePersistence) writeSpillLocked(doc map[string]any) {
	data, err := json.Marshal(configSpill{InstanceID: rp.instanceID, BaseRev: rp.rev, Doc: doc, At: time.Now().UnixMilli()})
	if err == nil {
		tmp := rp.spillPath + ".tmp"
		if err = os.WriteFile(tmp, data, 0o600); err == nil {
			err = os.Rename(tmp, rp.spillPath)
		}
	}
	if err != nil {
		rp.logger.Debug("Could not write the unsaved config change to disk:", err)
	}
}

func (rp *remotePersistence) removeSpill() {
	_ = os.Remove(rp.spillPath)
}

func snapshotStoreDoc(doc map[string]any) map[string]any {
	// containers only, leaf value maps are shared on purpose: saves replace them wholesale
	out := maps.Clone(doc)
	if cameras, ok := doc["cameras"].(map[string]any); ok {
		out["cameras"] = maps.Clone(cameras)
	}
	if sensors, ok := doc["sensors"].(map[string]any); ok {
		byCamera := make(map[string]any, len(sensors))
		for cameraID, v := range sensors {
			byType, ok := v.(map[string]any)
			if !ok {
				byCamera[cameraID] = v
				continue
			}
			typeCopy := make(map[string]any, len(byType))
			for sensorType, v2 := range byType {
				if byName, ok := v2.(map[string]any); ok {
					typeCopy[sensorType] = maps.Clone(byName)
				} else {
					typeCopy[sensorType] = v2
				}
			}
			byCamera[cameraID] = typeCopy
		}
		out["sensors"] = byCamera
	}
	return out
}

func isNoResponders(err error) bool {
	var rpcErr *rpc.RPCException
	return errors.As(err, &rpcErr) && rpcErr.Code == rpc.ErrCodeNotFound
}

func deepCopyValue(v any) any {
	switch val := v.(type) {
	case map[string]any:
		out := make(map[string]any, len(val))
		for k, item := range val {
			out[k] = deepCopyValue(item)
		}
		return out
	case []any:
		out := make([]any, len(val))
		for i, item := range val {
			out[i] = deepCopyValue(item)
		}
		return out
	case []byte:
		out := make([]byte, len(val))
		copy(out, val)
		return out
	default:
		return val
	}
}
