package sdk

// Optional capabilities of an outlet.
const (
	OutletCapabilityInUse = "inUse" // Outlet reports whether the device plugged into it draws power
)

// OutletProperty is a property name of an outlet.
type OutletProperty = string

// Property names of an outlet.
const (
	OutletPropertyOn    OutletProperty = "on"    // Whether the outlet is on
	OutletPropertyInUse OutletProperty = "inUse" // Whether the device plugged into the outlet draws power
)

type outletSetters interface {
	SetOn() error
	SetOff() error
}

// OutletControl is a power outlet or smart plug. Override SetOn / SetOff (by
// embedding OutletControl in your own type and shadowing the methods) to drive
// hardware, then call the embedded OutletControl's methods to sync the SDK
// state. For hardware-pushed updates, call the embedded methods directly from
// your event handler.
//
// An outlet that measures its load adds OutletCapabilityInUse and reports it
// with SetInUse.
//
// When the device refuses a command, return an error from the override instead of
// calling the embedded method: the write fails for whoever sent it and the state
// stays as it was.
type OutletControl struct{ BaseSensor }

// NewOutletControl creates an outlet with the given name and options.
func NewOutletControl(name string, opts ...SensorOption) *OutletControl {
	s := &OutletControl{BaseSensor: NewBaseSensor(name, opts...)}
	s.writeState(map[string]any{
		OutletPropertyOn:    false,
		OutletPropertyInUse: false,
	})
	s.handleWrites(s)
	return s
}

func (s *OutletControl) GetType() SensorType         { return SensorTypeOutlet }
func (s *OutletControl) GetCategory() SensorCategory { return SensorCategoryControl }
func (s *OutletControl) ToJSON() sensorJSON          { return s.toBaseJSON(s.GetType(), s.GetCategory()) }

// IsOn reports whether the outlet is on.
func (s *OutletControl) IsOn() bool {
	v, _ := s.GetValue(OutletPropertyOn).(bool)
	return v
}

// IsInUse reports whether the device plugged into the outlet draws power.
func (s *OutletControl) IsInUse() bool {
	v, _ := s.GetValue(OutletPropertyInUse).(bool)
	return v
}

// SetOn turns the outlet on.
//
// Example:
//
//	outlet.SetOn()
func (s *OutletControl) SetOn() error {
	s.writeState(map[string]any{OutletPropertyOn: true})
	return nil
}

// SetOff turns the outlet off.
//
// Example:
//
//	outlet.SetOff()
func (s *OutletControl) SetOff() error {
	s.writeState(map[string]any{OutletPropertyOn: false})
	return nil
}

// SetInUse reports whether the device plugged into the outlet draws power.
//
// Example:
//
//	outlet.SetInUse(watts > 1)
func (s *OutletControl) SetInUse(inUse bool) {
	s.writeState(map[string]any{OutletPropertyInUse: inUse})
}

func (s *OutletControl) applyValue(property string, value any) error {
	setters := outerOr[outletSetters](&s.BaseSensor, s)
	if property == OutletPropertyOn {
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
