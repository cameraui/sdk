package sdk

import "math"

// HumidifierKind says whether the device adds or removes moisture, it decides how smart homes show it.
type HumidifierKind = string

// Kinds of a humidifier.
const (
	HumidifierKindHumidifier   HumidifierKind = "humidifier"   // Adds moisture to the air
	HumidifierKindDehumidifier HumidifierKind = "dehumidifier" // Removes moisture from the air
)

// HumidifierAction is what a humidifier does right now.
type HumidifierAction = string

// Actions of a humidifier.
const (
	HumidifierActionOff         HumidifierAction = "off"         // Humidifier is off
	HumidifierActionIdle        HumidifierAction = "idle"        // Humidifier is on but not working right now
	HumidifierActionHumidifying HumidifierAction = "humidifying" // Humidifier adds moisture
	HumidifierActionDrying      HumidifierAction = "drying"      // Humidifier removes moisture
)

// Optional capabilities of a humidifier.
const (
	HumidifierCapabilityHumidity = "humidity" // Humidifier reports the humidity it measures
	HumidifierCapabilityAction   = "action"   // Humidifier reports whether it is working or idle
	HumidifierCapabilityMode     = "mode"     // Humidifier offers modes such as eco or sleep
)

// HumidifierProperty is a property name of a humidifier.
type HumidifierProperty = string

// Property names of a humidifier.
const (
	HumidifierPropertyOn              HumidifierProperty = "on"              // True while the humidifier is on, a command when written
	HumidifierPropertyTargetHumidity  HumidifierProperty = "targetHumidity"  // Target humidity in percent
	HumidifierPropertyCurrentHumidity HumidifierProperty = "currentHumidity" // Measured humidity in percent
	HumidifierPropertyAction          HumidifierProperty = "action"          // What the humidifier does right now, a HumidifierAction
	HumidifierPropertyMode            HumidifierProperty = "mode"            // Active mode, one of the choices the plugin sets
	HumidifierPropertyKind            HumidifierProperty = "kind"            // Whether it humidifies or dehumidifies, a HumidifierKind
)

type humidifierSetters interface {
	SetOn() error
	SetOff() error
	SetTargetHumidity(value int) error
	SetMode(value string) error
}

// HumidifierControl is a humidifier or dehumidifier that works toward a target
// humidity. Override SetOn, SetOff, SetTargetHumidity and SetMode (by embedding
// HumidifierControl in your own type and shadowing the methods) to drive
// hardware, then call the embedded HumidifierControl's methods to sync the SDK
// state. Report what the device measures and does with SetCurrentHumidity and
// SetAction.
//
// SetKind says whether it humidifies or dehumidifies. The modes it offers come
// as choices: SetPropertySpec(HumidifierPropertyMode, &PropertySpecOverride{Choices: ...}).
//
// When the device refuses a command, return an error from the override instead of
// calling the embedded method: the write fails for whoever sent it and the state
// stays as it was.
type HumidifierControl struct{ BaseSensor }

// NewHumidifierControl creates a humidifier with the given name and options.
func NewHumidifierControl(name string, opts ...SensorOption) *HumidifierControl {
	s := &HumidifierControl{BaseSensor: NewBaseSensor(name, opts...)}
	s.writeState(map[string]any{
		HumidifierPropertyOn:             false,
		HumidifierPropertyTargetHumidity: 50,
	})
	s.handleWrites(s)
	return s
}

func (s *HumidifierControl) GetType() SensorType         { return SensorTypeHumidifier }
func (s *HumidifierControl) GetCategory() SensorCategory { return SensorCategoryControl }
func (s *HumidifierControl) ToJSON() sensorJSON          { return s.toBaseJSON(s.GetType(), s.GetCategory()) }

// IsOn reports true while the humidifier is on, a command when written.
func (s *HumidifierControl) IsOn() bool {
	v, _ := s.GetValue(HumidifierPropertyOn).(bool)
	return v
}

// GetTargetHumidity returns the target humidity in percent.
func (s *HumidifierControl) GetTargetHumidity() int {
	v, _ := s.GetValue(HumidifierPropertyTargetHumidity).(int)
	return v
}

