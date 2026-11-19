package sdk

// PowerProperty is a property name of a power sensor.
type PowerProperty = string

// Property names of a power sensor.
const (
	PowerPropertyDetected PowerProperty = "detected" // Whether power is detected
)

// PowerSensor reports power detection state.
type PowerSensor struct{ BaseSensor }

// NewPowerSensor creates a power sensor with the given name and options.
func NewPowerSensor(name string, opts ...SensorOption) *PowerSensor {
	s := &PowerSensor{BaseSensor: NewBaseSensor(name, opts...)}
	s.writeState(map[string]any{
		PowerPropertyDetected: false,
	})
	return s
}

func (s *PowerSensor) GetType() SensorType         { return SensorTypePower }
func (s *PowerSensor) GetCategory() SensorCategory { return SensorCategorySensor }
func (s *PowerSensor) ToJSON() sensorJSON          { return s.toBaseJSON(s.GetType(), s.GetCategory()) }

// IsDetected reports whether power is detected.
func (s *PowerSensor) IsDetected() bool {
	v, _ := s.GetValue(PowerPropertyDetected).(bool)
	return v
}

// SetDetected reports the power detection state.
//
// Example:
//
//	power.SetDetected(true)
func (s *PowerSensor) SetDetected(detected bool) {
	s.writeState(map[string]any{PowerPropertyDetected: detected})
}

// UpdateValue on a read-only sensor: external writes are ignored.
func (s *PowerSensor) UpdateValue(property string, value any) error {
	return nil
}
