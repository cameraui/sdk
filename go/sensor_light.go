package sdk

// Optional capabilities of a light control.
const (
	LightCapabilityBrightness       = "brightness"       // Light supports brightness adjustment (0-100)
	LightCapabilityColorTemperature = "colorTemperature" // Light supports a white color temperature, in Kelvin
	LightCapabilityColor            = "color"            // Light supports a color, as hue and saturation
)

// LightProperty is a property name of a light control.
type LightProperty = string

// Property names of a light control.
const (
	LightPropertyOn               LightProperty = "on"               // Whether the light is on
	LightPropertyBrightness       LightProperty = "brightness"       // Brightness level (0-100)
	LightPropertyColorTemperature LightProperty = "colorTemperature" // White color temperature in Kelvin
	LightPropertyColor            LightProperty = "color"            // Color as hue and saturation, see LightColor
	LightPropertyColorMode        LightProperty = "colorMode"        // Whether the light shows its color temperature or its color
)

// LightColorMode says which of its two color settings a light shows.
type LightColorMode = string

// Color modes of a light.
const (
	LightColorModeTemperature LightColorMode = "temperature" // The white color temperature
	LightColorModeColor       LightColorMode = "color"       // The color from hue and saturation
)

// LightColor is the color of a light.
type LightColor struct {
	// Hue in degrees (0-360).
	Hue float64 `msgpack:"hue" json:"hue"`
	// Saturation in percent (0-100).
	Saturation float64 `msgpack:"saturation" json:"saturation"`
}

type lightSetters interface {
	SetOn()
	SetOff()
	SetBrightness(value int)
	SetColorTemperature(kelvin int)
	SetColor(hue, saturation float64)
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
//
// A light with LightCapabilityColorTemperature or LightCapabilityColor
// overrides SetColorTemperature and SetColor the same way. A command switches
// the color mode to the setting it changed. When the device reports its state,
// sync both settings and call SetColorMode with the one it shows.
type LightControl struct{ BaseSensor }

// NewLightControl creates a light control with the given name and options.
func NewLightControl(name string, opts ...SensorOption) *LightControl {
	s := &LightControl{BaseSensor: NewBaseSensor(name, opts...)}
	s.writeState(map[string]any{
		LightPropertyOn:               false,
		LightPropertyBrightness:       100,
		LightPropertyColorTemperature: 2700,
		LightPropertyColor:            LightColor{},
		LightPropertyColorMode:        LightColorModeTemperature,
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

// GetColorTemperature returns the white color temperature in Kelvin.
func (s *LightControl) GetColorTemperature() int {
	if v, ok := s.GetValue(LightPropertyColorTemperature).(int); ok {
		return v
	}
	return 0
}

// GetColor returns the color as hue and saturation.
func (s *LightControl) GetColor() LightColor {
	if v, ok := s.GetValue(LightPropertyColor).(LightColor); ok {
		return v
	}
	return LightColor{}
}

// GetColorMode returns whether the light shows its color temperature or its color.
func (s *LightControl) GetColorMode() LightColorMode {
	if v, ok := s.GetValue(LightPropertyColorMode).(string); ok {
		return v
	}
	return LightColorModeTemperature
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

// SetColorTemperature sets the white color temperature in Kelvin (clamped to
// [1000, 10000]). Override (via embedding) to drive hardware and call the
// embedded LightControl's SetColorTemperature to sync the SDK state.
//
// Example:
//
//	light.SetColorTemperature(2700)
func (s *LightControl) SetColorTemperature(kelvin int) {
	s.writeState(map[string]any{LightPropertyColorTemperature: min(max(kelvin, 1000), 10000)})
}

// SetColor sets the color (hue clamped to [0, 360], saturation to [0, 100]).
// Override (via embedding) to drive hardware and call the embedded
// LightControl's SetColor to sync the SDK state.
//
// Example:
//
//	light.SetColor(240, 100)
func (s *LightControl) SetColor(hue, saturation float64) {
	s.writeState(map[string]any{LightPropertyColor: LightColor{Hue: min(max(hue, 0), 360), Saturation: min(max(saturation, 0), 100)}})
}

// SetColorMode reports which of its two color settings the light shows.
//
// Example:
//
//	light.SetColorMode(sdk.LightColorModeColor)
func (s *LightControl) SetColorMode(mode LightColorMode) {
	s.writeState(map[string]any{LightPropertyColorMode: mode})
}

// UpdateValue routes generic property writes to the semantic setters.
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
	case LightPropertyColorTemperature:
		if v, ok := toInt64(value); ok {
			setters.SetColorTemperature(int(v))
			s.SetColorMode(LightColorModeTemperature)
		}
	case LightPropertyColor:
		if color, ok := coerceViaRoundTrip[LightColor](value).(LightColor); ok {
			setters.SetColor(color.Hue, color.Saturation)
			s.SetColorMode(LightColorModeColor)
		}
	}
	return nil
}
