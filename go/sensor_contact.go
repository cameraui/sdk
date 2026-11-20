package sdk

// ContactProperty is a property name of a contact sensor.
type ContactProperty = string

// Property names of a contact sensor.
const (
	ContactPropertyDetected ContactProperty = "detected" // Whether the contact is open (true = open, false = closed)
)

// ContactSensor reports door/window open-close state.
type ContactSensor struct{ BinarySensor }

// NewContactSensor creates a contact sensor with the given name and options.
func NewContactSensor(name string, opts ...SensorOption) *ContactSensor {
	s := &ContactSensor{}
	s.initBinary(SensorTypeContact, name, opts)
	return s
}
