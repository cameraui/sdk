package sdk

import (
	"context"
	"maps"
	"math"
	"sync"

	rpc "github.com/cameraui/rpc/go"
)

type sensorProxy struct {
	BaseSensor
	client     *rpc.Client
	logger     *Logger
	sensorType SensorType
	category   SensorCategory
	exposed    bool
	connected  bool
	proxy      *rpc.Proxy
	unsubEvent func()

	eventMu     sync.Mutex
	eventCounts map[string]uint64
}

func newSensorProxy(client *rpc.Client, logger *Logger, data *storedSensorData) *sensorProxy {
	category := categoryForSensorType(data.Type)
	s := &sensorProxy{
		BaseSensor: NewBaseSensor(data.Name),
		client:     client,
		logger:     logger,
		sensorType: data.Type,
		category:   category,
		exposed:    data.Exposed,
		connected:  data.Connected,

		eventCounts: map[string]uint64{},
	}
	s.id = data.ID
	s.nativeID = data.NativeID
	s.pluginID = data.PluginID
	s.assignedCameraIDs = append([]string(nil), data.AssignedCameraIDs...)
	s.assignmentLocked = data.BoundCameraID != ""
	if data.DisplayName != "" {
		s.displayName = data.DisplayName
	}
	s.shortName = data.ShortName
	s.device = data.Device
	s.primary = data.Primary
	if data.Capabilities != nil {
		s.capabilities = append([]string(nil), data.Capabilities...)
	}
	s.propertySpecs = data.PropertySpecs

	for k, v := range data.Properties {
		s.properties[k] = coercePropertyValue(data.Type, k, v)
	}

	ownerNS := getSensorProviderNamespaces(data.PluginID, data.ID)
	s.proxy = client.CreateProxy(ownerNS.SensorRPC)

	eventNS := getSensorEventNamespaces(data.ID)
	unsub, _ := client.Subscribe(eventNS.SensorSubject, func(payload []byte) {
		var msg sensorEventMessage
		if !decodeMsgpack(logger, payload, &msg, "sensorEventMessage") {
			return
		}

		s.handleSensorEvent(msg)
	})
	s.unsubEvent = unsub

	return s
}

func (s *sensorProxy) GetType() SensorType         { return s.sensorType }
func (s *sensorProxy) GetCategory() SensorCategory { return s.category }
func (s *sensorProxy) ToJSON() sensorJSON          { return s.toBaseJSON(s.sensorType, s.category) }

func (s *sensorProxy) Connected() bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.connected
}

func (s *sensorProxy) Exposed() bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.exposed
}

func (s *sensorProxy) eventMarks() map[string]uint64 {
	s.eventMu.Lock()
	defer s.eventMu.Unlock()
	return maps.Clone(s.eventCounts)
}

func (s *sensorProxy) applyRefreshedState(state sensorRefreshedState, marks map[string]uint64) {
	s.eventMu.Lock()
	defer s.eventMu.Unlock()
	// an event since the marks is newer than the state
	current := func(key string) bool { return s.eventCounts[key] == marks[key] }

	if state.DisplayName != "" && current("displayName") {
		s.SetDisplayName(state.DisplayName)
	}

	if state.DeviceState != nil && current("device") {
		s.applyDeviceState(state.DeviceState)
	}

	if state.PropertySpecs != nil && current("propertySpecs") {
		s.applyPropertySpecs(state.PropertySpecs)
	}

	s.mu.RLock()
	stale := !isEqual(s.capabilities, state.Capabilities, true)
	s.mu.RUnlock()
	if stale && current("capabilities") {
		s.SetCapabilities(state.Capabilities)
	}

	for property, value := range state.Properties {
		if current("property:" + property) {
			s.onBackendPropertyChanged(property, coercePropertyValue(s.sensorType, property, value))
		}
	}
}

func (s *sensorProxy) applyDeviceEvent(state *sensorDeviceState) {
	s.eventMu.Lock()
	defer s.eventMu.Unlock()
	s.eventCounts["device"]++
	s.eventCounts["displayName"]++
	s.applyDeviceState(state)
}

func (s *sensorProxy) applyPropertySpecsEvent(specs map[string]SensorPropertySpec) {
	s.eventMu.Lock()
	defer s.eventMu.Unlock()
	s.eventCounts["propertySpecs"]++
	s.applyPropertySpecs(specs)
}

