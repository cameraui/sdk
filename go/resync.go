package sdk

import (
	"math/rand/v2"
	"os"
	"sync"
	"time"

	rpc "github.com/cameraui/rpc/go"
)

const (
	resyncDelay  = 150 * time.Millisecond // interest needs a moment to cross a fresh link
	resyncJitter = 500 * time.Millisecond // spreads the plugins of one host
)

type resyncScheduler struct {
	mu     sync.Mutex
	fn     func()
	timer  *time.Timer
	closed bool
}

func newResyncScheduler(fn func()) *resyncScheduler {
	return &resyncScheduler{fn: fn}
}

func (r *resyncScheduler) trigger() {
	r.mu.Lock()
	defer r.mu.Unlock()
	if r.closed || r.timer != nil {
		return
	}
	r.timer = time.AfterFunc(resyncDelay+rand.N(resyncJitter), r.fire)
}

func (r *resyncScheduler) close() {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.closed = true
	if r.timer != nil {
		r.timer.Stop()
		r.timer = nil
	}
}

func (r *resyncScheduler) fire() {
	r.mu.Lock()
	r.timer = nil
	closed := r.closed
	r.mu.Unlock()
	if !closed {
		r.fn()
	}
}

func onResync(client *rpc.Client, logger *Logger, fn func()) func() {
	scheduler := newResyncScheduler(fn)
	unsubReconnect := client.OnReconnect(scheduler.trigger)

	var unsubLink func()
	// on a worker the master link can drop while the plugin's own connection stays up
	if subject := os.Getenv("CAMERAUI_WORKER_LINK_SUBJECT"); subject != "" {
		unsub, err := client.Subscribe(subject, func([]byte) { scheduler.trigger() })
		if err != nil {
			logger.Warn("subscribe worker link events:", err)
		}
		unsubLink = unsub
	}

	return func() {
		unsubReconnect()
		if unsubLink != nil {
			unsubLink()
		}
		scheduler.close()
	}
}
