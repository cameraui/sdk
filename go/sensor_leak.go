package sdk

// LeakProperty is a property name of a leak sensor.
type LeakProperty = string

// Property names of a leak sensor.
const (
	LeakPropertyDetected LeakProperty = "detected" // Whether a leak is detected
)

// LeakSensor reports water leak detection state.
type LeakSensor struct{ BaseSensor }

// NewLeakSensor creates a leak sensor with the given name and options.
func NewLeakSensor(name string, opts ...SensorOption) *LeakSensor {
	s := &LeakSensor{BaseSensor: NewBaseSensor(name, opts...)}
	s.writeState(map[string]any{
		LeakPropertyDetected: false,
	})
	return s
}

func (s *LeakSensor) GetType() SensorType         { return SensorTypeLeak }
func (s *LeakSensor) GetCategory() SensorCategory { return SensorCategorySensor }
func (s *LeakSensor) ToJSON() sensorJSON          { return s.toBaseJSON(s.GetType(), s.GetCategory()) }

// IsDetected reports whether a leak is detected.
func (s *LeakSensor) IsDetected() bool {
	v, _ := s.GetValue(LeakPropertyDetected).(bool)
	return v
}

// SetDetected reports leak detection state (true when a water leak is
// currently detected).
//
// Example:
//
//	leak.SetDetected(true)
func (s *LeakSensor) SetDetected(detected bool) {
	s.writeState(map[string]any{LeakPropertyDetected: detected})
}

// UpdateValue on a read-only sensor: external writes are ignored.
func (s *LeakSensor) UpdateValue(property string, value any) error {
	return nil
}