func (s *sensorProxy) UpdateValue(property string, value any) error {
	// read-only types no-op on the owning side, so there is no category gate here
	if s.proxy == nil {
		return nil
	}
	value, err := checkPropertyWrite(s.GetPropertySpecs(), property, value)
	if err != nil {
		return err
	}
	ctx := context.Background()
	_, err = s.proxy.Invoke(ctx, "updateValue", property, value)
	return err
}

func (s *sensorProxy) ToStoredData() storedSensorData {
	s.mu.RLock()
	defer s.mu.RUnlock()
	props := make(map[string]any, len(s.properties))
	maps.Copy(props, s.properties)
	caps := make([]string, len(s.capabilities))
	copy(caps, s.capabilities)
	ids := make([]string, len(s.assignedCameraIDs))
	copy(ids, s.assignedCameraIDs)
	return storedSensorData{
		ID:                s.id,
		Type:              s.sensorType,
		Name:              s.name,
		DisplayName:       s.displayName,
		NativeID:          s.nativeID,
		PluginID:          s.pluginID,
		AssignedCameraIDs: ids,
		Exposed:           s.exposed,
		Connected:         s.connected,
		Properties:        props,
		Capabilities:      caps,
		ShortName:         s.shortName,
		Device:            s.device,
		Primary:           s.primary,
		PropertySpecs:     maps.Clone(s.propertySpecs),
	}
}

func (s *sensorProxy) setConnected(connected bool) {
	s.mu.Lock()
	if s.connected == connected {
		s.mu.Unlock()
		return
	}
	s.connected = connected
	s.mu.Unlock()
	s.connectedChanged.Next(connected)
}

func (s *sensorProxy) handleSensorEvent(msg sensorEventMessage) {
	s.eventMu.Lock()
	defer s.eventMu.Unlock()
	switch msg.Type {
	case "property:changed":
		property, _ := msg.Data["property"].(string)
		if property != "" {
			s.eventCounts["property:"+property]++
			value := coercePropertyValue(s.sensorType, property, msg.Data["value"])
			timestamp, _ := toInt64(msg.Data["timestamp"])
			s.setPropertyWithTimestamp(property, value, timestamp)
		}
	case "sensor:capabilities:changed":
		if rawCaps, ok := msg.Data["capabilities"]; ok && rawCaps != nil {
			caps := toStringSlice(rawCaps)
			if caps != nil {
				s.eventCounts["capabilities"]++
				s.SetCapabilities(caps)
			}
		}
	case "sensor:displayName:changed":
		if name, ok := msg.Data["displayName"].(string); ok && name != "" {
			s.eventCounts["displayName"]++
			s.SetDisplayName(name)
		}
	}
}

func (s *sensorProxy) cleanupProxy() {
	if s.unsubEvent != nil {
		s.unsubEvent()
		s.unsubEvent = nil
	}
	s.cleanup()
}

func toInt64(v any) (int64, bool) {
	switch n := v.(type) {
	case int:
		return int64(n), true
	case int8:
		return int64(n), true
	case int16:
		return int64(n), true
	case int32:
		return int64(n), true
	case int64:
		return n, true
	case uint:
		if uint64(n) > math.MaxInt64 {
			return 0, false
		}
		return int64(n), true
	case uint8:
		return int64(n), true
	case uint16:
		return int64(n), true
	case uint32:
		return int64(n), true
	case uint64:
		if n > math.MaxInt64 {
			return 0, false
		}
		return int64(n), true
	case float32:
		if math.IsNaN(float64(n)) || math.IsInf(float64(n), 0) {
			return 0, false
		}
		return int64(n), true
	case float64:
		if math.IsNaN(n) || math.IsInf(n, 0) {
			return 0, false
		}
		return int64(n), true
	default:
		return 0, false
	}
}

func toStringSlice(v any) []string {
	arr, ok := v.([]any)
	if !ok {
		return nil
	}
	result := make([]string, 0, len(arr))
	for _, item := range arr {
		if s, ok := item.(string); ok {
			result = append(result, s)
		}
	}
	return result
}

func categoryForSensorType(st SensorType) SensorCategory {
	switch st {
	case SensorTypeLight, SensorTypeSiren, SensorTypeSwitch, SensorTypePTZ, SensorTypeSecuritySystem:
		return SensorCategoryControl
	case SensorTypeDoorbell:
		return SensorCategoryTrigger
	case SensorTypeBattery:
		return SensorCategoryInfo
	default:
		return SensorCategorySensor
	}
}
