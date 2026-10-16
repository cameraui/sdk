package sdk

import (
	"context"
	"errors"
	"fmt"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"sync"
	"sync/atomic"
	"syscall"
	"time"

	rpc "github.com/cameraui/rpc/go"
)

type runtimePhase string

const (
	phaseReadySent    runtimePhase = "ready-sent"
	phaseStarting     runtimePhase = "starting"
	phaseStarted      runtimePhase = "started"
	phaseReattachWait runtimePhase = "reattach-wait"
	phaseReattaching  runtimePhase = "reattaching"
	phaseStartError   runtimePhase = "start-error"
)

// host STOP arrived mid-startup, tear down instead of reporting a startup error
var errStopRequested = errors.New("stop requested during startup")

var reattachRetryDelays = []time.Duration{time.Second, 2 * time.Second, 5 * time.Second, 10 * time.Second}

const shutdownListenerTimeout = 1500 * time.Millisecond

// the stores save once after the listeners, a reachable master answers in milliseconds
const storeSaveReserve = time.Second

// one handler drain (250 ms plus 50 ms grace) on top of the flush and close
const rpcTeardownTimeout = 800 * time.Millisecond

const gracefulShutdownTimeout = 2 * time.Second

const reattachDeadline = 240 * time.Second

const resumeMismatch = "resume-mismatch"

type channelEvent struct {
	start  *processLoadMessage
	resume *resumeData
}

// the run loop owns the phase and every plugin handle, channel callbacks only queue events
type pluginRuntime struct {
	constructor pluginConstructor
	client      *rpc.Client
	namespaces  *pluginNamespaces
	logger      *Logger
	instanceID  string

	channelMu sync.Mutex
	channel   *rpc.PrivateChannel

	stop         chan struct{}
	requestStop  func()
	stopBudget   atomic.Int64
	teardownOnce sync.Once
	// a START with a session or a resume came, so the master opens its side again after a close
	level2Master atomic.Bool
	events       chan channelEvent

	phase       runtimePhase
	attachedRun string
	startError  string

	api               *PluginAPI
	plugin            Plugin
	cleanupRPC        rpc.CleanupFunc
	fileSrv           *fileServer
	persistence       configPersistence
	coreManager       *CoreManager
	deviceManager     *DeviceManager
	sensorManager     *SensorManager
	storageController *StorageController
}

func newPluginRuntime(constructor pluginConstructor, client *rpc.Client, namespaces *pluginNamespaces, logger *Logger) *pluginRuntime {
	r := &pluginRuntime{
		constructor: constructor,
		client:      client,
		namespaces:  namespaces,
		logger:      logger,
		instanceID:  os.Getenv(instanceIDEnv),
		stop:        make(chan struct{}),
		events:      make(chan channelEvent, 64),
		phase:       phaseReadySent,
	}
	r.requestStop = sync.OnceFunc(func() { close(r.stop) })
	return r
}

func (r *pluginRuntime) run() {
	signals := make(chan os.Signal, 1)
	if hostSpeaksStopLine() {
		signal.Notify(signals, syscall.SIGTERM)
	} else {
		signal.Notify(signals, syscall.SIGTERM, syscall.SIGINT)
	}
	go func() {
		<-signals
		r.requestStop()
	}()
	watchHostStop(func(budget time.Duration) {
		r.stopBudget.Store(int64(budget))
		r.requestStop()
	})

	if err := r.openChannel(); err != nil {
		os.Exit(1)
	}
	if err := r.sendReady(false); err != nil {
		r.teardown()
		os.Exit(1)
	}

	defer func() {
		if recovered := recover(); recovered != nil {
			r.logger.Error("Plugin panicked:", recovered)
			r.stopBounded()
			os.Exit(1)
		}
	}()

	for {
		select {
		case <-r.stop:
			r.stopBounded()
			return
		case event := <-r.events:
			if r.stopRequested() {
				continue
			}
			if event.start != nil {
				r.onStart(event.start)
			} else {
				r.onResume(event.resume.RunID)
			}
		}
	}
}

