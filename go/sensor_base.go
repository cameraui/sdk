package sdk

import (
	"crypto/rand"
	"fmt"
	"maps"
	"reflect"
	"slices"
	"sync"
	"time"
)

// SensorType identifies the kind of sensor. "Sensor" is camera.ui's umbrella
// term for the smallest smart-home unit. It covers measuring devices and controllable ones alike.
type SensorType string

const (
	SensorTypeMotion         SensorType = "motion"         // Video-based motion detection
	SensorTypeObject         SensorType = "object"         // Object detection (person, vehicle, animal, etc.)
	SensorTypeAudio          SensorType = "audio"          // Audio event detection (glass break, scream, etc.)
	SensorTypeFace           SensorType = "face"           // Face detection and recognition
	SensorTypeFaceEmbedder   SensorType = "faceEmbedder"   // Face embedding generation from a face crop, for recognition against enrolled faces
	SensorTypePersonEmbedder SensorType = "personEmbedder" // Appearance embedding of a person crop, to find the same person again without a face
	SensorTypeSegmenter      SensorType = "segmenter"      // Outline of an object inside a crop, as a mask over its box
	SensorTypeLicensePlate   SensorType = "licensePlate"   // License plate detection and OCR
	SensorTypeClassifier     SensorType = "classifier"     // General-purpose image classifier
	SensorTypeClip           SensorType = "clip"           // CLIP embedding generation for semantic search
	SensorTypeObjectAssist   SensorType = "objectAssist"   // Locates objects in a frame so secondary detectors get real crops from camera-side detections
	SensorTypeContact        SensorType = "contact"        // Contact/open-close sensor (door, window)
	SensorTypeLight          SensorType = "light"          // Light on/off and brightness control
	SensorTypeSiren          SensorType = "siren"          // Siren on/off and volume control
	SensorTypeSwitch         SensorType = "switch"         // Generic on/off switch
	SensorTypeLock           SensorType = "lock"           // Lock/unlock control
	SensorTypePTZ            SensorType = "ptz"            // Pan-tilt-zoom camera control
	SensorTypeSecuritySystem SensorType = "securitySystem" // Security system arm/disarm control
	SensorTypeDoorbell       SensorType = "doorbell"       // Doorbell ring trigger
	SensorTypeButton         SensorType = "button"         // Button with single, double and long presses
	SensorTypeAccess         SensorType = "access"         // Access reader, such as a fingerprint or NFC reader
	SensorTypeTemperature    SensorType = "temperature"    // Temperature sensor (°C)
	SensorTypeHumidity       SensorType = "humidity"       // Humidity sensor (0-100%)
	SensorTypeOccupancy      SensorType = "occupancy"      // Occupancy/presence sensor
	SensorTypeSmoke          SensorType = "smoke"          // Smoke detector
	SensorTypeLeak           SensorType = "leak"           // Water leak detector
	SensorTypeGas            SensorType = "gas"            // Gas detector
	SensorTypeCarbonMonoxide SensorType = "carbonMonoxide" // Carbon monoxide detector
	SensorTypeHeat           SensorType = "heat"           // Heat alarm
	SensorTypeCold           SensorType = "cold"           // Cold alarm
	SensorTypeVibration      SensorType = "vibration"      // Vibration sensor
	SensorTypeTamper         SensorType = "tamper"         // Tamper sensor
	SensorTypeProblem        SensorType = "problem"        // Generic problem/fault sensor
	SensorTypePower          SensorType = "power"          // Power detection sensor
	SensorTypeIlluminance    SensorType = "illuminance"    // Illuminance sensor (lx)
	SensorTypeCarbonDioxide  SensorType = "carbonDioxide"  // Carbon dioxide sensor (ppm)
	SensorTypeGlassBreak     SensorType = "glassBreak"     // Glass break detector
	SensorTypeAirQuality     SensorType = "airQuality"     // Air quality level with particle and gas readings
	SensorTypeGarage         SensorType = "garage"         // Garage door opener
	SensorTypeChime          SensorType = "chime"          // Chime that plays tones
	SensorTypeDisplay        SensorType = "display"        // Text display on a device
	SensorTypeBattery        SensorType = "battery"        // Battery level and charging state
)

// SensorSourceState is the plugin's view of the source behind an adopted
// sensor. Unavailable means wait (source unreachable, entity temporarily
// unavailable), Removed means the source reported the entity gone while it
// was reachable. Neither deletes the sensor: an adopted sensor is deleted by
// the user only.
type SensorSourceState string

