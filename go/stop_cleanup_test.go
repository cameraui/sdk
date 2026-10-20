package sdk

import (
	"errors"
	"slices"
	"strings"
	"sync"
	"testing"
	"time"
)

type drainCounter struct {
	mu      sync.Mutex
	running int
	peak    int
	events  []string
}

func (dc *drainCounter) record(event string) {
	dc.mu.Lock()
	dc.events = append(dc.events, event)
	dc.mu.Unlock()
}

func (dc *drainCounter) cleanup(name string) func() {
	return func() {
		dc.mu.Lock()
		dc.running++
		dc.peak = max(dc.peak, dc.running)
		dc.events = append(dc.events, "unregister "+name)
		dc.mu.Unlock()
		time.Sleep(30 * time.Millisecond)
		dc.mu.Lock()
		dc.running--
		dc.mu.Unlock()
	}
}

type orderedPersistence struct {
	dc    *drainCounter
	mu    sync.Mutex
	saves int
}

func (p *orderedPersistence) load(storeLocation) map[string]any {
	return nil
}

func (p *orderedPersistence) flush() error { return nil }

func (p *orderedPersistence) close() {}

func (p *orderedPersistence) save(storeLocation, map[string]any) func() error {
	p.dc.record("save start")
	return func() error {
		time.Sleep(5 * time.Millisecond)
		p.dc.record("save end")
		p.mu.Lock()
		defer p.mu.Unlock()
		p.saves++
		if p.saves == 2 {
			return errors.New("disk full")
		}
		return nil
	}
}

func testCameraDevice(dc *drainCounter, id string) *CameraDevice {
	return &CameraDevice{
		cameraSubject:    NewBehaviorSubject(Camera{}),
		cameraState:      NewBehaviorSubject(false),
		frameWorkerState: NewBehaviorSubject(false),
		detectionEvent:   NewSubject[DetectionEventData](),
		cleanupFns:       []func(){dc.cleanup(id + " impl"), dc.cleanup(id + " interfaces")},
		sensorCleanups:   map[string]func(){"a": dc.cleanup(id + " sensor a"), "b": dc.cleanup(id + " sensor b")},
	}
}

func TestSensorManagerCloseDrainsEverySensorAtOnce(t *testing.T) {
	dc := &drainCounter{}
	m := &SensorManager{
		owned:    map[string]Sensor{},
		cleanups: map[string]func(){"s1": dc.cleanup("s1"), "s2": dc.cleanup("s2"), "s3": dc.cleanup("s3")},
		external: map[string]Sensor{},
		consumed: map[string]*sensorProxy{},
	}

	m.close()

	if len(dc.events) != 3 || dc.peak != 3 {
		t.Fatalf("events %v, peak %d: every sensor registration must drain at the same time", dc.events, dc.peak)
	}
}

func TestDeviceManagerCloseDrainsEveryCameraAtOnce(t *testing.T) {
	dc := &drainCounter{}
	dm := &DeviceManager{devices: map[string]*CameraDevice{
		"cam-1": testCameraDevice(dc, "cam-1"),
		"cam-2": testCameraDevice(dc, "cam-2"),
	}}

	dm.close()

	// both cameras at once, each with its handlers first and then its sensors
	if len(dc.events) != 8 || dc.peak < 4 {
		t.Fatalf("events %v, peak %d", dc.events, dc.peak)
	}
	for _, device := range dm.devices {
		t.Fatalf("device %v left after close", device)
	}
}

func TestStorageControllerCloseSavesInOrderThenDrainsHandlersAtOnce(t *testing.T) {
	dc := &drainCounter{}
	persistence := &orderedPersistence{dc: dc}
	sc := &StorageController{storages: map[string]*DeviceStorage{}}
	for _, key := range []string{"plugin", "camera.cam-1", "camera.cam-2"} {
		storage := newDeviceStorage(persistence, storeLocation{kind: storeLocationPlugin}, testLogger())
		unregister := dc.cleanup(key)
		storage.closeHandler = func() error {
			unregister()
			return nil
		}
		sc.storages[key] = storage
	}

	sc.close()

	saves := []string{"save start", "save end", "save start", "save end", "save start", "save end"}
	if !slices.Equal(dc.events[:6], saves) {
		t.Fatalf("saves must run one after another: %v", dc.events)
	}
	// a storage whose save failed still lets go of its handler
	unregisters := dc.events[6:]
	if len(unregisters) != 3 || slices.ContainsFunc(unregisters, func(e string) bool { return !strings.HasPrefix(e, "unregister ") }) {
		t.Fatalf("every handler must be released after the saves: %v", dc.events)
	}
	if dc.peak != 3 {
		t.Fatalf("peak %d: the handler drains must overlap", dc.peak)
	}
}
