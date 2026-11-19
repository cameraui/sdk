package sdk

// GasProperty is a property name of a gas sensor.
type GasProperty = string

// Property names of a gas sensor.
const (
	GasPropertyDetected GasProperty = "detected" // Whether gas is detected
)

// GasSensor reports gas detection state.
type GasSensor struct{ BaseSensor }

// NewGasSensor creates a gas sensor with the given name and options.
func NewGasSensor(name string, opts ...SensorOption) *GasSensor {
	s := &GasSensor{BaseSensor: NewBaseSensor(name, opts...)}
	s.writeState(map[string]any{
		GasPropertyDetected: false,
	})
	return s
}

func (s *GasSensor) GetType() SensorType         { return SensorTypeGas }
func (s *GasSensor) GetCategory() SensorCategory { return SensorCategorySensor }
func (s *GasSensor) ToJSON() sensorJSON          { return s.toBaseJSON(s.GetType(), s.GetCategory()) }

// IsDetected reports whether gas is detected.
func (s *GasSensor) IsDetected() bool {
	v, _ := s.GetValue(GasPropertyDetected).(bool)
	return v
}

// SetDetected reports the gas detection state.
//
// Example:
//
//	gas.SetDetected(true)
func (s *GasSensor) SetDetected(detected bool) {
	s.writeState(map[string]any{GasPropertyDetected: detected})
}

// UpdateValue on a read-only sensor: external writes are ignored.
func (s *GasSensor) UpdateValue(property string, value any) error {
	return nil
}