const (
	SensorSourceStateConnected   SensorSourceState = "connected"
	SensorSourceStateUnavailable SensorSourceState = "unavailable"
	SensorSourceStateRemoved     SensorSourceState = "removed"
)

// SensorCategory categorizes a sensor's role in the system. It determines how
// the backend treats the sensor, read-only or controllable.
type SensorCategory string

const (
	SensorCategorySensor  SensorCategory = "sensor"  // Read-only detection sensor (motion, object, audio, etc.)
	SensorCategoryControl SensorCategory = "control" // Controllable sensor with set methods (light, siren, PTZ, etc.)
	SensorCategoryTrigger SensorCategory = "trigger" // Event trigger (doorbell ring)
	SensorCategoryInfo    SensorCategory = "info"    // Informational read-only state (battery level)
)

// Sensor is the interface all sensors must implement.
//
// State-modifying methods (SetOn, ReportDetections, etc.) live on the concrete
// sensor types, not on Sensor. Code that holds a Sensor reference can read state
// and observe changes, plus invoke UpdateValue for cross-process generic property writes.
type Sensor interface {
	// GetID returns the entity id of the sensor, provisional on a new sensor until registration.
	GetID() string
	// GetType returns the type of the sensor, fixed per sensor class.
	GetType() SensorType
	// GetName returns the name the plugin gave the sensor.
	GetName() string
	// GetDisplayName returns the full name shown to the user: inside a device the device name plus
	// the short name, otherwise the plugin's name until the user renames the sensor.
	GetDisplayName() string
	// GetShortName returns the name inside its device, the same as GetDisplayName for a sensor without a device.
	GetShortName() string
	// GetDeviceInfo returns the device the sensor belongs to, nil without one and for a camera's own sensor.
	GetDeviceInfo() *SensorDevice
	// Primary reports whether the sensor is the main sensor of its device, called like the device when it stands alone.
	Primary() bool
	// GetNativeID returns the durable identity the plugin supplied, e.g. an upstream device id.
	GetNativeID() string
	// GetPluginID returns the id of the plugin that owns the sensor, set at registration.
	GetPluginID() string
	// GetAssignedCameraIDs returns the ids of the cameras the user assigned the sensor to.
	GetAssignedCameraIDs() []string
	// Connected reports whether the sensor is registered and its plugin is connected.
	Connected() bool
	// GetCapabilities returns the capabilities the sensor advertises.
	GetCapabilities() []string
	// AssignmentLocked reports whether the sensor is bound to the camera it was added to, so the user cannot assign it elsewhere.
	AssignmentLocked() bool
	// HasCapability reports whether the sensor advertises a capability.
	HasCapability(cap string) bool
	// GetValue returns the current value of a sensor property.
	GetValue(property string) any
	// GetValues returns a snapshot copy of all property values.
	GetValues() map[string]any
	// UpdateValue is the generic property write coming from a consumer. Concrete
	// sensor types dispatch known properties to semantic methods (SetOn,
	// SetTargetState) so plugin-side hardware overrides run. Read-only sensors
	// implement it as a no-op. Plugin authors call the semantic methods instead.
	UpdateValue(property string, value any) error
	// OnPropertyChanged fires on every property change.
	OnPropertyChanged(callback func(SensorPropertyChange)) *Disposable
	// OnCapabilitiesChanged fires with the full capability list whenever it changes.
	OnCapabilitiesChanged(callback func([]string)) *Disposable
	// OnAssignmentChanged fires with the current camera id list whenever the
	// user changes this sensor's camera assignments.
	OnAssignmentChanged(callback func([]string)) *Disposable
	// OnConnectedChanged fires when the owning plugin's connectivity changes.
	OnConnectedChanged(callback func(bool)) *Disposable
	// OnDeviceInfoChanged fires with the device whenever the sensor joins or leaves
	// one, or its device, names or main-sensor role change.
	OnDeviceInfoChanged(callback func(*SensorDevice)) *Disposable
	// GetPropertySpecs returns the specs of the properties the plugin narrowed or described,
	// resolved against the type's. A property without an entry follows its type's spec.
	GetPropertySpecs() map[string]SensorPropertySpec
	// OnPropertySpecsChanged fires with the property specs whenever the plugin changes them.
	OnPropertySpecsChanged(callback func(map[string]SensorPropertySpec)) *Disposable
}

