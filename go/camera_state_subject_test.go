package sdk

import (
	"context"
	"os"
	"slices"
	"sync/atomic"
	"testing"
	"time"

	rpc "github.com/cameraui/rpc/go"
)

func liveClient(t *testing.T, name string) *rpc.Client {
	t.Helper()
	url := os.Getenv("NATSURL")
	if url == "" {
		t.Skip("NATSURL not set")
	}
	client := rpc.NewClient(rpc.ClientOptions{Servers: []string{url}, Name: name})
	if err := client.Connect(context.Background()); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = client.Disconnect() })
	return client
}

func TestCameraStateSubjectSwitch(t *testing.T) {
	server := liveClient(t, "controller")
	client := liveClient(t, "plugin")

	var announced atomic.Bool
	var refreshes atomic.Int32
	cam := Camera{}
	cam.ID = "cam-1"
	cam.Name = "cam-1"
	if _, err := server.RegisterHandler("camera.cam-1.controller.rpc", map[string]any{
		"refreshStates": func() (map[string]any, error) {
			refreshes.Add(1)
			states := map[string]any{"camera": cam, "cameraState": true, "frameWorkerState": false}
			if announced.Load() {
				states["stateSubject"] = true
			}
			return states, nil
		},
	}); err != nil {
		t.Fatal(err)
	}

	d := &CameraDevice{
		client:           client,
		camera:           cam,
		logger:           newLogger(&loggerOptions{Prefix: "test"}),
		controllerProxy:  client.CreateProxy("camera.cam-1.controller.rpc"),
		cameraSubject:    NewBehaviorSubject(cam),
		cameraState:      NewBehaviorSubject(false),
		frameWorkerState: NewBehaviorSubject(false),
		detectionEvent:   NewSubject[DetectionEventData](),
		sensorCleanups:   map[string]func(){},
		initialized:      true,
	}
	ns := getCameraNamespaces("cam-1")
	held := func() []string {
		d.mu.RLock()
		defer d.mu.RUnlock()
		keys := make([]string, 0, len(d.eventSubs))
		for k := range d.eventSubs {
			keys = append(keys, k)
		}
		slices.Sort(keys)
		return keys
	}

	for _, subject := range []string{ns.CameraSubject, ns.CameraStateSubject} {
		if err := d.subscribeEvents(subject); err != nil {
			t.Fatal(err)
		}
	}
	d.refreshStates()
	if got := held(); !slices.Equal(got, []string{ns.CameraSubject}) || refreshes.Load() != 1 {
		t.Fatalf("old controller: held %v after %d refreshes", got, refreshes.Load())
	}

	announced.Store(true)
	d.refreshStates()
	if got := held(); !slices.Equal(got, []string{ns.CameraStateSubject}) || refreshes.Load() != 3 {
		t.Fatalf("new controller: held %v after %d refreshes", got, refreshes.Load())
	}

	_ = server.Publish(ns.CameraSubject, map[string]any{"type": "cameraState", "data": false})
	_ = server.Publish(ns.CameraStateSubject, map[string]any{"type": "frameWorkerState", "data": true})
	time.Sleep(300 * time.Millisecond)
	if !d.cameraState.Value() {
		t.Fatal("event on the dropped camera subject still arrived")
	}
	if !d.frameWorkerState.Value() {
		t.Fatal("event on the state subject did not arrive")
	}

	d.dropEventSubjects("")
	if got := held(); len(got) != 0 {
		t.Fatalf("held %v after cleanup", got)
	}
}
