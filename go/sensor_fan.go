package sdk

import "math"

// FanDirection is the direction a fan turns.
type FanDirection = string

// Directions of a fan.
const (
	FanDirectionForward FanDirection = "forward" // Fan turns in its normal direction
	FanDirectionReverse FanDirection = "reverse" // Fan turns the other way
)

// Optional capabilities of a fan.
const (
	FanCapabilitySpeed       = "speed"       // Fan runs at a speed between 0 and 100 percent
	FanCapabilityDirection   = "direction"   // Fan turns forward or in reverse
	FanCapabilityOscillation = "oscillation" // Fan swings from side to side
	FanCapabilityPreset      = "preset"      // Fan has presets, such as sleep or breeze
)

// FanProperty is a property name of a fan.
type FanProperty = string

// Property names of a fan.
const (
	FanPropertyOn          FanProperty = "on"          // Whether the fan runs
	FanPropertySpeed       FanProperty = "speed"       // Speed, 0 to 100 percent
	FanPropertyDirection   FanProperty = "direction"   // Direction, a FanDirection
	FanPropertyOscillating FanProperty = "oscillating" // Whether the fan swings from side to side
	FanPropertyPreset      FanProperty = "preset"      // Active preset, one of the choices the device offers
)

type fanSetters interface {
	SetOn() error
	SetOff() error
	SetSpeed(speed int) error
	SetDirection(direction FanDirection) error
	SetOscillating(value bool) error
	SetPreset(value string) error
}

// FanControl is a ceiling, desk or other fan. Override SetOn, SetOff, SetSpeed
// and the other commands (by embedding FanControl in your own type and
// shadowing the methods) to drive hardware, then call the embedded
// FanControl's methods to sync the SDK state.
//
// A fan with speeds adds FanCapabilitySpeed, one that turns both ways
// FanCapabilityDirection, one that swings FanCapabilityOscillation. Presets are
// the device's own, add FanCapabilityPreset and set them as Choices. A fan with
// a few fixed speeds sets the speed's Step, three speeds are a step of 33.
//
// When the device refuses a command, return an error from the override instead of
// calling the embedded method: the write fails for whoever sent it and the state
// stays as it was.
type FanControl struct{ BaseSensor }

// NewFanControl creates a fan with the given name and options.
func NewFanControl(name string, opts ...SensorOption) *FanControl {
	s := &FanControl{BaseSensor: NewBaseSensor(name, opts...)}
	s.writeState(map[string]any{
		FanPropertyOn:          false,
		FanPropertySpeed:       100,
		FanPropertyDirection:   FanDirectionForward,
		FanPropertyOscillating: false,
	})
	s.handleWrites(s)
	return s
}

func (s *FanControl) GetType() SensorType         { return SensorTypeFan }
func (s *FanControl) GetCategory() SensorCategory { return SensorCategoryControl }
func (s *FanControl) ToJSON() sensorJSON          { return s.toBaseJSON(s.GetType(), s.GetCategory()) }

// IsOn reports whether the fan runs.
func (s *FanControl) IsOn() bool {
	v, _ := s.GetValue(FanPropertyOn).(bool)
	return v
}

// GetSpeed returns the speed, 0 to 100 percent.
func (s *FanControl) GetSpeed() int {
	v, _ := s.GetValue(FanPropertySpeed).(int)
	return v
}

// GetDirection returns the direction, a FanDirection.
func (s *FanControl) GetDirection() FanDirection {
	if v, ok := s.GetValue(FanPropertyDirection).(string); ok {
		return v
	}
	return FanDirectionForward
}

// IsOscillating reports whether the fan swings from side to side.
func (s *FanControl) IsOscillating() bool {
	v, _ := s.GetValue(FanPropertyOscillating).(bool)
	return v
}

// GetPreset returns the active preset, one of the choices the device offers.
func (s *FanControl) GetPreset() string {
	v, _ := s.GetValue(FanPropertyPreset).(string)
	return v
}

// SetOn turns the fan on.
//
// Example:
//
//	fan.SetOn()
func (s *FanControl) SetOn() error {
	s.writeState(map[string]any{FanPropertyOn: true})
	return nil
}

// SetOff turns the fan off.
//
// Example:
//
//	fan.SetOff()
func (s *FanControl) SetOff() error {
	s.writeState(map[string]any{FanPropertyOn: false})
	return nil
}

// SetSpeed sets the speed, 0 to 100 percent.
//
// Example:
//
//	fan.SetSpeed(66)
func (s *FanControl) SetSpeed(speed int) error {
	s.writeState(map[string]any{FanPropertySpeed: max(0, min(100, speed))})
	return nil
}

// SetDirection sets the direction, forward or reverse.
//
// Example:
//
//	fan.SetDirection(FanDirectionReverse)
func (s *FanControl) SetDirection(direction FanDirection) error {
	s.writeState(map[string]any{FanPropertyDirection: direction})
	return nil
}

// SetOscillating lets the fan swing, or stops it with false.
//
// Example:
//
//	fan.SetOscillating(true)
func (s *FanControl) SetOscillating(value bool) error {
	s.writeState(map[string]any{FanPropertyOscillating: value})
	return nil
}

// SetPreset sets the preset, one of the preset choices.
//
// Example:
//
//	fan.SetPreset("sleep")
func (s *FanControl) SetPreset(value string) error {
	s.writeState(map[string]any{FanPropertyPreset: value})
	return nil
}

func (s *FanControl) applyValue(property string, value any) error {
	setters := outerOr[fanSetters](&s.BaseSensor, s)
	switch property {
	case FanPropertyOn:
		if isTruthy(value) {
			if err := setters.SetOn(); err != nil {
				return err
			}
		} else {
			if err := setters.SetOff(); err != nil {
				return err
			}
		}
	case FanPropertySpeed:
		if v, ok := toFloat64(value); ok {
			if err := setters.SetSpeed(int(math.Round(v))); err != nil {
				return err
			}
		}
	case FanPropertyDirection:
		if v, ok := value.(string); ok {
			if err := setters.SetDirection(v); err != nil {
				return err
			}
		}
	case FanPropertyOscillating:
		if err := setters.SetOscillating(isTruthy(value)); err != nil {
			return err
		}
	case FanPropertyPreset:
		if v, ok := value.(string); ok {
			if err := setters.SetPreset(v); err != nil {
				return err
			}
		}
	}
	return nil
}