// SensorOption configures a sensor at construction time.
type SensorOption func(*sensorOptions)

type sensorJSON struct {
	ID             string                          `msgpack:"id" json:"id"`
	Type           SensorType                      `msgpack:"type" json:"type"`
	Name           string                          `msgpack:"name" json:"name"`
	DisplayName    string                          `msgpack:"displayName" json:"displayName"`
	Category       SensorCategory                  `msgpack:"category" json:"category"`
	NativeID       string                          `msgpack:"nativeId,omitempty" json:"nativeId,omitempty"`
	Origin         string                          `msgpack:"origin,omitempty" json:"origin,omitempty"`
	PluginID       string                          `msgpack:"pluginId,omitempty" json:"pluginId,omitempty"`
	Properties     map[string]any                  `msgpack:"properties" json:"properties"`
	Capabilities   []string                        `msgpack:"capabilities" json:"capabilities"`
	RequiresFrames bool                            `msgpack:"requiresFrames" json:"requiresFrames"`
	ModelSpec      any                             `msgpack:"modelSpec,omitempty" json:"modelSpec,omitempty"`
	SourceState    SensorSourceState               `msgpack:"sourceState,omitempty" json:"sourceState,omitempty"`
	Address        string                          `msgpack:"address,omitempty" json:"address,omitempty"`
	Membership     *sensorMembership               `msgpack:"membership,omitempty" json:"membership,omitempty"` // nil when the plugin never set a device, the host keeps the one it has
	PropertySpecs  map[string]PropertySpecOverride `msgpack:"propertySpecs" json:"propertySpecs"`
}

type sensorSourcePatch struct {
	SourceState SensorSourceState `msgpack:"sourceState,omitempty" json:"sourceState,omitempty"`
	Address     string            `msgpack:"address,omitempty" json:"address,omitempty"`
	Membership  *sensorMembership `msgpack:"membership,omitempty" json:"membership,omitempty"`
	// nil keeps the host's map, an empty one clears it
	PropertySpecs map[string]PropertySpecOverride `msgpack:"propertySpecs" json:"propertySpecs"`
}

type propertyUpdateFn func(properties map[string]any)

type sourceUpdateFn func(patch sensorSourcePatch)

type sensorLifecycle interface {
	OnStart()
	OnStop()
}

type sensorOptions struct {
	nativeID string
	origin   string
	address  string
	device   *DeviceInfo
	primary  bool
	specs    map[string]PropertySpecOverride
}

// BaseSensor is the base struct for all sensors. Embed this in concrete sensor types.
//
// Sensors are standalone entities: the plugin supplies the durable identity
// (WithNativeID), everything else belongs to the user: camera assignments,
// display name and whether the sensor is exported or not. A plugin
// never decides where its sensor is used and never handles the export itself.
type BaseSensor struct {
	mu                   sync.RWMutex
	id                   string
	name                 string
	displayName          string
	nativeID             string
	origin               string
	address              string
	sourceState          SensorSourceState
	membership           *sensorMembership
	device               *SensorDevice
	shortName            string
	primary              bool
	specOverrides        map[string]PropertySpecOverride
	propertySpecs        map[string]SensorPropertySpec
	pluginID             string
	assignedCameraIDs    []string
	capabilities         []string
	properties           map[string]any
	storage              *DeviceStorage
	outer                Sensor
	updateFn             propertyUpdateFn
	capabilitiesUpdateFn func([]string)
	sourceUpdateFn       sourceUpdateFn
	propertyChanged      *Subject[SensorPropertyChange]
	capabilitiesChanged  *Subject[[]string]
	assignmentChanged    *Subject[[]string]
	connectedChanged     *Subject[bool]
	deviceInfoChanged    *Subject[*SensorDevice]
	propertySpecsChanged *Subject[map[string]SensorPropertySpec]
	registered           bool
	active               bool
	assignmentLocked     bool
	requiresFrames       bool
}

