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
	cam := Camera{
		ID:   "cam-1",
		Name: "cam-1"}
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

func TestRefreshKeepsEventsThatOvertookIt(t *testing.T) {
	server := liveClient(t, "controller")
	client := liveClient(t, "plugin")

	cam := Camera{
		ID:   "cam-2",
		Name: "cam-2"}
	renamed := cam
	renamed.Name = "cam-2 renamed"
	ns := getCameraNamespaces("cam-2")

	var d *CameraDevice
	settled := func() bool {
		d.mu.RLock()
		defer d.mu.RUnlock()
		return d.cameraState.Value() && d.frameWorkerState.Value() && d.camera.Name == renamed.Name
	}
	if _, err := server.RegisterHandler(ns.CameraControllerRPC, map[string]any{
		"refreshStates": func() (map[string]any, error) {
			states := map[string]any{"camera": cam, "cameraState": false, "frameWorkerState": false, "stateSubject": true}
			// the changes happen right after the read and reach the plugin before the answer
			_ = server.Publish(ns.CameraStateSubject, map[string]any{"type": "updated", "data": renamed})
			_ = server.Publish(ns.CameraStateSubject, map[string]any{"type": "cameraState", "data": true})
			_ = server.Publish(ns.CameraStateSubject, map[string]any{"type": "frameWorkerState", "data": true})
			for deadline := time.Now().Add(2 * time.Second); !settled() && time.Now().Before(deadline); {
				time.Sleep(5 * time.Millisecond)
			}
			return states, nil
		},
	}); err != nil {
		t.Fatal(err)
	}

	d = &CameraDevice{
		client:           client,
		camera:           cam,
		logger:           newLogger(&loggerOptions{Prefix: "test"}),
		controllerProxy:  client.CreateProxy(ns.CameraControllerRPC),
		cameraSubject:    NewBehaviorSubject(cam),
		cameraState:      NewBehaviorSubject(false),
		frameWorkerState: NewBehaviorSubject(false),
		detectionEvent:   NewSubject[DetectionEventData](),
		sensorCleanups:   map[string]func(){},
		initialized:      true,
	}
	t.Cleanup(func() { d.dropEventSubjects("") })
	for _, subject := range []string{ns.CameraSubject, ns.CameraStateSubject} {
		if err := d.subscribeEvents(subject); err != nil {
			t.Fatal(err)
		}
	}

	d.refreshStates()
	if !d.cameraState.Value() {
		t.Error("the older answer put the camera back to disconnected")
	}
	if !d.frameWorkerState.Value() {
		t.Error("the older answer put the frame worker back to disconnected")
	}
	if got := d.cameraSubject.Value().Name; got != renamed.Name {
		t.Errorf("the older answer put the camera back to %q", got)
	}
}
