package sdk

// GasProperty is a property name of a gas sensor.
type GasProperty = string

// Property names of a gas sensor.
const (
	GasPropertyDetected GasProperty = "detected" // Whether gas is detected
)

// GasSensor reports gas detection state.
type GasSensor struct{ BinarySensor }

// NewGasSensor creates a gas sensor with the given name and options.
func NewGasSensor(name string, opts ...SensorOption) *GasSensor {
	s := &GasSensor{}
	s.initBinary(SensorTypeGas, name, opts)
	return s
}