// NewBaseSensor creates the embedded base for a concrete sensor type. The id it
// assigns is provisional until the host registers the sensor, and Storage stays
// nil until then.
//
// Example:
//
//	type MySensor struct{ sdk.BaseSensor }
//
//	s := &MySensor{BaseSensor: sdk.NewBaseSensor("Front Door", sdk.WithNativeID("dev-1"))}
func NewBaseSensor(name string, opts ...SensorOption) BaseSensor {
	var cfg sensorOptions
	for _, opt := range opts {
		opt(&cfg)
	}
	var membership *sensorMembership
	if cfg.device != nil {
		device := *cfg.device
		membership = &sensorMembership{Device: &device, Primary: cfg.primary}
	}
	return BaseSensor{
		// provisional id, replaced by the host's persistent id at registration
		id:                   generateSensorID(),
		name:                 name,
		displayName:          name,
		nativeID:             cfg.nativeID,
		origin:               cfg.origin,
		address:              cfg.address,
		membership:           membership,
		specOverrides:        maps.Clone(cfg.specs),
		properties:           make(map[string]any),
		capabilities:         make([]string, 0),
		propertyChanged:      NewSubject[SensorPropertyChange](),
		capabilitiesChanged:  NewSubject[[]string](),
		assignmentChanged:    NewSubject[[]string](),
		connectedChanged:     NewSubject[bool](),
		deviceInfoChanged:    NewSubject[*SensorDevice](),
		propertySpecsChanged: NewSubject[map[string]SensorPropertySpec](),
	}
}

// GetID returns the entity id of the sensor, provisional on a new sensor until registration.
func (s *BaseSensor) GetID() string {
	return s.id
}

// GetName returns the name the plugin gave the sensor.
func (s *BaseSensor) GetName() string {
	return s.name
}

// GetDisplayName returns the full name shown to the user: inside a device the device name plus
// the short name, otherwise the plugin's name until the user renames the sensor.
func (s *BaseSensor) GetDisplayName() string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.displayName
}

// GetShortName returns the name inside its device, the same as GetDisplayName for a sensor without a device.
func (s *BaseSensor) GetShortName() string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if s.shortName != "" {
		return s.shortName
	}
	return s.displayName
}

// GetDeviceInfo returns the device the sensor belongs to, nil without one and for a camera's own sensor.
func (s *BaseSensor) GetDeviceInfo() *SensorDevice {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if s.device == nil {
		return nil
	}
	device := *s.device
	return &device
}

// Primary reports whether the sensor is the main sensor of its device, called like the device when it stands alone.
func (s *BaseSensor) Primary() bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.primary
}

// SetDeviceInfo puts the sensor into a device, or takes it out with nil. Sensors
// of this plugin that report the same DeviceInfo.ID form one device. Pass the
// device with WithDevice when it is known at construction, call this for what
// changes later: a new firmware, a rename at the source. Only a change reaches
// the host. Ignored for a sensor added with CameraDevice.AddSensor, its camera
// is its device. primary marks the device's main sensor.
//
// Example:
//
//	sensor.SetDeviceInfo(&sdk.DeviceInfo{ID: hub.Serial, Name: hub.Name, Manufacturer: "Acme", Firmware: hub.Version}, true)
func (s *BaseSensor) SetDeviceInfo(device *DeviceInfo, primary bool) {
	membership := &sensorMembership{Primary: primary}
	if device != nil {
		info := *device
		membership.Device = &info
	}
	s.mu.Lock()
	if sameMembership(s.membership, membership) {
		s.mu.Unlock()
		return
	}
	s.membership = membership
	updateFn := s.sourceUpdateFn
	s.mu.Unlock()
	if updateFn != nil {
		updateFn(sensorSourcePatch{Membership: membership})
	}
}

// SetPropertySpec narrows or describes one property for this device: a range
// and step, the enum values it supports, the choices it offers with their
// names, a text limit. The host rejects a command outside it before it reaches
// the plugin. Pass it with WithPropertySpec when it is known at construction,
// call this for what changes later. Only a change reaches the host. A nil spec
// follows the type's spec again.
//
// Example:
//
//	alarm.SetPropertySpec(sdk.SecuritySystemPropertyTargetState, &sdk.PropertySpecOverride{
//		Values: []any{sdk.SecuritySystemStateAwayArm, sdk.SecuritySystemStateStayArm, sdk.SecuritySystemStateDisarmed},
//	})
func (s *BaseSensor) SetPropertySpec(property string, spec *PropertySpecOverride) {
	s.mu.Lock()
	overrides := maps.Clone(s.specOverrides)
	if overrides == nil {
		overrides = map[string]PropertySpecOverride{}
	}
	delete(overrides, property)
	if spec != nil {
		overrides[property] = *spec
	}
	if reflect.DeepEqual(s.specOverrides, overrides) || (len(s.specOverrides) == 0 && len(overrides) == 0) {
		s.mu.Unlock()
		return
	}
	s.specOverrides = overrides
	updateFn := s.sourceUpdateFn
	s.mu.Unlock()
	if updateFn != nil {
		updateFn(sensorSourcePatch{PropertySpecs: maps.Clone(overrides)})
	}
}

