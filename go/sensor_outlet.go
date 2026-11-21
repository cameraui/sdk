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
	SetOn()
	SetOff()
}

// OutletControl is a power outlet or smart plug. Override SetOn / SetOff (by
// embedding OutletControl in your own type and shadowing the methods) to drive
// hardware, then call the embedded OutletControl's methods to sync the SDK
// state. For hardware-pushed updates, call the embedded methods directly from
// your event handler.
//
// An outlet that measures its load adds OutletCapabilityInUse and reports it
// with SetInUse.
type OutletControl struct{ BaseSensor }

// NewOutletControl creates an outlet with the given name and options.
func NewOutletControl(name string, opts ...SensorOption) *OutletControl {
	s := &OutletControl{BaseSensor: NewBaseSensor(name, opts...)}
	s.writeState(map[string]any{
		OutletPropertyOn:    false,
		OutletPropertyInUse: false,
	})
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
func (s *OutletControl) SetOn() {
	s.writeState(map[string]any{OutletPropertyOn: true})
}

// SetOff turns the outlet off.
//
// Example:
//
//	outlet.SetOff()
func (s *OutletControl) SetOff() {
	s.writeState(map[string]any{OutletPropertyOn: false})
}

// SetInUse reports whether the device plugged into the outlet draws power.
//
// Example:
//
//	outlet.SetInUse(watts > 1)
func (s *OutletControl) SetInUse(inUse bool) {
	s.writeState(map[string]any{OutletPropertyInUse: inUse})
}

// UpdateValue routes generic property writes to the semantic setters.
func (s *OutletControl) UpdateValue(property string, value any) error {
	setters := outerOr[outletSetters](&s.BaseSensor, s)
	if property == OutletPropertyOn {
		on := false
		if b, ok := value.(bool); ok {
			on = b
		} else if v, ok := toInt64(value); ok {
			on = v != 0
		}
		if on {
			setters.SetOn()
		} else {
			setters.SetOff()
		}
	}
	return nil
}
