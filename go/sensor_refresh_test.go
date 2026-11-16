package sdk

import (
	"slices"
	"sync"
	"testing"
	"time"
)

func TestSensorResyncKeepsEventsThatOvertookIt(t *testing.T) {
	registry := liveClient(t, "registry")
	client := liveClient(t, "plugin")

	data := storedSensorData{
		ID:           "s-resync",
		Type:         SensorTypeContact,
		Name:         "Door",
		DisplayName:  "Door",
		PluginID:     "owner",
		Exposed:      true,
		Connected:    true,
		Properties:   map[string]any{"detected": false, "note": "old"},
		Capabilities: []string{"first"},
	}
	manager := newSensorManager(client, nil, &PluginInfo{ID: "p1"}, newLogger(&loggerOptions{Prefix: "test"}))
	proxy := manager.addConsumed(&data)
	t.Cleanup(proxy.cleanupProxy)

	subject := getSensorEventNamespaces(data.ID).SensorSubject
	settled := func() bool {
		return proxy.GetValue("detected") == true && proxy.GetDisplayName() == "Front door" && slices.Equal(proxy.GetCapabilities(), []string{"second"})
	}
	if _, err := registry.RegisterHandler(getSensorRegistryNamespaces().SensorsRPC, map[string]any{
		"getSensorState": func(_ string) (map[string]any, error) {
			state := map[string]any{
				"type":         data.Type,
				"properties":   map[string]any{"detected": false, "note": "read"},
				"capabilities": []string{"first"},
				"displayName":  "Door",
			}
			// the changes happen right after the read and reach the plugin before the answer
			_ = registry.Publish(subject, map[string]any{"type": "property:changed", "data": map[string]any{"property": "detected", "value": true, "timestamp": time.Now().UnixMilli()}})
			_ = registry.Publish(subject, map[string]any{"type": "sensor:capabilities:changed", "data": map[string]any{"sensorId": data.ID, "capabilities": []string{"second"}}})
			_ = registry.Publish(subject, map[string]any{"type": "sensor:displayName:changed", "data": map[string]any{"sensorId": data.ID, "displayName": "Front door"}})
			for deadline := time.Now().Add(2 * time.Second); !settled() && time.Now().Before(deadline); {
				time.Sleep(5 * time.Millisecond)
			}
			return state, nil
		},
	}); err != nil {
		t.Fatal(err)
	}

	manager.resyncConsumed(data.ID)
	if proxy.GetValue("detected") != true {
		t.Error("the older answer put the property back")
	}
	if got := proxy.GetCapabilities(); !slices.Equal(got, []string{"second"}) {
		t.Errorf("the older answer put the capabilities back to %v", got)
	}
	if got := proxy.GetDisplayName(); got != "Front door" {
		t.Errorf("the older answer put the display name back to %q", got)
	}
	if got := proxy.GetValue("note"); got != "read" {
		t.Errorf("a property without an event stayed at %v, want the read value", got)
	}
}

