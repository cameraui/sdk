package sdk

type cameraEventMessage struct {
	Type string `msgpack:"type"`
	Data any    `msgpack:"data,omitempty"`
}

type sensorRegistryEventMessage struct {
	Type string `msgpack:"type"`
	Data any    `msgpack:"data,omitempty"`
}

type sensorAddedEventData struct {
	Sensor storedSensorData     `msgpack:"sensor"`
	State  sensorRefreshedState `msgpack:"state"`
}

type sensorAdoptedEventData struct {
	Sensor storedSensorData `msgpack:"sensor"`
}

type sensorDeletedEventData struct {
	SensorID   string     `msgpack:"sensorId"`
	SensorType SensorType `msgpack:"sensorType"`
}

type sensorConnectedChangedData struct {
	SensorID   string     `msgpack:"sensorId"`
	SensorType SensorType `msgpack:"sensorType"`
	Connected  bool       `msgpack:"connected"`
}

type sensorExposedChangedData struct {
	SensorID   string     `msgpack:"sensorId"`
	SensorType SensorType `msgpack:"sensorType"`
	Exposed    bool       `msgpack:"exposed"`
}

type sensorRefreshedState struct {
	Type         SensorType         `msgpack:"type"`
	Properties   map[string]any     `msgpack:"properties,omitempty"`
	Capabilities []string           `msgpack:"capabilities,omitempty"`
	DisplayName  string             `msgpack:"displayName,omitempty"`
	DeviceState  *sensorDeviceState `msgpack:"deviceState,omitempty"`
	// nil from an older server, it keeps what the proxy has
	PropertySpecs map[string]SensorPropertySpec `msgpack:"propertySpecs,omitempty"`
}

type sensorDeviceChangedData struct {
	SensorID    string            `msgpack:"sensorId"`
	SensorType  SensorType        `msgpack:"sensorType"`
	DeviceState sensorDeviceState `msgpack:"deviceState"`
}

type sensorSpecsChangedData struct {
	SensorID      string                        `msgpack:"sensorId"`
	SensorType    SensorType                    `msgpack:"sensorType"`
	PropertySpecs map[string]SensorPropertySpec `msgpack:"propertySpecs"`
}

type sensorAssignmentChangedData struct {
	SensorID   string     `msgpack:"sensorId"`
	SensorType SensorType `msgpack:"sensorType"`
	CameraID   string     `msgpack:"cameraId"`
	Assigned   bool       `msgpack:"assigned"`
}

type sensorRegistration struct {
	ID                string                        `msgpack:"id"`
	AssignedCameraIDs []string                      `msgpack:"assignedCameraIds"`
	Active            bool                          `msgpack:"active"`
	StateSubject      bool                          `msgpack:"stateSubject"`
	DeviceState       *sensorDeviceState            `msgpack:"deviceState,omitempty"`
	PropertySpecs     map[string]SensorPropertySpec `msgpack:"propertySpecs,omitempty"`
}

type storedSensorData struct {
	ID                string                        `msgpack:"id"`
	Type              SensorType                    `msgpack:"type"`
	Name              string                        `msgpack:"name"`
	DisplayName       string                        `msgpack:"displayName"`
	NativeID          string                        `msgpack:"nativeId,omitempty"`
	PluginID          string                        `msgpack:"pluginId"`
	AssignedCameraIDs []string                      `msgpack:"assignedCameraIds"`
	BoundCameraID     string                        `msgpack:"boundCameraId,omitempty"`
	Address           string                        `msgpack:"address,omitempty"`
	SourceState       SensorSourceState             `msgpack:"sourceState,omitempty"`
	Exposed           bool                          `msgpack:"exposed"`
	Connected         bool                          `msgpack:"connected"`
	Properties        map[string]any                `msgpack:"properties,omitempty"`
	Capabilities      []string                      `msgpack:"capabilities,omitempty"`
	RequiresFrames    bool                          `msgpack:"requiresFrames,omitempty"`
	ShortName         string                        `msgpack:"shortName,omitempty"`
	Device            *SensorDevice                 `msgpack:"device,omitempty"`
	Primary           bool                          `msgpack:"primary,omitempty"`
	PropertySpecs     map[string]SensorPropertySpec `msgpack:"propertySpecs,omitempty"`
}

type sensorEventMessage struct {
	Type string         `msgpack:"type"`
	Data map[string]any `msgpack:"data"` // msgpack reflection panics on an inner any-typed Value
}

type deviceManagerEventMessage struct {
	Type string `msgpack:"type"`
	Data any    `msgpack:"data,omitempty"`
}

type cameraAddedEventData struct {
	Camera Camera `msgpack:"camera"`
}

type cameraReleasedEventData struct {
	CameraID string `msgpack:"cameraId"`
}

type detectionEventMessage struct {
	Type DetectionEventType `msgpack:"type" json:"type"`
	Data DetectionEvent     `msgpack:"data" json:"data"`
}