func (r *pluginRuntime) stopRequested() bool {
	select {
	case <-r.stop:
		return true
	default:
		return false
	}
}

func (r *pluginRuntime) openChannel() error {
	channel, err := r.client.PrivateChannelConnect("plugin-communication", "camera.ui")
	if err != nil {
		return err
	}
	channel.OnMessage(r.onMessage)
	channel.OnClose(func() { r.onChannelClose(channel) })

	r.channelMu.Lock()
	r.channel = channel
	r.channelMu.Unlock()
	return nil
}

// under an older master the channel stays closed, it closes on purpose before its local fallback
func (r *pluginRuntime) onChannelClose(channel *rpc.PrivateChannel) {
	r.channelMu.Lock()
	current := channel == r.channel
	r.channelMu.Unlock()
	if r.stopRequested() || !current || !r.level2Master.Load() {
		return
	}
	go func() {
		if err := r.openChannel(); err != nil {
			r.logger.Warn("Could not open the channel to camera.ui again:", err)
		}
	}()
}

func (r *pluginRuntime) onMessage(data any) {
	if r.stopRequested() {
		return
	}

	message, ok := data.(map[string]any)
	if !ok {
		return
	}

	msgType, _ := message["type"].(string)
	switch msgType {
	case string(pluginCommandStart):
		if message["data"] == nil {
			_ = r.send(&processResponse{Type: string(PluginStatusError), Error: "No data provided"})
			return
		}
		var load processLoadMessage
		if err := decodeMessageData(message["data"], &load); err != nil {
			_ = r.send(&processResponse{Type: string(PluginStatusError), Error: err.Error()})
			return
		}
		// every instance of the plugin listens on the channel, a START names the one it is for
		if load.Session != nil && !r.addressedToMe(load.Session.InstanceID) {
			r.logger.Debug("Ignored START for instance", load.Session.InstanceID)
			return
		}
		r.queue(channelEvent{start: &load})

	case string(pluginCommandResume):
		var resume resumeData
		if err := decodeMessageData(message["data"], &resume); err != nil || !r.addressedToMe(resume.InstanceID) {
			return
		}
		r.queue(channelEvent{resume: &resume})

	case string(pluginCommandStop):
		r.requestStop()
	}
}

func (r *pluginRuntime) addressedToMe(instanceID string) bool {
	return instanceID == "" || r.instanceID == "" || instanceID == r.instanceID
}

func (r *pluginRuntime) queue(event channelEvent) {
	select {
	case r.events <- event:
	default:
		r.logger.Debug("Dropped a message from camera.ui, the plugin is still busy")
	}
}

func (r *pluginRuntime) onStart(load *processLoadMessage) {
	runID := ""
	if load.Session != nil {
		runID = load.Session.RunID
		r.level2Master.Store(true)
	}

	switch {
	case r.phase == phaseReadySent:
		r.start(load, runID)
	case (r.phase == phaseStarted || r.phase == phaseReattachWait) && runID != "" && runID != r.attachedRun:
		r.reattach(load, runID)
	default:
		// a second START would run the plugin twice
		r.logger.Debug("Ignored START while", string(r.phase))
	}
}

// a resume that came while a start or re-attach ran waits in the queue until it ends
func (r *pluginRuntime) onResume(runID string) {
	r.level2Master.Store(true)

	switch {
	case r.phase == phaseReadySent:
		_ = r.sendReady(false)
	case r.phase == phaseStarted && runID == r.attachedRun:
		_ = r.sendStarted(true)
	case r.phase == phaseStarted || r.phase == phaseReattachWait:
		r.phase = phaseReattachWait
		_ = r.sendReady(true)
	case r.phase == phaseStartError:
		_ = r.sendError(r.startError, "")
	}
}

