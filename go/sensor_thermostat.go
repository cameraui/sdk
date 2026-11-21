package sdk

// ThermostatMode is what a thermostat is set to do.
type ThermostatMode = string

// Modes of a thermostat.
const (
	ThermostatModeOff      ThermostatMode = "off"
	ThermostatModeHeat     ThermostatMode = "heat"
	ThermostatModeCool     ThermostatMode = "cool"
	ThermostatModeHeatCool ThermostatMode = "heat_cool" // Heats and cools to stay inside a target range
	ThermostatModeAuto     ThermostatMode = "auto"      // The device decides by its own schedule or logic
	ThermostatModeDry      ThermostatMode = "dry"
	ThermostatModeFanOnly  ThermostatMode = "fan_only"
)

// ThermostatAction is what a thermostat does right now.
type ThermostatAction = string

// Actions of a thermostat.
const (
	ThermostatActionOff        ThermostatAction = "off"
	ThermostatActionIdle       ThermostatAction = "idle"
	ThermostatActionHeating    ThermostatAction = "heating"
	ThermostatActionCooling    ThermostatAction = "cooling"
	ThermostatActionDrying     ThermostatAction = "drying"
	ThermostatActionFan        ThermostatAction = "fan"
	ThermostatActionPreheating ThermostatAction = "preheating"
	ThermostatActionDefrosting ThermostatAction = "defrosting"
)

// Optional capabilities of a thermostat.
const (
	ThermostatCapabilityRange    = "range"    // Thermostat keeps the temperature inside a range, in heat_cool mode
	ThermostatCapabilityAction   = "action"   // Thermostat reports what it does right now
	ThermostatCapabilityHumidity = "humidity" // Thermostat reports the humidity
	ThermostatCapabilityPreset   = "preset"   // Thermostat has presets, such as eco or away
	ThermostatCapabilityFanMode  = "fanMode"  // Thermostat has fan modes
)

// ThermostatProperty is a property name of a thermostat. Temperatures are in °C.
type ThermostatProperty = string

// Property names of a thermostat.
const (
	ThermostatPropertyCurrentTemperature    ThermostatProperty = "currentTemperature"    // Current temperature
	ThermostatPropertyTargetTemperature     ThermostatProperty = "targetTemperature"     // Temperature the thermostat heats or cools to
	ThermostatPropertyTargetTemperatureLow  ThermostatProperty = "targetTemperatureLow"  // Lower end of the target range
	ThermostatPropertyTargetTemperatureHigh ThermostatProperty = "targetTemperatureHigh" // Upper end of the target range
	ThermostatPropertyMode                  ThermostatProperty = "mode"                  // Mode, a ThermostatMode
	ThermostatPropertyAction                ThermostatProperty = "action"                // What the thermostat does right now, a ThermostatAction
	ThermostatPropertyCurrentHumidity       ThermostatProperty = "currentHumidity"       // Current humidity in percent
	ThermostatPropertyPreset                ThermostatProperty = "preset"                // Active preset, one of the choices the device offers
	ThermostatPropertyFanMode               ThermostatProperty = "fanMode"               // Active fan mode, one of the choices the device offers
)

type thermostatSetters interface {
	SetTargetTemperature(value float64)
	SetTargetTemperatureLow(value float64)
	SetTargetTemperatureHigh(value float64)
	SetMode(value ThermostatMode)
	SetPreset(value string)
	SetFanMode(value string)
}

// ThermostatControl is a thermostat or air conditioner. Temperatures are in
// °C, a plugin converts from the device's unit. Override SetTargetTemperature,
// SetMode and the other commands (by embedding ThermostatControl in your own
// type and shadowing the methods) to drive hardware, then call the embedded
// ThermostatControl's methods to sync the SDK state. Report readings with
// SetCurrentTemperature, SetAction and SetCurrentHumidity.
//
// Narrow the modes to those the device has with
// SetPropertySpec(ThermostatPropertyMode, &PropertySpecOverride{Values: ...}),
// and its temperature range with Min, Max and Step on the target properties.
// Presets and fan modes are the device's own, set them as Choices.
type ThermostatControl struct{ BaseSensor }

// NewThermostatControl creates a thermostat with the given name and options.
func NewThermostatControl(name string, opts ...SensorOption) *ThermostatControl {
	s := &ThermostatControl{BaseSensor: NewBaseSensor(name, opts...)}
	s.writeState(map[string]any{
		ThermostatPropertyTargetTemperature:     20.0,
		ThermostatPropertyTargetTemperatureLow:  18.0,
		ThermostatPropertyTargetTemperatureHigh: 24.0,
		ThermostatPropertyMode:                  ThermostatModeOff,
	})
	return s
}

func (s *ThermostatControl) GetType() SensorType         { return SensorTypeThermostat }
func (s *ThermostatControl) GetCategory() SensorCategory { return SensorCategoryControl }
func (s *ThermostatControl) ToJSON() sensorJSON          { return s.toBaseJSON(s.GetType(), s.GetCategory()) }

// GetCurrentTemperature returns the current temperature in °C, false before the first reading.
func (s *ThermostatControl) GetCurrentTemperature() (float64, bool) {
	v, ok := s.GetValue(ThermostatPropertyCurrentTemperature).(float64)
	return v, ok
}

