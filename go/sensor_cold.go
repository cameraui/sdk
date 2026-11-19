package sdk

// ColdProperty is a property name of a cold sensor.
type ColdProperty = string

// Property names of a cold sensor.
const (
	ColdPropertyDetected ColdProperty = "detected" // Whether abnormal cold is detected
)

// ColdSensor reports abnormal cold detection state.
type ColdSensor struct{ BaseSensor }

// NewColdSensor creates a cold sensor with the given name and options.
func NewColdSensor(name string, opts ...SensorOption) *ColdSensor {
	s := &ColdSensor{BaseSensor: NewBaseSensor(name, opts...)}
	s.writeState(map[string]any{
		ColdPropertyDetected: false,
	})
	return s
}

func (s *ColdSensor) GetType() SensorType         { return SensorTypeCold }
func (s *ColdSensor) GetCategory() SensorCategory { return SensorCategorySensor }
func (s *ColdSensor) ToJSON() sensorJSON          { return s.toBaseJSON(s.GetType(), s.GetCategory()) }

// IsDetected reports whether abnormal cold is detected.
func (s *ColdSensor) IsDetected() bool {
	v, _ := s.GetValue(ColdPropertyDetected).(bool)
	return v
}

// SetDetected reports the abnormal cold detection state.
//
// Example:
//
//	cold.SetDetected(true)
func (s *ColdSensor) SetDetected(detected bool) {
	s.writeState(map[string]any{ColdPropertyDetected: detected})
}

// UpdateValue on a read-only sensor: external writes are ignored.
func (s *ColdSensor) UpdateValue(property string, value any) error {
	return nil
}