func (r *pluginRuntime) start(load *processLoadMessage, runID string) {
	r.phase = phaseStarting

	switch err := r.startPlugin(load); {
	case err == nil:
		r.phase = phaseStarted
		r.attachedRun = runID
		_ = r.sendStarted(false)
		time.Sleep(100 * time.Millisecond)
		r.api.Emit(string(APIEventFinishLaunching))
	case errors.Is(err, errStopRequested):
	default:
		// report the error and stay alive, the host decides when to send STOP
		r.phase = phaseStartError
		r.startError = err.Error()
		_ = r.sendError(r.startError, "")
	}
}

func (r *pluginRuntime) reattach(load *processLoadMessage, runID string) {
	r.phase = phaseReattaching

	if err := r.runReattachSteps(load.Cameras); err != nil {
		if errors.Is(err, errStopRequested) {
			return
		}
		r.phase = phaseStartError
		r.startError = fmt.Sprintf("could not attach to the new camera.ui run: %v", err)
		r.logger.Error("Could not attach to the new camera.ui run:", err)
		_ = r.sendError(r.startError, resumeMismatch)
		return
	}

	r.phase = phaseStarted
	r.attachedRun = runID
	r.logger.Debug("Attached to camera.ui run", runID)
	_ = r.sendStarted(true)
}

// every step is safe to repeat, one that fails on the link runs again until the deadline
func (r *pluginRuntime) runReattachSteps(cameras []Camera) error {
	if r.api == nil {
		return errors.New("the plugin never started")
	}

	steps := []func() error{
		r.sensorManager.reattach,
		func() error { return r.deviceManager.reattach(cameras) },
		r.persistence.flush,
	}
	deadline := time.Now().Add(reattachDeadline)
	for attempt := 0; ; attempt++ {
		var failed []func() error
		var lastErr error
		for _, step := range steps {
			if err := step(); err != nil {
				failed = append(failed, step)
				lastErr = err
			}
		}
		if lastErr == nil {
			return nil
		}

		delay := reattachRetryDelays[min(attempt, len(reattachRetryDelays)-1)]
		if time.Now().Add(delay).After(deadline) {
			return lastErr
		}
		r.logger.Debug(fmt.Sprintf("Attaching to camera.ui failed, retrying in %s: %v", delay, lastErr))
		select {
		case <-time.After(delay):
		case <-r.stop:
			return errStopRequested
		}
		steps = failed
	}
}

func (r *pluginRuntime) send(response *processResponse) error {
	response.InstanceID = r.instanceID

	r.channelMu.Lock()
	channel := r.channel
	r.channelMu.Unlock()

	err := channel.Send(response)
	if err != nil {
		r.logger.Debug("Could not send to camera.ui:", err)
	}
	return err
}

func (r *pluginRuntime) sendReady(resume bool) error {
	return r.send(&processResponse{Type: string(PluginStatusReady), Handshake: handshakeLevel, Resume: resume})
}

func (r *pluginRuntime) sendStarted(resumed bool) error {
	return r.send(&processResponse{Type: string(PluginStatusStarted), RunID: r.attachedRun, Resumed: resumed})
}

func (r *pluginRuntime) sendError(message, code string) error {
	return r.send(&processResponse{Type: string(PluginStatusError), Error: message, Code: code})
}