// GetPropertySpecs returns the specs of the properties the plugin narrowed or described,
// resolved against the type's. A property without an entry follows its type's spec.
func (s *BaseSensor) GetPropertySpecs() map[string]SensorPropertySpec {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return maps.Clone(s.propertySpecs)
}

// OnPropertySpecsChanged fires with the property specs whenever the plugin changes them.
func (s *BaseSensor) OnPropertySpecsChanged(callback func(map[string]SensorPropertySpec)) *Disposable {
	return s.propertySpecsChanged.Subscribe(callback)
}

// SetDisplayName sets the display name (the only mutable identifier on a
// sensor). name is the human-readable label shown in the UI.
//
// Example:
//
//	sensor.SetDisplayName("Front Door Motion")
func (s *BaseSensor) SetDisplayName(name string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.displayName = name
}

// GetNativeID returns the durable identity the plugin supplied, e.g. an upstream device id.
func (s *BaseSensor) GetNativeID() string {
	return s.nativeID
}

// GetOrigin returns the source system the sensor was imported from, e.g. "homeassistant".
func (s *BaseSensor) GetOrigin() string {
	return s.origin
}

// GetPluginID returns the id of the plugin that owns the sensor, set at registration.
func (s *BaseSensor) GetPluginID() string {
	return s.pluginID
}

// GetSourceState returns the state of the source behind an adopted sensor, as reported with SetSourceState.
func (s *BaseSensor) GetSourceState() SensorSourceState {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.sourceState
}

// SetSourceState reports what the source behind this sensor looks like right
// now. The host shows the state with its reason on the sensors page and never
// deletes on it. Only meaningful for adopted sensors.
//
// Example:
//
//	sensor.SetSourceState(sdk.SensorSourceStateRemoved)
func (s *BaseSensor) SetSourceState(state SensorSourceState) {
	s.mu.Lock()
	if s.sourceState == state {
		s.mu.Unlock()
		return
	}
	s.sourceState = state
	updateFn := s.sourceUpdateFn
	s.mu.Unlock()

	if updateFn != nil {
		updateFn(sensorSourcePatch{SourceState: state})
	}
}

// GetAddress returns the current address at the source, e.g. a Home Assistant entity id. Display only.
func (s *BaseSensor) GetAddress() string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.address
}

// SetAddress reports the sensor's current address at the source, e.g. after a
// Home Assistant entity was renamed. The identity (nativeId) stays.
//
// Example:
//
//	sensor.SetAddress(entry.EntityID)
func (s *BaseSensor) SetAddress(address string) {
	s.mu.Lock()
	if s.address == address {
		s.mu.Unlock()
		return
	}
	s.address = address
	updateFn := s.sourceUpdateFn
	s.mu.Unlock()

	if updateFn != nil {
		updateFn(sensorSourcePatch{Address: address})
	}
}

// GetAssignedCameraIDs returns the ids of the cameras the user assigned the sensor to.
func (s *BaseSensor) GetAssignedCameraIDs() []string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	ids := make([]string, len(s.assignedCameraIDs))
	copy(ids, s.assignedCameraIDs)
	return ids
}

// AssignmentLocked reports whether the sensor is bound to the camera it was added to, so the user cannot assign it elsewhere.
func (s *BaseSensor) AssignmentLocked() bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.assignmentLocked
}

// Connected reports whether the sensor is registered and its plugin is connected.
func (s *BaseSensor) Connected() bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.registered
}

// OnConnectedChanged fires when the sensor's registration state changes.
func (s *BaseSensor) OnConnectedChanged(callback func(bool)) *Disposable {
	return s.connectedChanged.Subscribe(callback)
}

// OnDeviceInfoChanged fires with the device whenever the sensor joins or leaves
// one, or its device, names or main-sensor role change.
func (s *BaseSensor) OnDeviceInfoChanged(callback func(*SensorDevice)) *Disposable {
	return s.deviceInfoChanged.Subscribe(callback)
}

// GetCapabilities returns the capabilities the sensor advertises.
func (s *BaseSensor) GetCapabilities() []string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	caps := make([]string, len(s.capabilities))
	copy(caps, s.capabilities)
	return caps
}