// GetTargetTemperature returns the target temperature in °C.
func (s *ThermostatControl) GetTargetTemperature() float64 {
	v, _ := s.GetValue(ThermostatPropertyTargetTemperature).(float64)
	return v
}

// GetTargetTemperatureLow returns the lower end of the target range in °C.
func (s *ThermostatControl) GetTargetTemperatureLow() float64 {
	v, _ := s.GetValue(ThermostatPropertyTargetTemperatureLow).(float64)
	return v
}

// GetTargetTemperatureHigh returns the upper end of the target range in °C.
func (s *ThermostatControl) GetTargetTemperatureHigh() float64 {
	v, _ := s.GetValue(ThermostatPropertyTargetTemperatureHigh).(float64)
	return v
}

// GetMode returns the mode.
func (s *ThermostatControl) GetMode() ThermostatMode {
	v, _ := s.GetValue(ThermostatPropertyMode).(string)
	return v
}

// GetAction returns what the thermostat does right now, empty before the first report.
func (s *ThermostatControl) GetAction() ThermostatAction {
	v, _ := s.GetValue(ThermostatPropertyAction).(string)
	return v
}

// GetCurrentHumidity returns the current humidity in percent, false before the first reading.
func (s *ThermostatControl) GetCurrentHumidity() (float64, bool) {
	v, ok := s.GetValue(ThermostatPropertyCurrentHumidity).(float64)
	return v, ok
}

// GetPreset returns the active preset.
func (s *ThermostatControl) GetPreset() string {
	v, _ := s.GetValue(ThermostatPropertyPreset).(string)
	return v
}

// GetFanMode returns the active fan mode.
func (s *ThermostatControl) GetFanMode() string {
	v, _ := s.GetValue(ThermostatPropertyFanMode).(string)
	return v
}

// SetTargetTemperature sets the target temperature in °C.
//
// Example:
//
//	thermostat.SetTargetTemperature(21.5)
func (s *ThermostatControl) SetTargetTemperature(value float64) {
	s.writeState(map[string]any{ThermostatPropertyTargetTemperature: value})
}

// SetTargetTemperatureLow sets the lower end of the target range in °C.
//
// Example:
//
//	thermostat.SetTargetTemperatureLow(19)
func (s *ThermostatControl) SetTargetTemperatureLow(value float64) {
	s.writeState(map[string]any{ThermostatPropertyTargetTemperatureLow: value})
}

// SetTargetTemperatureHigh sets the upper end of the target range in °C.
//
// Example:
//
//	thermostat.SetTargetTemperatureHigh(24)
func (s *ThermostatControl) SetTargetTemperatureHigh(value float64) {
	s.writeState(map[string]any{ThermostatPropertyTargetTemperatureHigh: value})
}

// SetMode sets the mode.
//
// Example:
//
//	thermostat.SetMode(ThermostatModeHeat)
func (s *ThermostatControl) SetMode(value ThermostatMode) {
	s.writeState(map[string]any{ThermostatPropertyMode: value})
}

// SetPreset sets the preset, one of the preset choices.
//
// Example:
//
//	thermostat.SetPreset("eco")
func (s *ThermostatControl) SetPreset(value string) {
	s.writeState(map[string]any{ThermostatPropertyPreset: value})
}

// SetFanMode sets the fan mode, one of the fan mode choices.
//
// Example:
//
//	thermostat.SetFanMode("low")
func (s *ThermostatControl) SetFanMode(value string) {
	s.writeState(map[string]any{ThermostatPropertyFanMode: value})
}

// SetCurrentTemperature reports the current temperature in °C.
//
// Example:
//
//	thermostat.SetCurrentTemperature(20.4)
func (s *ThermostatControl) SetCurrentTemperature(value float64) {
	s.writeState(map[string]any{ThermostatPropertyCurrentTemperature: value})
}

// SetAction reports what the thermostat does right now.
//
// Example:
//
//	thermostat.SetAction(ThermostatActionHeating)
func (s *ThermostatControl) SetAction(value ThermostatAction) {
	s.writeState(map[string]any{ThermostatPropertyAction: value})
}

// SetCurrentHumidity reports the current humidity in percent.
//
// Example:
//
//	thermostat.SetCurrentHumidity(45)
func (s *ThermostatControl) SetCurrentHumidity(value float64) {
	s.writeState(map[string]any{ThermostatPropertyCurrentHumidity: max(0, min(100, value))})
}

// UpdateValue routes generic property writes to the semantic setters.
func (s *ThermostatControl) UpdateValue(property string, value any) error {
	setters := outerOr[thermostatSetters](&s.BaseSensor, s)
	switch property {
	case ThermostatPropertyTargetTemperature:
		if v, ok := toFloat64(value); ok {
			setters.SetTargetTemperature(v)
		}
	case ThermostatPropertyTargetTemperatureLow:
		if v, ok := toFloat64(value); ok {
			setters.SetTargetTemperatureLow(v)
		}
	case ThermostatPropertyTargetTemperatureHigh:
		if v, ok := toFloat64(value); ok {
			setters.SetTargetTemperatureHigh(v)
		}
	case ThermostatPropertyMode:
		if v, ok := value.(string); ok {
			setters.SetMode(v)
		}
	case ThermostatPropertyPreset:
		if v, ok := value.(string); ok {
			setters.SetPreset(v)
		}
	case ThermostatPropertyFanMode:
		if v, ok := value.(string); ok {
			setters.SetFanMode(v)
		}
	}
	return nil
}