func (r *pluginRuntime) startPlugin(load *processLoadMessage) error {
	client := r.client
	logger := r.logger

	storagePath := load.Storage.StoragePath
	if envPath := os.Getenv("PLUGIN_STORAGE_PATH"); envPath != "" {
		storagePath = envPath
	}

	pluginInfo := load.Plugin

	if os.Getenv("PLUGIN_CONFIG_STORE_RPC") != "" {
		remote, err := newRemotePersistence(client, pluginInfo.ID, storagePath, r.instanceID, logger)
		if err != nil {
			return fmt.Errorf("failed to connect config store: %w", err)
		}
		r.persistence = remote
	} else {
		storePath := filepath.Join(storagePath, "volume", storeFileName)
		local, err := newFilePersistence(storePath, logger)
		if err != nil {
			return fmt.Errorf("failed to open config store: %w", err)
		}
		r.persistence = local
	}

	if r.stopRequested() {
		return errStopRequested
	}

	r.coreManager = newCoreManager(client, logger)
	r.deviceManager = newDeviceManager(client, &pluginInfo, logger)
	downloadManager := newDownloadManager(client)

	if os.Getenv("PLUGIN_REMOTE_MODE") != "" {
		fs, err := newFileServer(client, pluginInfo.ID)
		if err != nil {
			return fmt.Errorf("failed to register file server: %w", err)
		}
		r.fileSrv = fs
	}
	notificationManager := newNotificationManager(client, &pluginInfo, logger)
	r.storageController = newStorageController(client, r.persistence, &pluginInfo, logger)
	r.sensorManager = newSensorManager(client, r.storageController, &pluginInfo, logger)

	r.api = newPluginAPI(r.coreManager, r.deviceManager, r.sensorManager, downloadManager, notificationManager, r.storageController, storagePath)
	r.deviceManager.setAPI(r.api, r.storageController)

	pluginStorage, err := r.storageController.createStorage("plugin")
	if err != nil {
		return fmt.Errorf("failed to create storage: %w", err)
	}

	r.plugin = r.constructor(logger, r.api, pluginStorage)

	if schemaProvider, ok := r.plugin.(StorageSchemaProvider); ok {
		schemas := schemaProvider.StorageSchema()
		if len(schemas) > 0 {
			pluginStorage.DefineSchemas(schemas)
		}
	}

	r.cleanupRPC, err = client.RegisterHandler(r.namespaces.PluginChildRPC, r.plugin)
	if err != nil {
		return fmt.Errorf("failed to register handler: %w", err)
	}

	if r.stopRequested() {
		return errStopRequested
	}

	r.deviceManager.setPlugin(r.plugin)
	r.sensorManager.setPlugin(r.plugin)
	if err := r.deviceManager.init(); err != nil {
		return fmt.Errorf("failed to init device manager: %w", err)
	}
	if err := r.coreManager.init(); err != nil {
		return fmt.Errorf("failed to init core manager: %w", err)
	}

	if r.stopRequested() {
		return errStopRequested
	}

	cameras := load.Cameras
	cameraDevices := make([]*CameraDevice, 0, len(cameras))
	for i := range cameras {
		cam := &cameras[i]
		camLogger := logger.CreateLogger(&loggerOptions{
			Suffix:     cam.Name,
			TargetID:   cam.ID,
			TargetType: "camera",
		})
		cameraDevice := newCameraDeviceProxy(client, r.api, r.storageController, cam, &pluginInfo, camLogger)
		if err := cameraDevice.init(); err != nil {
			return fmt.Errorf("failed to init camera device %s: %w", cam.Name, err)
		}
		cameraDevices = append(cameraDevices, cameraDevice)
	}

	r.deviceManager.configureCameras(cameraDevices)

	if err := r.plugin.ConfigureCameras(cameraDevices); err != nil {
		return fmt.Errorf("ConfigureCameras failed: %w", err)
	}

	if err := r.sensorManager.init(); err != nil {
		return fmt.Errorf("failed to init sensor manager: %w", err)
	}
	r.sensorManager.configureAdoptedSensors()

	if r.stopRequested() {
		return errStopRequested
	}

	return nil
}