// SetCapabilities replaces the advertised feature flags and notifies the
// backend plus local listeners.
//
// Example:
//
//	sensor.SetCapabilities([]string{sdk.LightCapabilityBrightness})
func (s *BaseSensor) SetCapabilities(caps []string) {
	s.mu.Lock()
	s.capabilities = caps
	capsCopy := make([]string, len(caps))
	copy(capsCopy, caps)
	updateFn := s.capabilitiesUpdateFn
	s.mu.Unlock()

	if updateFn != nil {
		updateFn(capsCopy)
	}
	s.capabilitiesChanged.Next(capsCopy)
}

// OnCapabilitiesChanged returns a Disposable that fires when capabilities change.
func (s *BaseSensor) OnCapabilitiesChanged(callback func([]string)) *Disposable {
	return s.capabilitiesChanged.Subscribe(callback)
}

// HasCapability reports whether the sensor advertises the given capability.
//
// Example:
//
//	dimmable := sensor.HasCapability(sdk.LightCapabilityBrightness)
func (s *BaseSensor) HasCapability(cap string) bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return slices.Contains(s.capabilities, cap)
}

// GetValue returns the current value of a sensor property.
func (s *BaseSensor) GetValue(property string) any {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.properties[property]
}

// GetValues returns a snapshot copy of all property values.
func (s *BaseSensor) GetValues() map[string]any {
	s.mu.RLock()
	defer s.mu.RUnlock()
	result := make(map[string]any, len(s.properties))
	maps.Copy(result, s.properties)
	return result
}

// Storage returns the per-sensor storage, nil before registration.
func (s *BaseSensor) Storage() *DeviceStorage {
	return s.storage
}

// OnPropertyChanged subscribes to property changes. Returns a Disposable to unsubscribe.
func (s *BaseSensor) OnPropertyChanged(callback func(SensorPropertyChange)) *Disposable {
	return s.propertyChanged.Subscribe(callback)
}

// OnAssignmentChanged fires with the current camera id list whenever the
// user changes this sensor's camera assignments.
func (s *BaseSensor) OnAssignmentChanged(callback func([]string)) *Disposable {
	return s.assignmentChanged.Subscribe(callback)
}

// IsAssigned reports whether the sensor is assigned to at least one camera.
func (s *BaseSensor) IsAssigned() bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return len(s.assignedCameraIDs) > 0
}

func (s *BaseSensor) setPluginID(id string) {
	s.pluginID = id
}

func (s *BaseSensor) setID(id string) {
	s.id = id
}

func (s *BaseSensor) setOuter(outer Sensor) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.outer = outer
}

func (s *BaseSensor) setAssignmentLocked() {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.assignmentLocked = true
}

func (s *BaseSensor) setAssignedCameras(cameraIDs []string) {
	s.mu.Lock()
	s.assignedCameraIDs = make([]string, len(cameraIDs))
	copy(s.assignedCameraIDs, cameraIDs)
	notify := make([]string, len(cameraIDs))
	copy(notify, cameraIDs)
	s.mu.Unlock()
	s.assignmentChanged.Next(notify)
}

func (s *BaseSensor) writeState(partial map[string]any) {
	type change struct {
		property string
		value    any
	}

	delta := make(map[string]any, len(partial))
	changes := make([]change, 0, len(partial))

	s.mu.Lock()
	for key, value := range partial {
		if value == nil {
			continue
		}
		previous := s.properties[key]
		if isEqual(previous, value, true) {
			continue
		}
		s.properties[key] = value
		delta[key] = value
		changes = append(changes, change{key, value})
	}
	updateFn := s.updateFn
	s.mu.Unlock()

	if len(delta) == 0 {
		return
	}

	if updateFn != nil {
		updateFn(delta)
	}

	now := time.Now().UnixMilli()
	for _, c := range changes {
		s.propertyChanged.Next(SensorPropertyChange{
			Property:  c.property,
			Value:     c.value,
			Timestamp: now,
		})
	}
}

func (s *BaseSensor) setStorage(storage *DeviceStorage) {
	s.storage = storage
}

func (s *BaseSensor) initUpdateFn(updateFn propertyUpdateFn) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.updateFn = updateFn
	s.registered = true
}

func (s *BaseSensor) initCapabilitiesUpdateFn(updateFn func([]string)) {
	s.capabilitiesUpdateFn = updateFn
}

