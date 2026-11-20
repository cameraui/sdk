package sdk

// ColdProperty is a property name of a cold sensor.
type ColdProperty = string

// Property names of a cold sensor.
const (
	ColdPropertyDetected ColdProperty = "detected" // Whether abnormal cold is detected
)

// ColdSensor reports abnormal cold detection state.
type ColdSensor struct{ BinarySensor }

// NewColdSensor creates a cold sensor with the given name and options.
func NewColdSensor(name string, opts ...SensorOption) *ColdSensor {
	s := &ColdSensor{}
	s.initBinary(SensorTypeCold, name, opts)
	return s
}
