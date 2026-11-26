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
	LightPropertyColorMode        LightProperty = "colorMode"        // Whether the light shows its color temperature or its color, see LightColorMode
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
	SetOn() error
	SetOff() error
	SetBrightness(value int) error
	SetColorTemperature(kelvin int) error
	SetColor(hue, saturation float64) error
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
//
// When the device refuses a command, return an error from the override instead of
// calling the embedded method: the write fails for whoever sent it and the state
// stays as it was.
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
	s.handleWrites(s)
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

// GetColor returns the color as hue and saturation, see LightColor.
func (s *LightControl) GetColor() LightColor {
	if v, ok := s.GetValue(LightPropertyColor).(LightColor); ok {
		return v
	}
	return LightColor{}
}

// GetColorMode returns whether the light shows its color temperature or its color, see LightColorMode.
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
func (s *LightControl) SetOn() error {
	s.writeState(map[string]any{LightPropertyOn: true})
	return nil
}

// SetOff turns the light off. Override (via embedding) to drive hardware and
// call the embedded LightControl's SetOff to sync the SDK state.
//
// Example:
//
//	light.SetOff()
func (s *LightControl) SetOff() error {
	s.writeState(map[string]any{LightPropertyOn: false})
	return nil
}

// SetBrightness sets the brightness level (clamped to [0, 100]). Override
// (via embedding) to drive hardware and call the embedded LightControl's
// SetBrightness to sync the SDK state.
//
// Example:
//
//	light.SetBrightness(75)
func (s *LightControl) SetBrightness(value int) error {
	if value < 0 {
		value = 0
	}
	if value > 100 {
		value = 100
	}
	s.writeState(map[string]any{LightPropertyBrightness: value})
	return nil
}

// SetColorTemperature sets the white color temperature in Kelvin (clamped to
// [1000, 10000]). Override (via embedding) to drive hardware and call the
// embedded LightControl's SetColorTemperature to sync the SDK state.
//
// Example:
//
//	light.SetColorTemperature(2700)
func (s *LightControl) SetColorTemperature(kelvin int) error {
	s.writeState(map[string]any{LightPropertyColorTemperature: min(max(kelvin, 1000), 10000)})
	return nil
}

// SetColor sets the color (hue clamped to [0, 360], saturation to [0, 100]).
// Override (via embedding) to drive hardware and call the embedded
// LightControl's SetColor to sync the SDK state.
//
// Example:
//
//	light.SetColor(240, 100)
func (s *LightControl) SetColor(hue, saturation float64) error {
	s.writeState(map[string]any{LightPropertyColor: LightColor{Hue: min(max(hue, 0), 360), Saturation: min(max(saturation, 0), 100)}})
	return nil
}

// SetColorMode reports which of its two color settings the light shows.
//
// Example:
//
//	light.SetColorMode(sdk.LightColorModeColor)
func (s *LightControl) SetColorMode(mode LightColorMode) {
	s.writeState(map[string]any{LightPropertyColorMode: mode})
}

func (s *LightControl) applyValue(property string, value any) error {
	setters := outerOr[lightSetters](&s.BaseSensor, s)
	switch property {
	case LightPropertyOn:
		if isTruthy(value) {
			if err := setters.SetOn(); err != nil {
				return err
			}
		} else {
			if err := setters.SetOff(); err != nil {
				return err
			}
		}
	case LightPropertyBrightness:
		if v, ok := toInt64(value); ok {
			if err := setters.SetBrightness(int(v)); err != nil {
				return err
			}
		}
	case LightPropertyColorTemperature:
		if v, ok := toInt64(value); ok {
			if err := setters.SetColorTemperature(int(v)); err != nil {
				return err
			}
			s.SetColorMode(LightColorModeTemperature)
		}
	case LightPropertyColor:
		if color, ok := coerceViaRoundTrip[LightColor](value).(LightColor); ok {
			if err := setters.SetColor(color.Hue, color.Saturation); err != nil {
				return err
			}
			s.SetColorMode(LightColorModeColor)
		}
	}
	return nil
}
