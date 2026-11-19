package sdk

// SmokeProperty is a property name of a smoke sensor.
type SmokeProperty = string

// Property names of a smoke sensor.
const (
	SmokePropertyDetected SmokeProperty = "detected" // Whether smoke is detected
)

// SmokeSensor reports smoke detection state.
type SmokeSensor struct{ BaseSensor }

// NewSmokeSensor creates a smoke sensor with the given name and options.
func NewSmokeSensor(name string, opts ...SensorOption) *SmokeSensor {
	s := &SmokeSensor{BaseSensor: NewBaseSensor(name, opts...)}
	s.writeState(map[string]any{
		SmokePropertyDetected: false,
	})
	return s
}

func (s *SmokeSensor) GetType() SensorType         { return SensorTypeSmoke }
func (s *SmokeSensor) GetCategory() SensorCategory { return SensorCategorySensor }
func (s *SmokeSensor) ToJSON() sensorJSON          { return s.toBaseJSON(s.GetType(), s.GetCategory()) }

// IsDetected reports whether smoke is detected.
func (s *SmokeSensor) IsDetected() bool {
	v, _ := s.GetValue(SmokePropertyDetected).(bool)
	return v
}

// SetDetected reports the smoke detection state.
//
// Example:
//
//	smoke.SetDetected(true)
func (s *SmokeSensor) SetDetected(detected bool) {
	s.writeState(map[string]any{SmokePropertyDetected: detected})
}

// UpdateValue on a read-only sensor: external writes are ignored.
func (s *SmokeSensor) UpdateValue(property string, value any) error {
	return nil
}
