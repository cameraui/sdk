package sdk

// ContactProperty is a property name of a contact sensor.
type ContactProperty = string

// Property names of a contact sensor.
const (
	ContactPropertyDetected ContactProperty = "detected" // Whether the contact is open (true = open, false = closed)
)

// ContactSensor reports door/window open-close state.
type ContactSensor struct{ BaseSensor }

// NewContactSensor creates a contact sensor with the given name and options.
func NewContactSensor(name string, opts ...SensorOption) *ContactSensor {
	s := &ContactSensor{BaseSensor: NewBaseSensor(name, opts...)}
	s.writeState(map[string]any{
		ContactPropertyDetected: false,
	})
	return s
}

func (s *ContactSensor) GetType() SensorType         { return SensorTypeContact }
func (s *ContactSensor) GetCategory() SensorCategory { return SensorCategorySensor }
func (s *ContactSensor) ToJSON() sensorJSON          { return s.toBaseJSON(s.GetType(), s.GetCategory()) }

// IsDetected reports whether the contact is open (true = open, false = closed).
func (s *ContactSensor) IsDetected() bool {
	v, _ := s.GetValue(ContactPropertyDetected).(bool)
	return v
}

// SetDetected reports contact state (true = open, false = closed).
//
// Example:
//
//	contact.SetDetected(true)
func (s *ContactSensor) SetDetected(detected bool) {
	s.writeState(map[string]any{ContactPropertyDetected: detected})
}

// UpdateValue on a read-only sensor: external writes are ignored.
func (s *ContactSensor) UpdateValue(property string, value any) error {
	return nil
}