func TestSensorListReadKeepsEventsThatArrivedMeanwhile(t *testing.T) {
	registry := liveClient(t, "registry")
	client := liveClient(t, "plugin")
	ns := getSensorRegistryNamespaces()

	arrived := make(chan struct{})
	var once sync.Once
	unsubscribe, err := client.Subscribe(ns.SensorsSubject, func([]byte) { once.Do(func() { close(arrived) }) })
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(unsubscribe)

	if _, err := registry.RegisterHandler(ns.SensorsRPC, map[string]any{
		"getSensors": func(_ string) ([]map[string]any, error) {
			stored := func(id string, connected bool) map[string]any {
				return map[string]any{
					"id":                id,
					"type":              SensorTypeContact,
					"name":              "Door",
					"displayName":       "Door",
					"pluginId":          "owner",
					"assignedCameraIds": []string{},
					"exposed":           true,
					"connected":         connected,
				}
			}
			sensors := []map[string]any{stored("s-start", false), stored("s-gone", true)}
			// one owner registers and one sensor goes right after the list was read
			_ = registry.Publish(ns.SensorsSubject, map[string]any{"type": "sensor:connected:changed", "data": map[string]any{"sensorId": "s-start", "sensorType": SensorTypeContact, "connected": true}})
			_ = registry.Publish(ns.SensorsSubject, map[string]any{"type": "sensor:deleted", "data": map[string]any{"sensorId": "s-gone", "sensorType": SensorTypeContact}})
			select {
			case <-arrived:
			case <-time.After(2 * time.Second):
			}
			time.Sleep(50 * time.Millisecond)
			return sensors, nil
		},
		"getSensorState": func(_ string) (map[string]any, error) { return nil, nil },
	}); err != nil {
		t.Fatal(err)
	}

	info := &PluginInfo{ID: "p1", Contract: PluginContract{Consumes: []SensorType{SensorTypeContact}}}
	manager := newSensorManager(client, nil, info, newLogger(&loggerOptions{Prefix: "test"}))
	t.Cleanup(manager.close)
	if err := manager.init(); err != nil {
		t.Fatal(err)
	}

	held := func(id string) *sensorProxy {
		manager.mu.RLock()
		defer manager.mu.RUnlock()
		return manager.consumed[id]
	}
	proxy := held("s-start")
	if proxy == nil {
		t.Fatal("the sensor from the list is not held")
	}
	settled := func() bool { return proxy.Connected() && held("s-gone") == nil }
	for deadline := time.Now().Add(time.Second); !settled() && time.Now().Before(deadline); {
		time.Sleep(5 * time.Millisecond)
	}
	if !proxy.Connected() {
		t.Error("the sensor stayed disconnected although its owner registered while the list was read")
	}
	if held("s-gone") != nil {
		t.Error("the sensor that was deleted while the list was read is still held")
	}
}

type sensorConsumerStub struct {
	mu       sync.Mutex
	added    []string
	released []string
}

func (p *sensorConsumerStub) ConfigureCameras([]*CameraDevice) error { return nil }
func (p *sensorConsumerStub) OnCameraAdded(*CameraDevice) error      { return nil }
func (p *sensorConsumerStub) OnCameraReleased(string) error          { return nil }
func (p *sensorConsumerStub) ConfigureSensors([]Sensor) error        { return nil }

func (p *sensorConsumerStub) OnSensorAdded(sensor Sensor) error {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.added = append(p.added, sensor.GetID())
	return nil
}

func (p *sensorConsumerStub) OnSensorReleased(sensorID string) error {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.released = append(p.released, sensorID)
	return nil
}

func storedContact(id string, change func(sensor map[string]any)) map[string]any {
	sensor := map[string]any{
		"id":                id,
		"type":              SensorTypeContact,
		"name":              "Door",
		"displayName":       "Door",
		"pluginId":          "owner",
		"assignedCameraIds": []string{},
		"exposed":           true,
		"connected":         true,
		"properties":        map[string]any{"detected": false},
	}
	if change != nil {
		change(sensor)
	}
	return sensor
}

