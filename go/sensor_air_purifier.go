package sdk

import "math"

// AirPurifierState is what an air purifier does right now.
type AirPurifierState = string

// States of an air purifier.
const (
	AirPurifierStateInactive  AirPurifierState = "inactive"
	AirPurifierStateIdle      AirPurifierState = "idle"
	AirPurifierStatePurifying AirPurifierState = "purifying"
)

// Optional capabilities of an air purifier.
const (
	AirPurifierCapabilityState     = "state"     // Purifier reports whether it is purifying or idle while it is on
	AirPurifierCapabilitySpeed     = "speed"     // Purifier runs at a set speed
	AirPurifierCapabilityAuto      = "auto"      // Purifier has an automatic mode
	AirPurifierCapabilityPreset    = "preset"    // Purifier offers presets such as sleep or turbo
	AirPurifierCapabilityChildLock = "childLock" // Purifier locks its buttons against children
	AirPurifierCapabilityFilter    = "filter"    // Purifier reports the state of its filter
)

// AirPurifierProperty is a property name of an air purifier.
type AirPurifierProperty = string

// Property names of an air purifier.
const (
	AirPurifierPropertyOn           AirPurifierProperty = "on"           // True while the purifier is on, a command when written
	AirPurifierPropertyState        AirPurifierProperty = "state"        // What the purifier does right now, an AirPurifierState
	AirPurifierPropertySpeed        AirPurifierProperty = "speed"        // Speed in percent
	AirPurifierPropertyAuto         AirPurifierProperty = "auto"         // True while the purifier runs in its automatic mode
	AirPurifierPropertyPreset       AirPurifierProperty = "preset"       // Active preset, one of the choices the plugin sets
	AirPurifierPropertyChildLock    AirPurifierProperty = "childLock"    // True while the buttons on the purifier are locked
	AirPurifierPropertyFilterLife   AirPurifierProperty = "filterLife"   // Filter life left in percent
	AirPurifierPropertyFilterChange AirPurifierProperty = "filterChange" // True when the filter needs a change
)

type airPurifierSetters interface {
	SetOn() error
	SetOff() error
	SetSpeed(speed int) error
	SetAuto(auto bool) error
	SetPreset(value string) error
	SetChildLock(locked bool) error
}

// AirPurifierControl is an air purifier. Override SetOn, SetOff, SetSpeed,
// SetAuto, SetPreset and SetChildLock (by embedding AirPurifierControl in your
// own type and shadowing the methods) to drive hardware, then call the
// embedded AirPurifierControl's methods to sync the SDK state. Report what the
// purifier does and how its filter is with SetState, SetFilterLife and
// SetFilterChange.
//
// Each optional part comes with its AirPurifierCapability constant. The
// presets it offers come as choices:
// SetPropertySpec(AirPurifierPropertyPreset, &PropertySpecOverride{Choices: ...}).
//
// When the device refuses a command, return an error from the override instead of
// calling the embedded method: the write fails for whoever sent it and the state
// stays as it was.
type AirPurifierControl struct{ BaseSensor }

// NewAirPurifierControl creates an air purifier with the given name and options.
func NewAirPurifierControl(name string, opts ...SensorOption) *AirPurifierControl {
	s := &AirPurifierControl{BaseSensor: NewBaseSensor(name, opts...)}
	s.writeState(map[string]any{
		AirPurifierPropertyOn:           false,
		AirPurifierPropertySpeed:        100,
		AirPurifierPropertyAuto:         false,
		AirPurifierPropertyChildLock:    false,
		AirPurifierPropertyFilterChange: false,
	})
	s.handleWrites(s)
	return s
}

func (s *AirPurifierControl) GetType() SensorType         { return SensorTypeAirPurifier }
func (s *AirPurifierControl) GetCategory() SensorCategory { return SensorCategoryControl }
func (s *AirPurifierControl) ToJSON() sensorJSON          { return s.toBaseJSON(s.GetType(), s.GetCategory()) }

// IsOn reports true while the purifier is on.
func (s *AirPurifierControl) IsOn() bool {
	v, _ := s.GetValue(AirPurifierPropertyOn).(bool)
	return v
}

// GetState returns what the purifier does right now, empty before the first report.
func (s *AirPurifierControl) GetState() AirPurifierState {
	v, _ := s.GetValue(AirPurifierPropertyState).(string)
	return v
}

// GetSpeed returns the speed in percent.
func (s *AirPurifierControl) GetSpeed() int {
	v, _ := s.GetValue(AirPurifierPropertySpeed).(int)
	return v
}

