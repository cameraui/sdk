package sdk

// Optional capabilities of a light control.
const (
	LightCapabilityBrightness = "brightness" // Light supports brightness adjustment (0-100)
)

// LightProperty is a property name of a light control.
type LightProperty = string

// Property names of a light control.
const (
	LightPropertyOn         LightProperty = "on"         // Whether the light is on
	LightPropertyBrightness LightProperty = "brightness" // Brightness level (0-100)
)

type lightSetters interface {
	SetOn()
	SetOff()
	SetBrightness(value int)
}

// LightControl is a light on/off and brightness control sensor. Override
// SetOn / SetOff (by embedding LightControl in your own type and shadowing
// the methods) to drive your hardware, then call the embedded LightControl's
// methods to sync the SDK state.
//
// Plugins with no hardware-action use case can leave the methods unoverridden,
// the base implementation just updates the state.
//
// For hardware-pushed updates (someone manually flipped the switch), call the
// embedded LightControl's SetOn / SetOff directly from your event handler.
// That bypasses any plugin override and only syncs state.
type LightControl struct{ BaseSensor }

// NewLightControl creates a light control with the given name and options.
func NewLightControl(name string, opts ...SensorOption) *LightControl {
	s := &LightControl{BaseSensor: NewBaseSensor(name, opts...)}
	s.writeState(map[string]any{
		LightPropertyOn:         false,
		LightPropertyBrightness: 100,
	})
	return s
}

func (s *LightControl) GetType() SensorType         { return SensorTypeLight }
func (s *LightControl) GetCategory() SensorCategory { return SensorCategoryControl }
func (s *LightControl) ToJSON() sensorJSON          { return s.toBaseJSON(s.GetType(), s.GetCategory()) }

// IsOn reports whether the light is on.
func (s *LightControl) IsOn() bool {
	v, _ := s.GetValue(LightPropertyOn).(bool)
	return v
}

// GetBrightness returns the brightness level (0-100).
func (s *LightControl) GetBrightness() int {
	if v, ok := s.GetValue(LightPropertyBrightness).(int); ok {
		return v
	}
	return 0
}

// SetOn turns the light on. Override (via embedding) to drive hardware and
// call the embedded LightControl's SetOn to sync the SDK state.
//
// Example:
//
//	light.SetOn()
func (s *LightControl) SetOn() {
	s.writeState(map[string]any{LightPropertyOn: true})
}

// SetOff turns the light off. Override (via embedding) to drive hardware and
// call the embedded LightControl's SetOff to sync the SDK state.
//
// Example:
//
//	light.SetOff()
func (s *LightControl) SetOff() {
	s.writeState(map[string]any{LightPropertyOn: false})
}

// SetBrightness sets the brightness level (clamped to [0, 100]). Override
// (via embedding) to drive hardware and call the embedded LightControl's
// SetBrightness to sync the SDK state.
//
// Example:
//
//	light.SetBrightness(75)
func (s *LightControl) SetBrightness(value int) {
	if value < 0 {
		value = 0
	}
	if value > 100 {
		value = 100
	}
	s.writeState(map[string]any{LightPropertyBrightness: value})
}

// UpdateValue routes generic property writes to the semantic setters.
// Only on and brightness are externally writable.
func (s *LightControl) UpdateValue(property string, value any) error {
	setters := outerOr[lightSetters](&s.BaseSensor, s)
	switch property {
	case LightPropertyOn:
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
	case LightPropertyBrightness:
		if v, ok := toInt64(value); ok {
			setters.SetBrightness(int(v))
		}
	}
	return nil
}
