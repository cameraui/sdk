package sdk

// SwitchProperty is a property name of a switch control.
type SwitchProperty = string

// Property names of a switch control.
const (
	SwitchPropertyOn SwitchProperty = "on" // Whether the switch is on
)

type switchSetters interface {
	SetOn() error
	SetOff() error
}

// SwitchControl is a generic on/off switch control sensor. Override SetOn /
// SetOff (by embedding SwitchControl in your own type and shadowing the
// methods) to drive hardware, then call the embedded SwitchControl's methods
// to sync the SDK state. For hardware-pushed updates, call the embedded
// methods directly from your event handler. That bypasses any plugin override
// and only syncs state.
//
// When the device refuses a command, return an error from the override instead of
// calling the embedded method: the write fails for whoever sent it and the state
// stays as it was.
type SwitchControl struct{ BaseSensor }

// NewSwitchControl creates a switch control with the given name and options.
func NewSwitchControl(name string, opts ...SensorOption) *SwitchControl {
	s := &SwitchControl{BaseSensor: NewBaseSensor(name, opts...)}
	s.writeState(map[string]any{
		SwitchPropertyOn: false,
	})
	s.handleWrites(s)
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
func (s *SwitchControl) SetOn() error {
	s.writeState(map[string]any{SwitchPropertyOn: true})
	return nil
}

// SetOff turns the switch off.
//
// Example:
//
//	sw.SetOff()
func (s *SwitchControl) SetOff() error {
	s.writeState(map[string]any{SwitchPropertyOn: false})
	return nil
}

func (s *SwitchControl) applyValue(property string, value any) error {
	setters := outerOr[switchSetters](&s.BaseSensor, s)
	if property == SwitchPropertyOn {
		if isTruthy(value) {
			if err := setters.SetOn(); err != nil {
				return err
			}
		} else {
			if err := setters.SetOff(); err != nil {
				return err
			}
		}
	}
	return nil
}
