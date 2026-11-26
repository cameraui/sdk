package sdk

import "math"

// WaterHeaterMode is the operating mode of a water heater.
type WaterHeaterMode = string

// Modes of a water heater.
const (
	WaterHeaterModeOff         WaterHeaterMode = "off"         // Water heater is off
	WaterHeaterModeEco         WaterHeaterMode = "eco"         // Energy-saving mode
	WaterHeaterModeElectric    WaterHeaterMode = "electric"    // Heats with electricity only
	WaterHeaterModeGas         WaterHeaterMode = "gas"         // Heats with gas only
	WaterHeaterModeHeatPump    WaterHeaterMode = "heat_pump"   // Heats with the heat pump only
	WaterHeaterModeHighDemand  WaterHeaterMode = "high_demand" // Heats more to keep up with a high demand for hot water
	WaterHeaterModePerformance WaterHeaterMode = "performance" // Heats as fast as it can
	WaterHeaterModeAuto        WaterHeaterMode = "auto"        // The device decides by its own schedule or logic
	WaterHeaterModeHeat        WaterHeaterMode = "heat"        // Heats the water
	WaterHeaterModeOn          WaterHeaterMode = "on"          // Running in a mode without a name of its own
)

// Optional capabilities of a water heater.
const (
	WaterHeaterCapabilityAway = "away" // Water heater has an away mode that saves energy while nobody is home
)

// WaterHeaterProperty is a property name of a water heater.
type WaterHeaterProperty = string

// Property names of a water heater.
const (
	WaterHeaterPropertyCurrentTemperature WaterHeaterProperty = "currentTemperature" // Current water temperature in °C
	WaterHeaterPropertyTargetTemperature  WaterHeaterProperty = "targetTemperature"  // Target water temperature in °C
	WaterHeaterPropertyMode               WaterHeaterProperty = "mode"               // Operating mode, a WaterHeaterMode, a command when written
	WaterHeaterPropertyAway               WaterHeaterProperty = "away"               // True while the away mode is on
)

type waterHeaterSetters interface {
	SetMode(value WaterHeaterMode) error
	SetTargetTemperature(value float64) error
	SetAway(away bool) error
}

// WaterHeaterControl is a water heater or boiler that keeps its water at a
// target temperature. Override SetMode, SetTargetTemperature and SetAway (by
// embedding WaterHeaterControl in your own type and shadowing the methods) to
// drive hardware, then call the embedded WaterHeaterControl's methods to sync
// the SDK state. Report the water temperature with SetCurrentTemperature.
//
// Narrow the modes to those the device has with
// SetPropertySpec(WaterHeaterPropertyMode, &PropertySpecOverride{Values: ...}),
// and its temperature range with Min, Max and Step on the target temperature.
// Temperatures are always in °C.
//
// When the device refuses a command, return an error from the override instead of
// calling the embedded method: the write fails for whoever sent it and the state
// stays as it was.
type WaterHeaterControl struct{ BaseSensor }

// NewWaterHeaterControl creates a water heater with the given name and options.
func NewWaterHeaterControl(name string, opts ...SensorOption) *WaterHeaterControl {
	s := &WaterHeaterControl{BaseSensor: NewBaseSensor(name, opts...)}
	s.writeState(map[string]any{
		WaterHeaterPropertyTargetTemperature: 50.0,
		WaterHeaterPropertyMode:              WaterHeaterModeOff,
		WaterHeaterPropertyAway:              false,
	})
	s.handleWrites(s)
	return s
}

func (s *WaterHeaterControl) GetType() SensorType         { return SensorTypeWaterHeater }
func (s *WaterHeaterControl) GetCategory() SensorCategory { return SensorCategoryControl }
func (s *WaterHeaterControl) ToJSON() sensorJSON          { return s.toBaseJSON(s.GetType(), s.GetCategory()) }

// GetCurrentTemperature returns the current water temperature in °C, false before the first reading.
func (s *WaterHeaterControl) GetCurrentTemperature() (float64, bool) {
	v, ok := s.GetValue(WaterHeaterPropertyCurrentTemperature).(float64)
	return v, ok
}

// GetTargetTemperature returns the target water temperature in °C.
func (s *WaterHeaterControl) GetTargetTemperature() float64 {
	v, _ := s.GetValue(WaterHeaterPropertyTargetTemperature).(float64)
	return v
}

// GetMode returns the operating mode, a WaterHeaterMode, a command when written.
func (s *WaterHeaterControl) GetMode() WaterHeaterMode {
	v, _ := s.GetValue(WaterHeaterPropertyMode).(string)
	return v
}

// IsAway reports true while the away mode is on.
func (s *WaterHeaterControl) IsAway() bool {
	v, _ := s.GetValue(WaterHeaterPropertyAway).(bool)
	return v
}

// SetMode sets the operating mode, one of the modes the water heater offers.
//
// Example:
//
//	boiler.SetMode(WaterHeaterModeEco)
func (s *WaterHeaterControl) SetMode(value WaterHeaterMode) error {
	s.writeState(map[string]any{WaterHeaterPropertyMode: value})
	return nil
}

// SetTargetTemperature sets the target temperature in °C.
//
// Example:
//
//	boiler.SetTargetTemperature(55)
func (s *WaterHeaterControl) SetTargetTemperature(value float64) error {
	s.writeState(map[string]any{WaterHeaterPropertyTargetTemperature: value})
	return nil
}

// SetAway switches the away mode on, or off with false.
//
// Example:
//
//	boiler.SetAway(true)
func (s *WaterHeaterControl) SetAway(away bool) error {
	s.writeState(map[string]any{WaterHeaterPropertyAway: away})
	return nil
}

// SetCurrentTemperature reports the current water temperature in °C.
//
// Example:
//
//	boiler.SetCurrentTemperature(48.5)
func (s *WaterHeaterControl) SetCurrentTemperature(value float64) {
	if math.IsNaN(value) || math.IsInf(value, 0) {
		return
	}
	s.writeState(map[string]any{WaterHeaterPropertyCurrentTemperature: value})
}

func (s *WaterHeaterControl) applyValue(property string, value any) error {
	setters := outerOr[waterHeaterSetters](&s.BaseSensor, s)
	switch property {
	case WaterHeaterPropertyMode:
		if v, ok := value.(string); ok {
			if err := setters.SetMode(v); err != nil {
				return err
			}
		}
	case WaterHeaterPropertyTargetTemperature:
		if v, ok := toFloat64(value); ok {
			if err := setters.SetTargetTemperature(v); err != nil {
				return err
			}
		}
	case WaterHeaterPropertyAway:
		if err := setters.SetAway(isTruthy(value)); err != nil {
			return err
		}
	}
	return nil
}
