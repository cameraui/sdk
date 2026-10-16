package sdk

import (
	"sync/atomic"
	"testing"
	"time"
)

const resyncWindow = resyncDelay + resyncJitter + 100*time.Millisecond

func TestResyncSchedulerCoalescesTriggersInOneWindow(t *testing.T) {
	t.Parallel()
	var runs atomic.Int32
	r := newResyncScheduler(func() { runs.Add(1) })
	defer r.close()

	for range 5 {
		r.trigger()
	}
	time.Sleep(resyncWindow)

	if got := runs.Load(); got != 1 {
		t.Fatalf("runs = %d, want 1", got)
	}
}

func TestResyncSchedulerGivesInterestTimeToCross(t *testing.T) {
	t.Parallel()
	ran := make(chan time.Time, 1)
	r := newResyncScheduler(func() { ran <- time.Now() })
	defer r.close()

	start := time.Now()
	r.trigger()

	select {
	case at := <-ran:
		if elapsed := at.Sub(start); elapsed < resyncDelay {
			t.Fatalf("resync after %v, want at least %v", elapsed, resyncDelay)
		}
	case <-time.After(resyncWindow):
		t.Fatal("resync never ran")
	}
}

func TestResyncSchedulerRunsAgainForALaterTrigger(t *testing.T) {
	t.Parallel()
	var runs atomic.Int32
	r := newResyncScheduler(func() { runs.Add(1) })
	defer r.close()

	r.trigger()
	time.Sleep(resyncWindow)
	r.trigger()
	time.Sleep(resyncWindow)

	if got := runs.Load(); got != 2 {
		t.Fatalf("runs = %d, want 2", got)
	}
}

func TestResyncSchedulerCloseDropsThePendingRun(t *testing.T) {
	t.Parallel()
	var runs atomic.Int32
	r := newResyncScheduler(func() { runs.Add(1) })

	r.trigger()
	r.close()
	r.trigger()
	time.Sleep(resyncWindow)

	if got := runs.Load(); got != 0 {
		t.Fatalf("runs = %d, want 0", got)
	}
}

func TestOnResyncFollowsTheWorkerLink(t *testing.T) {
	const subject = "worker.a1b2c3.link"
	client := liveClient(t, "plugin")
	t.Setenv("CAMERAUI_WORKER_LINK_SUBJECT", subject)

	var runs atomic.Int32
	stop := onResync(client, newLogger(&loggerOptions{Prefix: "test"}), func() { runs.Add(1) })
	defer stop()

	for range 2 {
		if err := client.Publish(subject, map[string]any{"connected": true}); err != nil {
			t.Fatal(err)
		}
	}
	time.Sleep(resyncWindow)

	if got := runs.Load(); got != 1 {
		t.Fatalf("runs = %d, want 1", got)
	}
}

func TestSendUnsentDeliversALostWriteOnceWithTheCurrentValue(t *testing.T) {
	registry := liveClient(t, "registry")
	client := liveClient(t, "plugin")

	writes := make(chan map[string]any, 4)
	if _, err := registry.RegisterHandler(getSensorRegistryNamespaces().SensorsRPC, map[string]any{
		"updatePropertyValues": func(_ string, properties map[string]any) error {
			writes <- properties
			return nil
		},
	}); err != nil {
		t.Fatal(err)
	}

	manager := newSensorManager(client, nil, &PluginInfo{ID: "p1"}, newLogger(&loggerOptions{Prefix: "test"}))
	contact := NewContactSensor("Door")
	contact.setID("s1")
	if err := manager.trackCameraSensor(contact); err != nil {
		t.Fatal(err)
	}

	contact.SetDetected(false)
	manager.settleWrite("s1", map[string]any{"detected": true}, false)
	manager.sendUnsent()
	select {
	case properties := <-writes:
		if properties["detected"] != false {
			t.Fatalf("sent %v, want the current value false", properties)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("the lost write was never sent")
	}

	manager.sendUnsent()
	manager.settleWrite("s1", map[string]any{"detected": true}, false)
	manager.settleWrite("s1", map[string]any{"detected": false}, true)
	manager.sendUnsent()
	select {
	case properties := <-writes:
		t.Fatalf("sent %v again, want nothing", properties)
	case <-time.After(300 * time.Millisecond):
	}
}