func TestSensorResyncTakesOverWhatTheRegistryHolds(t *testing.T) {
	registry := liveClient(t, "registry")
	client := liveClient(t, "plugin")
	ns := getSensorRegistryNamespaces()

	if _, err := registry.RegisterHandler(ns.SensorsRPC, map[string]any{
		"getSensors": func(_ string) ([]map[string]any, error) {
			return []map[string]any{
				storedContact("s-held", func(sensor map[string]any) {
					sensor["assignedCameraIds"] = []string{"cam-1"}
					sensor["properties"] = map[string]any{"detected": true}
				}),
				storedContact("s-hidden", func(sensor map[string]any) { sensor["exposed"] = false }),
				storedContact("s-new", nil),
				storedContact("s-own", func(sensor map[string]any) {
					sensor["pluginId"] = "p1"
					sensor["assignedCameraIds"] = []string{"cam-2"}
				}),
			}, nil
		},
		"getSensorState": func(_ string) (map[string]any, error) { return nil, nil },
	}); err != nil {
		t.Fatal(err)
	}

	info := &PluginInfo{ID: "p1", Contract: PluginContract{Consumes: []SensorType{SensorTypeContact}}}
	manager := newSensorManager(client, nil, info, newLogger(&loggerOptions{Prefix: "test"}))
	t.Cleanup(manager.close)
	plugin := &sensorConsumerStub{}
	manager.setPlugin(plugin)

	held := func(id string) *sensorProxy {
		manager.mu.RLock()
		defer manager.mu.RUnlock()
		return manager.consumed[id]
	}
	for _, id := range []string{"s-held", "s-hidden", "s-missing"} {
		data := storedSensorData{ID: id, Type: SensorTypeContact, Name: "Door", PluginID: "owner", Exposed: true, Properties: map[string]any{"detected": false}}
		manager.addConsumed(&data)
	}
	own := NewContactSensor("Door")
	own.setID("s-own")
	if err := manager.trackCameraSensor(own); err != nil {
		t.Fatal(err)
	}

	manager.resync()

	door := held("s-held")
	if !door.Connected() {
		t.Error("a held sensor stayed disconnected although the registry holds it as connected")
	}
	if got := door.GetAssignedCameraIDs(); !slices.Equal(got, []string{"cam-1"}) {
		t.Errorf("a held sensor is assigned to %v, want the cameras of the registry", got)
	}
	if door.GetValue("detected") != true {
		t.Error("a held sensor kept its old value")
	}
	if held("s-hidden") != nil {
		t.Error("a sensor the registry no longer exposes is still held")
	}
	if held("s-missing") == nil {
		t.Error("a sensor missing from the list was dropped, the list may be incomplete")
	}
	if held("s-new") == nil {
		t.Error("a sensor the plugin had missed is not held")
	}
	if got := own.GetAssignedCameraIDs(); !slices.Equal(got, []string{"cam-2"}) {
		t.Errorf("the plugin's own sensor is assigned to %v, want the cameras of the registry", got)
	}
	plugin.mu.Lock()
	defer plugin.mu.Unlock()
	if !slices.Equal(plugin.added, []string{"s-new"}) || !slices.Equal(plugin.released, []string{"s-hidden"}) {
		t.Errorf("the plugin heard added %v and released %v", plugin.added, plugin.released)
	}
}

func TestSensorReadsItsStateOnceItsEventsArrive(t *testing.T) {
	registry := liveClient(t, "registry")
	client := liveClient(t, "plugin")
	ns := getSensorRegistryNamespaces()

	if _, err := registry.RegisterHandler(ns.SensorsRPC, map[string]any{
		"getSensors": func(_ string) ([]map[string]any, error) {
			return []map[string]any{storedContact("s-gap", nil)}, nil
		},
		// the value changed after the list was read and before the plugin listened to the sensor
		"getSensorState": func(_ string) (map[string]any, error) {
			return map[string]any{"type": SensorTypeContact, "properties": map[string]any{"detected": true}}, nil
		},
	}); err != nil {
		t.Fatal(err)
	}

	info := &PluginInfo{ID: "p1", Contract: PluginContract{Consumes: []SensorType{SensorTypeContact}}}
	manager := newSensorManager(client, nil, info, newLogger(&loggerOptions{Prefix: "test"}))
	t.Cleanup(manager.close)
	if err := manager.init(); err != nil {
		t.Fatal(err)
	}

	manager.mu.RLock()
	proxy := manager.consumed["s-gap"]
	manager.mu.RUnlock()
	if proxy == nil {
		t.Fatal("the sensor from the list is not held")
	}
	if proxy.GetValue("detected") != true {
		t.Error("the sensor kept the value of the list, the change in between is lost")
	}
}