// IsAuto reports true while the purifier runs in its automatic mode.
func (s *AirPurifierControl) IsAuto() bool {
	v, _ := s.GetValue(AirPurifierPropertyAuto).(bool)
	return v
}

// GetPreset returns the active preset.
func (s *AirPurifierControl) GetPreset() string {
	v, _ := s.GetValue(AirPurifierPropertyPreset).(string)
	return v
}

// IsChildLocked reports true while the buttons on the purifier are locked.
func (s *AirPurifierControl) IsChildLocked() bool {
	v, _ := s.GetValue(AirPurifierPropertyChildLock).(bool)
	return v
}

// GetFilterLife returns the filter life left in percent, false before the first report.
func (s *AirPurifierControl) GetFilterLife() (int, bool) {
	v, ok := s.GetValue(AirPurifierPropertyFilterLife).(int)
	return v, ok
}

// NeedsFilterChange reports true when the filter needs a change.
func (s *AirPurifierControl) NeedsFilterChange() bool {
	v, _ := s.GetValue(AirPurifierPropertyFilterChange).(bool)
	return v
}

// SetOn turns the purifier on.
//
// Example:
//
//	purifier.SetOn()
func (s *AirPurifierControl) SetOn() error {
	s.writeState(map[string]any{AirPurifierPropertyOn: true})
	return nil
}

// SetOff turns the purifier off.
//
// Example:
//
//	purifier.SetOff()
func (s *AirPurifierControl) SetOff() error {
	s.writeState(map[string]any{AirPurifierPropertyOn: false})
	return nil
}

// SetSpeed sets the speed, 0 to 100 percent.
//
// Example:
//
//	purifier.SetSpeed(60)
func (s *AirPurifierControl) SetSpeed(speed int) error {
	s.writeState(map[string]any{AirPurifierPropertySpeed: max(0, min(100, speed))})
	return nil
}

// SetAuto switches the automatic mode on, or back to a set speed with false.
//
// Example:
//
//	purifier.SetAuto(true)
func (s *AirPurifierControl) SetAuto(auto bool) error {
	s.writeState(map[string]any{AirPurifierPropertyAuto: auto})
	return nil
}

// SetPreset sets the preset, one of the preset choices.
//
// Example:
//
//	purifier.SetPreset("sleep")
func (s *AirPurifierControl) SetPreset(value string) error {
	s.writeState(map[string]any{AirPurifierPropertyPreset: value})
	return nil
}

// SetChildLock locks the buttons on the purifier, or unlocks them with false.
//
// Example:
//
//	purifier.SetChildLock(true)
func (s *AirPurifierControl) SetChildLock(locked bool) error {
	s.writeState(map[string]any{AirPurifierPropertyChildLock: locked})
	return nil
}

// SetState reports what the purifier does right now: inactive, idle or purifying.
//
// Example:
//
//	purifier.SetState(AirPurifierStateIdle)
func (s *AirPurifierControl) SetState(value AirPurifierState) {
	s.writeState(map[string]any{AirPurifierPropertyState: value})
}

// SetFilterLife reports how much filter life is left, 0 to 100 percent.
//
// Example:
//
//	purifier.SetFilterLife(35)
func (s *AirPurifierControl) SetFilterLife(percent float64) {
	if math.IsNaN(percent) || math.IsInf(percent, 0) {
		return
	}
	s.writeState(map[string]any{AirPurifierPropertyFilterLife: int(math.Round(max(0, min(100, percent))))})
}

// SetFilterChange reports whether the filter needs a change.
//
// Example:
//
//	purifier.SetFilterChange(true)
func (s *AirPurifierControl) SetFilterChange(change bool) {
	s.writeState(map[string]any{AirPurifierPropertyFilterChange: change})
}

func (s *AirPurifierControl) applyValue(property string, value any) error {
	setters := outerOr[airPurifierSetters](&s.BaseSensor, s)
	switch property {
	case AirPurifierPropertyOn:
		if isTruthy(value) {
			if err := setters.SetOn(); err != nil {
				return err
			}
		} else {
			if err := setters.SetOff(); err != nil {
				return err
			}
		}
	case AirPurifierPropertySpeed:
		if v, ok := toFloat64(value); ok {
			if err := setters.SetSpeed(int(math.Round(v))); err != nil {
				return err
			}
		}
	case AirPurifierPropertyAuto:
		if err := setters.SetAuto(isTruthy(value)); err != nil {
			return err
		}
	case AirPurifierPropertyPreset:
		if v, ok := value.(string); ok {
			if err := setters.SetPreset(v); err != nil {
				return err
			}
		}
	case AirPurifierPropertyChildLock:
		if err := setters.SetChildLock(isTruthy(value)); err != nil {
			return err
		}
	}
	return nil
}