func (s *BaseSensor) initSourceUpdateFn(updateFn sourceUpdateFn) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.sourceUpdateFn = updateFn
}

func (s *BaseSensor) applyDeviceState(state *sensorDeviceState) {
	s.mu.Lock()
	changed := !sameSensorDevice(s.device, state.Device) || s.shortName != state.ShortName || s.primary != state.Primary || s.displayName != state.DisplayName
	s.device = state.Device
	s.displayName = state.DisplayName
	s.shortName = state.ShortName
	s.primary = state.Primary
	s.mu.Unlock()
	if changed {
		s.deviceInfoChanged.Next(state.Device)
	}
}

func (s *BaseSensor) applyPropertySpecs(specs map[string]SensorPropertySpec) {
	s.mu.Lock()
	if reflect.DeepEqual(s.propertySpecs, specs) || (len(s.propertySpecs) == 0 && len(specs) == 0) {
		s.mu.Unlock()
		return
	}
	s.propertySpecs = specs
	s.mu.Unlock()
	s.propertySpecsChanged.Next(maps.Clone(specs))
}

func (s *BaseSensor) setActive(active bool) bool {
	s.mu.Lock()
	if s.active == active {
		s.mu.Unlock()
		return false
	}
	s.active = active
	s.mu.Unlock()
	s.connectedChanged.Next(active)
	return true
}

func (s *BaseSensor) toBaseJSON(sensorType SensorType, category SensorCategory) sensorJSON {
	s.mu.RLock()
	defer s.mu.RUnlock()

	props := make(map[string]any, len(s.properties))
	maps.Copy(props, s.properties)
	overrides := make(map[string]PropertySpecOverride, len(s.specOverrides))
	maps.Copy(overrides, s.specOverrides)

	return sensorJSON{
		ID:             s.id,
		Type:           sensorType,
		Name:           s.name,
		DisplayName:    s.displayName,
		Category:       category,
		NativeID:       s.nativeID,
		Origin:         s.origin,
		PluginID:       s.pluginID,
		Properties:     props,
		Capabilities:   s.capabilities,
		RequiresFrames: s.requiresFrames,
		SourceState:    s.sourceState,
		Address:        s.address,
		Membership:     s.membership,
		PropertySpecs:  overrides,
	}
}

func (s *BaseSensor) onBackendPropertyChanged(property string, value any) {
	// no updateFn here, echoing a backend change back to the server would loop
	s.mu.Lock()
	oldValue := s.properties[property]
	if isEqual(oldValue, value, false) {
		s.mu.Unlock()
		return
	}
	s.properties[property] = value
	s.mu.Unlock()

	s.propertyChanged.Next(SensorPropertyChange{
		Property:  property,
		Value:     value,
		Timestamp: time.Now().UnixMilli(),
	})
}

func (s *BaseSensor) setPropertyWithTimestamp(property string, value any, timestamp int64) {
	s.mu.Lock()
	oldValue := s.properties[property]
	if isEqual(oldValue, value, false) {
		s.mu.Unlock()
		return
	}
	s.properties[property] = value
	s.mu.Unlock()

	s.propertyChanged.Next(SensorPropertyChange{
		Property:  property,
		Value:     value,
		Timestamp: timestamp,
	})
}

func (s *BaseSensor) cleanup() {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.updateFn = nil
	s.capabilitiesUpdateFn = nil
	s.sourceUpdateFn = nil
	s.registered = false
	s.assignedCameraIDs = nil
	s.propertyChanged.Complete()
	s.capabilitiesChanged.Complete()
	s.assignmentChanged.Complete()
	s.connectedChanged.Complete()
	s.deviceInfoChanged.Complete()
	s.propertySpecsChanged.Complete()
	s.storage = nil
}

func (s *BaseSensor) deactivateQuiet() bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	if !s.active {
		return false
	}
	s.active = false
	return true
}

// WithNativeID sets the plugin-supplied durable identity (e.g. an upstream
// device id). The host reconciles the sensor across restarts by
// (pluginId, nativeId); without it, identity falls back to (type, name) and a
// rename creates a new sensor.
func WithNativeID(nativeID string) SensorOption {
	return func(o *sensorOptions) {
		o.nativeID = nativeID
	}
}

// WithOrigin marks the source system the sensor was imported from (e.g.
// "homeassistant"). Export bridges targeting that system skip the sensor.
func WithOrigin(origin string) SensorOption {
	return func(o *sensorOptions) {
		o.origin = origin
	}
}

