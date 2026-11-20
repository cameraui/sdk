package sdk

// TamperProperty is a property name of a tamper sensor.
type TamperProperty = string

// Property names of a tamper sensor.
const (
	TamperPropertyDetected TamperProperty = "detected" // Whether tampering is detected
)

// TamperSensor reports tampering detection state.
type TamperSensor struct{ BinarySensor }

// NewTamperSensor creates a tamper sensor with the given name and options.
func NewTamperSensor(name string, opts ...SensorOption) *TamperSensor {
	s := &TamperSensor{}
	s.initBinary(SensorTypeTamper, name, opts)
	return s
}
