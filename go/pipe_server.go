package sdk

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"sync"
	"sync/atomic"
	"time"

	rpc "github.com/cameraui/rpc/go"
)

const (
	defaultPipeTTL = 10 * time.Minute
	// the transport takes 4 MB per message and other calls share the connection,
	// smaller chunks cost more CPU per byte
	pipeChunkSize = 1024 * 1024
	// a slow source does not hold its bytes back until a chunk is full
	pipeFlushDelay = 50 * time.Millisecond
	// the host asks about a running download every 15 s
	pipeLease = time.Minute
)

const (
	pipeGone    = "gone"
	pipeWriting = "writing"
	// the source has bytes ready and the host has not pulled them
	pipeWaiting = "waiting"
)

var errPipeAbandoned = errors.New("the host stopped asking for the download")

type pipeFailure struct {
	Error string `msgpack:"error" json:"error"`
}

type pipe struct {
	source  PipeDownloadSource
	expire  *time.Timer
	running bool
	waiting atomic.Bool
	lease   time.Duration
	// when the host last pulled or asked, in unix nanoseconds
	heard     atomic.Int64
	abandoned atomic.Bool
}

type pipeServer struct {
	mu      sync.Mutex
	pipes   map[string]*pipe
	lease   time.Duration
	cleanup rpc.CleanupFunc
}

func newPipeServer(client *rpc.Client, pluginID string) (*pipeServer, error) {
	ps := &pipeServer{pipes: map[string]*pipe{}, lease: pipeLease}
	ns := getPluginNamespaces(pluginID)

	cleanup, err := client.RegisterHandler(ns.PluginPipeRPC, ps)
	if err != nil {
		return nil, err
	}
	ps.cleanup = cleanup
	return ps, nil
}

func (ps *pipeServer) PullPipe(ctx context.Context, pipeID string) (<-chan any, error) {
	p := ps.claim(pipeID)
	if p == nil {
		return nil, fmt.Errorf("download %s not found or expired", pipeID)
	}

	out := make(chan any)
	go func() {
		defer close(out)
		defer ps.drop(pipeID)

		w := &pipeWriter{ctx: ctx, out: out, pipe: p}
		err := p.source(ctx, w)
		// what a failed source left behind is not sent, a failure before the first chunk stays an error for the client
		if closeErr := w.close(err == nil); err == nil {
			err = closeErr
		}
		// the stream itself carries no error, a last value tells the host the bytes are not complete
		if err != nil && ctx.Err() == nil {
			_ = p.hand(ctx, out, pipeFailure{Error: err.Error()})
		}
	}()
	return out, nil
}

func (ps *pipeServer) PipeState(pipeID string) string {
	ps.mu.Lock()
	defer ps.mu.Unlock()
	p := ps.pipes[pipeID]
	if p == nil {
		return pipeGone
	}
	p.heard.Store(time.Now().UnixNano())
	if p.waiting.Load() {
		return pipeWaiting
	}
	return pipeWriting
}

func (ps *pipeServer) add(source PipeDownloadSource, ttl time.Duration) (string, error) {
	raw := make([]byte, 16)
	if _, err := rand.Read(raw); err != nil {
		return "", err
	}
	id := hex.EncodeToString(raw)

	ps.mu.Lock()
	defer ps.mu.Unlock()
	ps.pipes[id] = &pipe{source: source, lease: ps.lease, expire: time.AfterFunc(ttl, func() { ps.expire(id) })}
	return id, nil
}

func (ps *pipeServer) claim(id string) *pipe {
	ps.mu.Lock()
	defer ps.mu.Unlock()
	p := ps.pipes[id]
	if p == nil || p.running {
		return nil
	}
	p.running = true
	p.heard.Store(time.Now().UnixNano())
	p.expire.Stop()
	return p
}

func (ps *pipeServer) expire(id string) {
	ps.mu.Lock()
	defer ps.mu.Unlock()
	if p := ps.pipes[id]; p != nil && !p.running {
		delete(ps.pipes, id)
	}
}

func (ps *pipeServer) drop(id string) {
	ps.mu.Lock()
	defer ps.mu.Unlock()
	if p := ps.pipes[id]; p != nil {
		p.expire.Stop()
		delete(ps.pipes, id)
	}
}

func (ps *pipeServer) close() {
	if ps.cleanup != nil {
		_ = ps.cleanup()
		ps.cleanup = nil
	}
}

func (p *pipe) hand(ctx context.Context, out chan<- any, value any) error {
	p.waiting.Store(true)
	defer p.waiting.Store(false)
	for {
		// a cancel that got lost on the way would leave the source here for good
		left := p.lease - time.Since(time.Unix(0, p.heard.Load()))
		if left <= 0 || p.abandoned.Load() {
			// for good, what the source still holds is not offered again
			p.abandoned.Store(true)
			return errPipeAbandoned
		}
		lease := time.NewTimer(left)
		select {
		case out <- value:
			lease.Stop()
			p.heard.Store(time.Now().UnixNano())
			return nil
		case <-ctx.Done():
			lease.Stop()
			return ctx.Err()
		case <-lease.C:
		}
	}
}

type pipeWriter struct {
	ctx    context.Context
	out    chan<- any
	pipe   *pipe
	mu     sync.Mutex
	buf    []byte
	since  time.Time
	full   bool
	timer  *time.Timer
	closed bool
}

func (w *pipeWriter) Write(p []byte) (int, error) {
	w.mu.Lock()
	defer w.mu.Unlock()
	if w.closed {
		return 0, io.ErrClosedPipe
	}

	written := 0
	for len(p) > 0 {
		if len(w.buf) == 0 {
			// a source that fills its chunks gets the next one in one piece
			if w.full {
				w.buf = make([]byte, 0, pipeChunkSize)
			}
			w.arm()
		}
		n := min(len(p), pipeChunkSize-len(w.buf))
		w.buf = append(w.buf, p[:n]...)
		p = p[n:]
		written += n

		if len(w.buf) == pipeChunkSize {
			if err := w.send(); err != nil {
				return written, err
			}
		}
	}
	return written, nil
}

func (w *pipeWriter) arm() {
	w.since = time.Now()
	if w.timer == nil {
		w.timer = time.AfterFunc(pipeFlushDelay, w.flushLate)
		return
	}
	w.timer.Reset(pipeFlushDelay)
}

func (w *pipeWriter) flushLate() {
	w.mu.Lock()
	defer w.mu.Unlock()
	// a timer that waited for the lock finds the next chunk, which has a timer of its own
	if w.closed || len(w.buf) == 0 || time.Since(w.since) < pipeFlushDelay {
		return
	}
	_ = w.send()
}

func (w *pipeWriter) send() error {
	if err := w.pipe.hand(w.ctx, w.out, w.buf); err != nil {
		return err
	}
	w.full = len(w.buf) == pipeChunkSize
	w.buf = nil
	return nil
}

func (w *pipeWriter) close(flush bool) error {
	w.mu.Lock()
	defer w.mu.Unlock()
	w.closed = true
	if w.timer != nil {
		w.timer.Stop()
	}
	if !flush || len(w.buf) == 0 {
		return nil
	}
	return w.send()
}
