package sdk

// ContactKind says what a contact guards, it decides how smart homes show it.
type ContactKind = string

// Kinds of a contact.
const (
	ContactKindDoor       ContactKind = "door"
	ContactKindGarageDoor ContactKind = "garage_door"
	ContactKindWindow     ContactKind = "window"
)

// ContactProperty is a property name of a contact sensor.
type ContactProperty = string

// Property names of a contact sensor.
const (
	ContactPropertyDetected ContactProperty = "detected" // Whether the contact is open (true = open, false = closed)
	ContactPropertyKind     ContactProperty = "kind"     // What the contact guards, a ContactKind
)

// ContactSensor reports door/window open-close state.
type ContactSensor struct{ BinarySensor }

// NewContactSensor creates a contact sensor with the given name and options.
func NewContactSensor(name string, opts ...SensorOption) *ContactSensor {
	s := &ContactSensor{}
	s.initBinary(SensorTypeContact, name, opts)
	return s
}

// GetKind returns what the contact guards.
func (s *ContactSensor) GetKind() ContactKind {
	v, _ := s.GetValue(ContactPropertyKind).(string)
	return v
}

// SetKind says what the contact guards. Smart homes show it by its kind, a
// window or a door for example, and Home Assistant takes it as the device class.
//
// Example:
//
//	contact.SetKind(ContactKindWindow)
func (s *ContactSensor) SetKind(kind ContactKind) {
	s.writeState(map[string]any{ContactPropertyKind: kind})
	s.SetPropertySpec(ContactPropertyKind, &PropertySpecOverride{Values: []any{kind}})
}
