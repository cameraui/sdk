package sdk

import "math"

// FanDirection is the direction a fan turns.
type FanDirection = string

// Directions of a fan.
const (
	FanDirectionForward FanDirection = "forward"
	FanDirectionReverse FanDirection = "reverse"
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
	SetOn()
	SetOff()
	SetSpeed(speed int)
	SetDirection(direction FanDirection)
	SetOscillating(value bool)
	SetPreset(value string)
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

// GetDirection returns the direction the fan turns.
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

// GetPreset returns the active preset.
func (s *FanControl) GetPreset() string {
	v, _ := s.GetValue(FanPropertyPreset).(string)
	return v
}

// SetOn turns the fan on.
//
// Example:
//
//	fan.SetOn()
func (s *FanControl) SetOn() {
	s.writeState(map[string]any{FanPropertyOn: true})
}

// SetOff turns the fan off.
//
// Example:
//
//	fan.SetOff()
func (s *FanControl) SetOff() {
	s.writeState(map[string]any{FanPropertyOn: false})
}

// SetSpeed sets the speed, 0 to 100 percent.
//
// Example:
//
//	fan.SetSpeed(66)
func (s *FanControl) SetSpeed(speed int) {
	s.writeState(map[string]any{FanPropertySpeed: max(0, min(100, speed))})
}

// SetDirection sets the direction, forward or reverse.
//
// Example:
//
//	fan.SetDirection(FanDirectionReverse)
func (s *FanControl) SetDirection(direction FanDirection) {
	s.writeState(map[string]any{FanPropertyDirection: direction})
}

// SetOscillating lets the fan swing, or stops it with false.
//
// Example:
//
//	fan.SetOscillating(true)
func (s *FanControl) SetOscillating(value bool) {
	s.writeState(map[string]any{FanPropertyOscillating: value})
}

// SetPreset sets the preset, one of the preset choices.
//
// Example:
//
//	fan.SetPreset("sleep")
func (s *FanControl) SetPreset(value string) {
	s.writeState(map[string]any{FanPropertyPreset: value})
}

// UpdateValue routes generic property writes to the semantic setters.
func (s *FanControl) UpdateValue(property string, value any) error {
	setters := outerOr[fanSetters](&s.BaseSensor, s)
	switch property {
	case FanPropertyOn:
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
	case FanPropertySpeed:
		if v, ok := toFloat64(value); ok {
			setters.SetSpeed(int(math.Round(v)))
		}
	case FanPropertyDirection:
		if v, ok := value.(string); ok {
			setters.SetDirection(v)
		}
	case FanPropertyOscillating:
		if b, ok := value.(bool); ok {
			setters.SetOscillating(b)
		}
	case FanPropertyPreset:
		if v, ok := value.(string); ok {
			setters.SetPreset(v)
		}
	}
	return nil
}
