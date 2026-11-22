package sdk

// SwitchProperty is a property name of a switch control.
type SwitchProperty = string

// Property names of a switch control.
const (
	SwitchPropertyOn SwitchProperty = "on" // Whether the switch is on
)

type switchSetters interface {
	SetOn()
	SetOff()
}

// SwitchControl is a generic on/off switch control sensor. Override SetOn /
// SetOff (by embedding SwitchControl in your own type and shadowing the
// methods) to drive hardware, then call the embedded SwitchControl's methods
// to sync the SDK state. For hardware-pushed updates, call the embedded
// methods directly from your event handler. That bypasses any plugin override
// and only syncs state.
type SwitchControl struct{ BaseSensor }

// NewSwitchControl creates a switch control with the given name and options.
func NewSwitchControl(name string, opts ...SensorOption) *SwitchControl {
	s := &SwitchControl{BaseSensor: NewBaseSensor(name, opts...)}
	s.writeState(map[string]any{
		SwitchPropertyOn: false,
	})
	return s
}

func (s *SwitchControl) GetType() SensorType         { return SensorTypeSwitch }
func (s *SwitchControl) GetCategory() SensorCategory { return SensorCategoryControl }
func (s *SwitchControl) ToJSON() sensorJSON          { return s.toBaseJSON(s.GetType(), s.GetCategory()) }

// IsOn reports whether the switch is on.
func (s *SwitchControl) IsOn() bool {
	v, _ := s.GetValue(SwitchPropertyOn).(bool)
	return v
}

// SetOn turns the switch on.
//
// Example:
//
//	sw.SetOn()
func (s *SwitchControl) SetOn() {
	s.writeState(map[string]any{SwitchPropertyOn: true})
}

// SetOff turns the switch off.
//
// Example:
//
//	sw.SetOff()
func (s *SwitchControl) SetOff() {
	s.writeState(map[string]any{SwitchPropertyOn: false})
}

// UpdateValue routes generic property writes to the semantic setters.
func (s *SwitchControl) UpdateValue(property string, value any) error {
	setters := outerOr[switchSetters](&s.BaseSensor, s)
	if property == SwitchPropertyOn {
		if isTruthy(value) {
			setters.SetOn()
		} else {
			setters.SetOff()
		}
	}
	return nil
}
