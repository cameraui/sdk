package sdk

import (
	"encoding/hex"
	"testing"

	rpc "github.com/cameraui/rpc/go"
)

func TestSetDeviceSendsOnlyChanges(t *testing.T) {
	hallway := DeviceInfo{ID: "dev-1", Name: "Hallway sensor", Manufacturer: "Acme"}
	sensor := NewContactSensor("Contact", WithNativeID("n-1"), WithDevice(&hallway), WithPrimary())

	membership := sensor.ToJSON().Membership
	if membership == nil || membership.Device == nil || *membership.Device != hallway || !membership.Primary {
		t.Fatalf("registration membership = %+v", membership)
	}

	var patches []sensorSourcePatch
	sensor.initSourceUpdateFn(func(patch sensorSourcePatch) { patches = append(patches, patch) })

	sensor.SetDeviceInfo(&hallway, true)
	if len(patches) != 0 {
		t.Fatalf("an unchanged device was sent: %+v", patches)
	}

	updated := hallway
	updated.Firmware = "2.1"
	sensor.SetDeviceInfo(&updated, true)
	sensor.SetDeviceInfo(nil, false)
	if len(patches) != 2 {
		t.Fatalf("patches = %+v", patches)
	}
	if patches[0].Membership.Device.Firmware != "2.1" {
		t.Errorf("first patch = %+v", patches[0].Membership.Device)
	}

	// leaving must reach the host as an explicit nil, omitempty would turn it into "no change"
	encoded, err := rpc.Encode(patches[1])
	if err != nil {
		t.Fatal(err)
	}
	var wire map[string]any
	if err := rpc.Decode(encoded, &wire); err != nil {
		t.Fatal(err)
	}
	left, ok := wire["membership"].(map[string]any)
	if !ok {
		t.Fatalf("leave patch on the wire = %v", wire)
	}
	if device, present := left["device"]; !present || device != nil {
		t.Errorf("leave patch carries device %v (present %v)", device, present)
	}
	if _, present := wire["address"]; present {
		t.Errorf("leave patch carries an address: %v", wire)
	}
}

func TestSensorWithoutDeviceRegistersWithoutMembership(t *testing.T) {
	sensor := NewContactSensor("Contact", WithPrimary())
	encoded, err := rpc.Encode(sensor.ToJSON())
	if err != nil {
		t.Fatal(err)
	}
	var wire map[string]any
	if err := rpc.Decode(encoded, &wire); err != nil {
		t.Fatal(err)
	}
	if _, present := wire["membership"]; present {
		t.Errorf("a sensor without a device sent a membership: %v", wire["membership"])
	}
}

func TestDeviceStateNamesTheSensor(t *testing.T) {
	sensor := NewTemperatureInfo("Hallway sensor Temperature")
	var events []*SensorDevice
	sensor.OnDeviceInfoChanged(func(device *SensorDevice) { events = append(events, device) })

	if sensor.GetShortName() != "Hallway sensor Temperature" || sensor.GetDeviceInfo() != nil || sensor.Primary() {
		t.Fatalf("before registration: short %q device %v primary %v", sensor.GetShortName(), sensor.GetDeviceInfo(), sensor.Primary())
	}

	state := &sensorDeviceState{
		Device:      &SensorDevice{ID: "d-1", Name: "Hallway sensor", Model: "UP-Sense"},
		DisplayName: "Hallway sensor Temperature",
		ShortName:   "Temperature",
	}
	sensor.applyDeviceState(state)
	sensor.applyDeviceState(state)
	if len(events) != 1 {
		t.Fatalf("events = %d, want 1 for one change", len(events))
	}
	if sensor.GetShortName() != "Temperature" || sensor.GetDisplayName() != "Hallway sensor Temperature" {
		t.Errorf("names = %q / %q", sensor.GetDisplayName(), sensor.GetShortName())
	}

	device := sensor.GetDeviceInfo()
	device.Name = "changed by the caller"
	if sensor.GetDeviceInfo().Name != "Hallway sensor" {
		t.Error("GetDeviceInfo hands out the sensor's own device")
	}

	sensor.applyDeviceState(&sensorDeviceState{Device: state.Device, DisplayName: "Front door", ShortName: "Temperature", Primary: true})
	if len(events) != 2 || !sensor.Primary() || sensor.GetDisplayName() != "Front door" {
		t.Errorf("after the rename: events %d, primary %v, name %q", len(events), sensor.Primary(), sensor.GetDisplayName())
	}
}

func TestRegistrationWithoutDeviceStateKeepsTheNames(t *testing.T) {
	sensor := NewContactSensor("Door")
	sensor.SetDisplayName("Front door")
	applyRegistration(sensor, &sensorRegistration{ID: "s-1", AssignedCameraIDs: []string{"cam-1"}})
	if sensor.GetDisplayName() != "Front door" || sensor.GetShortName() != "Front door" {
		t.Errorf("an older host's registration changed the names to %q / %q", sensor.GetDisplayName(), sensor.GetShortName())
	}
}

