package sdk

// TamperProperty is a property name of a tamper sensor.
type TamperProperty = string

// Property names of a tamper sensor.
const (
	TamperPropertyDetected TamperProperty = "detected" // Whether tampering is detected
)

// TamperSensor reports tampering detection state.
type TamperSensor struct{ BaseSensor }

// NewTamperSensor creates a tamper sensor with the given name and options.
func NewTamperSensor(name string, opts ...SensorOption) *TamperSensor {
	s := &TamperSensor{BaseSensor: NewBaseSensor(name, opts...)}
	s.writeState(map[string]any{
		TamperPropertyDetected: false,
	})
	return s
}

func (s *TamperSensor) GetType() SensorType         { return SensorTypeTamper }
func (s *TamperSensor) GetCategory() SensorCategory { return SensorCategorySensor }
func (s *TamperSensor) ToJSON() sensorJSON          { return s.toBaseJSON(s.GetType(), s.GetCategory()) }

// IsDetected reports whether tampering is detected.
func (s *TamperSensor) IsDetected() bool {
	v, _ := s.GetValue(TamperPropertyDetected).(bool)
	return v
}

// SetDetected reports the tampering detection state.
//
// Example:
//
//	tamper.SetDetected(true)
func (s *TamperSensor) SetDetected(detected bool) {
	s.writeState(map[string]any{TamperPropertyDetected: detected})
}

// UpdateValue on a read-only sensor: external writes are ignored.
func (s *TamperSensor) UpdateValue(property string, value any) error {
	return nil
}