// WithAddress sets the sensor's current address at the source, e.g. a Home
// Assistant entity id. Display only, may change over time; identity is the
// native id.
func WithAddress(address string) SensorOption {
	return func(o *sensorOptions) {
		o.address = address
	}
}

// WithDevice sets the device the sensor belongs to. Sensors of the plugin that
// report the same DeviceInfo.ID form one device.
func WithDevice(device *DeviceInfo) SensorOption {
	return func(o *sensorOptions) {
		o.device = device
	}
}

// WithPrimary marks the sensor as the main sensor of its device, called like
// the device when it stands alone.
func WithPrimary() SensorOption {
	return func(o *sensorOptions) {
		o.primary = true
	}
}

// WithPropertySpec sets what the device accepts for one property, see
// BaseSensor.SetPropertySpec.
func WithPropertySpec(property string, spec *PropertySpecOverride) SensorOption {
	return func(o *sensorOptions) {
		if o.specs == nil {
			o.specs = map[string]PropertySpecOverride{}
		}
		o.specs[property] = *spec
	}
}

func generateSensorID() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	b[6] = (b[6] & 0x0f) | 0x40
	b[8] = (b[8] & 0x3f) | 0x80
	return fmt.Sprintf("%08x-%04x-%04x-%04x-%012x",
		b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
}

func normalizeReportedDetections[T any](detected bool, detections []T, base func(*T) *Detection, fallbackLabel string, fallbackAttribute string) []T {
	if !detected {
		return []T{}
	}

	if len(detections) > 0 {
		out := make([]T, len(detections))
		copy(out, detections)
		for i := range out {
			// smart-camera plugins report labels without coordinates, zone matching needs a box
			if d := base(&out[i]); d.Box == nil {
				d.Box = &BoundingBox{X: 0, Y: 0, Width: 1, Height: 1}
			}
		}
		return out
	}

	var fallback T
	d := base(&fallback)
	d.Label = fallbackLabel
	d.Confidence = 1
	d.Box = &BoundingBox{X: 0, Y: 0, Width: 1, Height: 1}
	if fallbackAttribute != "" {
		d.Attribute = fallbackAttribute
	}
	return []T{fallback}
}

func mergeSortedUnique(previous, next []string) []string {
	merged := make([]string, 0, len(previous)+len(next))
	merged = append(merged, previous...)
	merged = append(merged, next...)
	slices.Sort(merged)
	return slices.Compact(merged)
}

func isDetectionSensorType(t SensorType) bool {
	switch t {
	case SensorTypeMotion, SensorTypeAudio, SensorTypeObject, SensorTypeObjectAssist,
		SensorTypeFace, SensorTypeFaceEmbedder, SensorTypePersonEmbedder, SensorTypeSegmenter, SensorTypeLicensePlate, SensorTypeClassifier, SensorTypeClip:
		return true
	}
	return false
}

func cleanupSensorWithLifecycle(outer any) {
	type quietDeactivator interface{ deactivateQuiet() bool }
	if qd, ok := outer.(quietDeactivator); ok && qd.deactivateQuiet() {
		fireSensorLifecycle(outer, false)
	}

	type cleanable interface{ cleanup() }
	if c, ok := outer.(cleanable); ok {
		c.cleanup()
	}
}

func setActiveWithLifecycle(outer any, active bool) {
	// outer must be the concrete sensor value, the type assertions need its full method set
	type activatableSensor interface{ setActive(bool) bool }
	as, ok := outer.(activatableSensor)
	if !ok {
		return
	}

	if !as.setActive(active) {
		return
	}

	fireSensorLifecycle(outer, active)
}

func fireSensorLifecycle(outer any, active bool) {
	// swallow, lifecycle errors must not crash the runtime
	run := func(fn func()) {
		defer func() {
			_ = recover()
		}()
		fn()
	}
	go func() {
		if lc, ok := outer.(sensorLifecycle); ok {
			if active {
				run(lc.OnStart)
			} else {
				run(lc.OnStop)
			}
		}
	}()
}

func outerOr[T any](s *BaseSensor, own T) T {
	s.mu.RLock()
	outer := s.outer
	s.mu.RUnlock()
	// an embedded method never reaches the plugin's shadowing one, the registered value does
	if t, ok := outer.(T); ok {
		return t
	}
	return own
}