func TestDeviceEventReachesOwnedAndConsumedSensors(t *testing.T) {
	client := liveClient(t, "plugin")
	manager := newSensorManager(client, nil, &PluginInfo{ID: "p1"}, newLogger(&loggerOptions{Prefix: "test"}))

	owned := NewContactSensor("Contact")
	owned.setID("s-owned")
	manager.owned[owned.GetID()] = owned

	consumed := manager.addConsumed(&storedSensorData{
		ID:          "s-consumed",
		Type:        SensorTypeTemperature,
		Name:        "Temperature",
		DisplayName: "Hallway sensor Temperature",
		ShortName:   "Temperature",
		Device:      &SensorDevice{ID: "d-1", Name: "Hallway sensor"},
		PluginID:    "owner",
		Exposed:     true,
	})
	t.Cleanup(consumed.cleanupProxy)
	if consumed.GetShortName() != "Temperature" || consumed.GetDeviceInfo().Name != "Hallway sensor" {
		t.Fatalf("consumed proxy built without its device: %q %v", consumed.GetShortName(), consumed.GetDeviceInfo())
	}

	event := func(sensorID string, state map[string]any) sensorRegistryEventMessage {
		return sensorRegistryEventMessage{Type: "sensor:device:changed", Data: map[string]any{"sensorId": sensorID, "sensorType": "contact", "deviceState": state}}
	}
	manager.handleGlobalSensorEvent(event("s-owned", map[string]any{
		"device":      map[string]any{"id": "d-2", "name": "Front door"},
		"displayName": "Front door",
		"shortName":   "Contact",
		"primary":     true,
	}))
	if owned.GetDeviceInfo() == nil || owned.GetDeviceInfo().ID != "d-2" || !owned.Primary() || owned.GetDisplayName() != "Front door" {
		t.Errorf("owned sensor: device %v primary %v name %q", owned.GetDeviceInfo(), owned.Primary(), owned.GetDisplayName())
	}

	manager.handleGlobalSensorEvent(event("s-consumed", map[string]any{
		"displayName": "Temperature",
		"shortName":   "Temperature",
		"primary":     false,
	}))
	if consumed.GetDeviceInfo() != nil || consumed.GetDisplayName() != "Temperature" {
		t.Errorf("consumed proxy kept its device after leaving: %v %q", consumed.GetDeviceInfo(), consumed.GetDisplayName())
	}
	if stored := consumed.ToStoredData(); stored.Device != nil || stored.ShortName != "Temperature" {
		t.Errorf("stored data = %+v", stored)
	}
}

// bytes as msgpackr writes them on the host, JavaScript undefined is an ext there
const (
	hostDeviceEventHex = "de0002a474797065b573656e736f723a6465766963653a6368616e676564a464617461de0003a873656e736f724964a3732d31aa73656e736f7254797065a7636f6e74616374ab6465766963655374617465de0004a6646576696365d40000ab646973706c61794e616d65a4446f6f72a973686f72744e616d65a4446f6f72a77072696d617279c2"
	hostSensorDataHex  = "de000ca26964a3732d32a474797065ab74656d7065726174757265a46e616d65a154ab646973706c61794e616d65a648616c6c2054a973686f72744e616d65a154a6646576696365de0004a26964a3642d31a46e616d65a448616c6cac6d616e756661637475726572d40000a56d6f64656ca14da77072696d617279c2a8706c7567696e4964a170b161737369676e656443616d65726149647390a76578706f736564c3a9636f6e6e6563746564c2a761646472657373d40000"
)

func TestHostPayloadsWithUndefinedDecode(t *testing.T) {
	raw, err := hex.DecodeString(hostSensorDataHex)
	if err != nil {
		t.Fatal(err)
	}
	var data storedSensorData
	if !decodeMsgpack(newLogger(&loggerOptions{Prefix: "test"}), raw, &data, "storedSensorData") {
		t.Fatal("stored sensor data with undefined fields did not decode")
	}
	if data.Device == nil || data.Device.Name != "Hall" || data.Device.Manufacturer != "" || data.ShortName != "T" {
		t.Errorf("stored data = %+v, device %+v", data, data.Device)
	}

	raw, err = hex.DecodeString(hostDeviceEventHex)
	if err != nil {
		t.Fatal(err)
	}
	var msg sensorRegistryEventMessage
	if !decodeMsgpack(newLogger(&loggerOptions{Prefix: "test"}), raw, &msg, "sensorRegistryEventMessage") {
		t.Fatal("event did not decode")
	}
	manager := &SensorManager{logger: newLogger(&loggerOptions{Prefix: "test"}), owned: map[string]Sensor{}, external: map[string]Sensor{}, consumed: map[string]*sensorProxy{}}
	owned := NewContactSensor("Door")
	owned.setID("s-1")
	owned.applyDeviceState(&sensorDeviceState{Device: &SensorDevice{ID: "d-1", Name: "Hall"}, DisplayName: "Hall", ShortName: "Door", Primary: true})
	manager.owned["s-1"] = owned

	manager.handleGlobalSensorEvent(msg)
	if owned.GetDeviceInfo() != nil || owned.Primary() || owned.GetDisplayName() != "Door" {
		t.Errorf("after leaving: device %v primary %v name %q", owned.GetDeviceInfo(), owned.Primary(), owned.GetDisplayName())
	}
}
