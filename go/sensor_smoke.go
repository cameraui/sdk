package sdk

// SmokeProperty is a property name of a smoke sensor.
type SmokeProperty = string

// Property names of a smoke sensor.
const (
	SmokePropertyDetected SmokeProperty = "detected" // Whether smoke is detected
)

// SmokeSensor reports smoke detection state.
type SmokeSensor struct{ BinarySensor }

// NewSmokeSensor creates a smoke sensor with the given name and options.
func NewSmokeSensor(name string, opts ...SensorOption) *SmokeSensor {
	s := &SmokeSensor{}
	s.initBinary(SensorTypeSmoke, name, opts)
	return s
}
