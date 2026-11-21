package sdk

// DeviceInfo is the physical device a sensor belongs to, as the plugin reports
// it. Sensors of one plugin that report the same ID form one device: one row
// on the sensors page, one HomeKit accessory, one Home Assistant device. A
// sensor without a device is its own device, and a sensor added with
// CameraDevice.AddSensor belongs to its camera.
type DeviceInfo struct {
	// ID is the source's stable id for the device, never an address: a vendor
	// device id, a Home Assistant device id, a serial number.
	ID string `msgpack:"id" json:"id"`
	// Name is the name of the device at the source.
	Name string `msgpack:"name" json:"name"`
	// Manufacturer is the manufacturer label (optional).
	Manufacturer string `msgpack:"manufacturer,omitempty" json:"manufacturer,omitempty"`
	// Model is the model label (optional).
	Model string `msgpack:"model,omitempty" json:"model,omitempty"`
	// Firmware is the firmware version (optional).
	Firmware string `msgpack:"firmware,omitempty" json:"firmware,omitempty"`
	// SerialNumber is the serial number (optional).
	SerialNumber string `msgpack:"serialNumber,omitempty" json:"serialNumber,omitempty"`
}

// SensorDevice is the device a sensor belongs to, as consumers see it.
type SensorDevice struct {
	// ID is the id of the device in camera.ui, not the plugin's DeviceInfo.ID.
	ID string `msgpack:"id" json:"id"`
	// Name is the name shown to the user, the source's name until the user renames the device.
	Name string `msgpack:"name" json:"name"`
	// Manufacturer is the manufacturer label (optional).
	Manufacturer string `msgpack:"manufacturer,omitempty" json:"manufacturer,omitempty"`
	// Model is the model label (optional).
	Model string `msgpack:"model,omitempty" json:"model,omitempty"`
	// Firmware is the firmware version (optional).
	Firmware string `msgpack:"firmware,omitempty" json:"firmware,omitempty"`
	// SerialNumber is the serial number (optional).
	SerialNumber string `msgpack:"serialNumber,omitempty" json:"serialNumber,omitempty"`
}

type sensorMembership struct {
	Device  *DeviceInfo `msgpack:"device" json:"device"` // nil leaves the device
	Primary bool        `msgpack:"primary" json:"primary"`
}

type sensorDeviceState struct {
	Device      *SensorDevice `msgpack:"device,omitempty"`
	DisplayName string        `msgpack:"displayName"`
	ShortName   string        `msgpack:"shortName"`
	Primary     bool          `msgpack:"primary"`
}

func sameMembership(a, b *sensorMembership) bool {
	if a == nil || b == nil {
		return a == b
	}
	if a.Primary != b.Primary {
		return false
	}
	if a.Device == nil || b.Device == nil {
		return a.Device == b.Device
	}
	return *a.Device == *b.Device
}

func sameSensorDevice(a, b *SensorDevice) bool {
	if a == nil || b == nil {
		return a == b
	}
	return *a == *b
}
