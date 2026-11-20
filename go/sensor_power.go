package sdk

// PowerProperty is a property name of a power sensor.
type PowerProperty = string

// Property names of a power sensor.
const (
	PowerPropertyDetected PowerProperty = "detected" // Whether power is detected
)

// PowerSensor reports power detection state.
type PowerSensor struct{ BinarySensor }

// NewPowerSensor creates a power sensor with the given name and options.
func NewPowerSensor(name string, opts ...SensorOption) *PowerSensor {
	s := &PowerSensor{}
	s.initBinary(SensorTypePower, name, opts)
	return s
}