func (r *pluginRuntime) teardown() {
	r.teardownOnce.Do(func() {
		r.requestStop()

		if r.api != nil {
			// listeners get what the host's budget leaves after the steps behind them
			listenerTimeout := max(shutdownListenerTimeout, r.stopDeadline()-rpcTeardownTimeout-storeSaveReserve)
			completed := r.api.emitAndWait(string(APIEventShutdown), listenerTimeout, func(recovered any) {
				r.logger.Error("Shutdown listener panicked:", recovered)
			})
			if !completed {
				r.logger.Warn("Shutdown listeners still pending after", listenerTimeout, ", continuing teardown")
			}

			// runtime-owned teardown, ordered: devices (+ their sensors) ->
			// core manager -> storages, flushed last so cleanup writes land
			if r.sensorManager != nil {
				r.sensorManager.close()
			}
			if r.deviceManager != nil {
				r.deviceManager.close()
			}
			if r.coreManager != nil {
				r.coreManager.close()
			}
			if r.storageController != nil {
				r.storageController.close()
			}

			r.api.RemoveAllListeners("")
		}
		if r.persistence != nil {
			r.persistence.close()
		}

		done := make(chan struct{})
		go func() {
			var closers []func()
			if r.cleanupRPC != nil {
				closers = append(closers, func() { _ = r.cleanupRPC() })
			}
			if r.fileSrv != nil {
				closers = append(closers, r.fileSrv.close)
			}
			runTogether(closers)

			r.channelMu.Lock()
			channel := r.channel
			r.channelMu.Unlock()
			if channel != nil {
				_ = channel.Close()
			}
			_ = r.client.Disconnect()
			close(done)
		}()
		select {
		case <-done:
		case <-time.After(rpcTeardownTimeout):
			r.logger.Warn("RPC teardown still pending after", rpcTeardownTimeout, ", exiting anyway")
		}
	})
}

func (r *pluginRuntime) stopBounded() {
	deadline := r.stopDeadline()
	done := make(chan struct{})
	go func() {
		r.teardown()
		close(done)
	}()
	select {
	case <-done:
	case <-time.After(deadline):
		r.logger.Warn("Graceful shutdown exceeded deadline, forcing exit")
	}
}

func (r *pluginRuntime) stopDeadline() time.Duration {
	if budget := time.Duration(r.stopBudget.Load()); budget > 0 {
		return budget
	}
	return hostStopBudget(gracefulShutdownTimeout)
}

// Run is the entry point a Go plugin's main package calls to hand control to
// the SDK runtime. It connects to the host, builds the plugin through the
// constructor and blocks until the host stops the process.
//
// Example:
//
//	func main() {
//	    sdk.Run(NewPlugin)
//	}
func Run(constructor pluginConstructor) {
	processName := "Plugin"
	if len(os.Args) > 2 {
		processName = os.Args[2]
	} else if len(os.Args) > 1 {
		processName = os.Args[1]
	}

	pluginID := os.Getenv("PLUGIN_ID")

	namespaces := getPluginNamespaces(pluginID)
	endpoints := strings.Split(os.Getenv("PROXY_ENDPOINTS"), ",")
	client := rpc.NewClient(rpc.ClientOptions{
		Name:    namespaces.PluginChild,
		Servers: endpoints,
		Auth: &rpc.AuthOptions{
			User:     os.Getenv("PROXY_USER"),
			Password: os.Getenv("PROXY_PASSWORD"),
		},
	})

	for _, key := range []string{"PROXY_USER", "PROXY_PASSWORD", "PROXY_ENDPOINTS", "PROXY_CERT", "PROXY_KEY", "PROXY_CA"} {
		_ = os.Unsetenv(key)
	}

	loggerLevel := os.Getenv("LOGGER_LEVEL")
	logger := newLogger(&loggerOptions{
		Prefix:       processName,
		TargetID:     pluginID,
		TargetType:   "plugin",
		PluginID:     pluginID,
		DebugEnabled: loggerLevel == "debug" || loggerLevel == "trace",
		TraceEnabled: loggerLevel == "trace",
	})

	if err := client.Connect(context.Background()); err != nil {
		logger.Error(fmt.Sprintf("camera.ui not reachable on %s: %v", strings.Join(endpoints, ", "), err))
		os.Exit(1)
	}

	newPluginRuntime(constructor, client, &namespaces, logger).run()
}

func decodeMessageData(raw, target any) error {
	encoded, err := rpc.Encode(raw)
	if err != nil {
		return fmt.Errorf("failed to encode data: %w", err)
	}
	if err := rpc.Decode(encoded, target); err != nil {
		return fmt.Errorf("failed to decode data: %w", err)
	}
	return nil
}