// GetCurrentHumidity returns the measured humidity in percent, false before the first reading.
func (s *HumidifierControl) GetCurrentHumidity() (float64, bool) {
	v, ok := s.GetValue(HumidifierPropertyCurrentHumidity).(float64)
	return v, ok
}

// GetAction returns what the humidifier does right now, a HumidifierAction, empty before the first report.
func (s *HumidifierControl) GetAction() HumidifierAction {
	v, _ := s.GetValue(HumidifierPropertyAction).(string)
	return v
}

// GetMode returns the active mode, one of the choices the plugin sets.
func (s *HumidifierControl) GetMode() string {
	v, _ := s.GetValue(HumidifierPropertyMode).(string)
	return v
}

// GetKind returns whether it humidifies or dehumidifies, a HumidifierKind, empty when the plugin did not say.
func (s *HumidifierControl) GetKind() HumidifierKind {
	v, _ := s.GetValue(HumidifierPropertyKind).(string)
	return v
}

// SetOn turns the humidifier on.
//
// Example:
//
//	humidifier.SetOn()
func (s *HumidifierControl) SetOn() error {
	s.writeState(map[string]any{HumidifierPropertyOn: true})
	return nil
}

// SetOff turns the humidifier off.
//
// Example:
//
//	humidifier.SetOff()
func (s *HumidifierControl) SetOff() error {
	s.writeState(map[string]any{HumidifierPropertyOn: false})
	return nil
}

// SetTargetHumidity sets the target humidity, 0 to 100 percent.
//
// Example:
//
//	humidifier.SetTargetHumidity(45)
func (s *HumidifierControl) SetTargetHumidity(value int) error {
	s.writeState(map[string]any{HumidifierPropertyTargetHumidity: max(0, min(100, value))})
	return nil
}

// SetMode sets the mode, one of the mode choices.
//
// Example:
//
//	humidifier.SetMode("sleep")
func (s *HumidifierControl) SetMode(value string) error {
	s.writeState(map[string]any{HumidifierPropertyMode: value})
	return nil
}

// SetCurrentHumidity reports the humidity the device measures, 0 to 100 percent.
//
// Example:
//
//	humidifier.SetCurrentHumidity(38)
func (s *HumidifierControl) SetCurrentHumidity(value float64) {
	if math.IsNaN(value) || math.IsInf(value, 0) {
		return
	}
	s.writeState(map[string]any{HumidifierPropertyCurrentHumidity: max(0, min(100, value))})
}

// SetAction reports what the humidifier does right now: off, idle, humidifying or drying.
//
// Example:
//
//	humidifier.SetAction(HumidifierActionHumidifying)
func (s *HumidifierControl) SetAction(value HumidifierAction) {
	s.writeState(map[string]any{HumidifierPropertyAction: value})
}

// SetKind says whether the device humidifies or dehumidifies. Smart homes show
// it by its kind, and Home Assistant takes it as the device class.
//
// Example:
//
//	humidifier.SetKind(HumidifierKindDehumidifier)
func (s *HumidifierControl) SetKind(kind HumidifierKind) {
	s.writeState(map[string]any{HumidifierPropertyKind: kind})
	s.SetPropertySpec(HumidifierPropertyKind, &PropertySpecOverride{Values: []any{kind}})
}

func (s *HumidifierControl) applyValue(property string, value any) error {
	setters := outerOr[humidifierSetters](&s.BaseSensor, s)
	switch property {
	case HumidifierPropertyOn:
		if isTruthy(value) {
			if err := setters.SetOn(); err != nil {
				return err
			}
		} else {
			if err := setters.SetOff(); err != nil {
				return err
			}
		}
	case HumidifierPropertyTargetHumidity:
		if v, ok := toFloat64(value); ok {
			if err := setters.SetTargetHumidity(int(math.Round(v))); err != nil {
				return err
			}
		}
	case HumidifierPropertyMode:
		if v, ok := value.(string); ok {
			if err := setters.SetMode(v); err != nil {
				return err
			}
		}
	}
	return nil
}
