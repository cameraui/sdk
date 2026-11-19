package sdk

// VibrationProperty is a property name of a vibration sensor.
type VibrationProperty = string

// Property names of a vibration sensor.
const (
	VibrationPropertyDetected VibrationProperty = "detected" // Whether vibration is detected
)

// VibrationSensor reports vibration detection state.
type VibrationSensor struct{ BaseSensor }

// NewVibrationSensor creates a vibration sensor with the given name and options.
func NewVibrationSensor(name string, opts ...SensorOption) *VibrationSensor {
	s := &VibrationSensor{BaseSensor: NewBaseSensor(name, opts...)}
	s.writeState(map[string]any{
		VibrationPropertyDetected: false,
	})
	return s
}

func (s *VibrationSensor) GetType() SensorType         { return SensorTypeVibration }
func (s *VibrationSensor) GetCategory() SensorCategory { return SensorCategorySensor }
func (s *VibrationSensor) ToJSON() sensorJSON          { return s.toBaseJSON(s.GetType(), s.GetCategory()) }

// IsDetected reports whether vibration is detected.
func (s *VibrationSensor) IsDetected() bool {
	v, _ := s.GetValue(VibrationPropertyDetected).(bool)
	return v
}

// SetDetected reports the vibration detection state.
//
// Example:
//
//	vibration.SetDetected(true)
func (s *VibrationSensor) SetDetected(detected bool) {
	s.writeState(map[string]any{VibrationPropertyDetected: detected})
}

// UpdateValue on a read-only sensor: external writes are ignored.
func (s *VibrationSensor) UpdateValue(property string, value any) error {
	return nil
}
