package sdk

import "math"

// ValveState is the state of a valve. A target takes Open and Closed.
type ValveState int

const (
	ValveStateOpen    ValveState = 0 // Valve is open, fully or part-way
	ValveStateClosed  ValveState = 1 // Valve is fully closed
	ValveStateOpening ValveState = 2 // Valve is moving towards open
	ValveStateClosing ValveState = 3 // Valve is moving towards closed
)

// ValveKind says what a valve controls, it decides how smart homes show it.
type ValveKind = string

// Kinds of a valve.
const (
	ValveKindWater      ValveKind = "water"      // A water valve
	ValveKindGas        ValveKind = "gas"        // A gas valve
	ValveKindIrrigation ValveKind = "irrigation" // An irrigation or sprinkler valve
)

// Optional capabilities of a valve.
const (
	ValveCapabilityPosition = "position" // Valve opens to a position between closed and open
	ValveCapabilityDuration = "duration" // Valve closes by itself after a set time
)

// ValveProperty is a property name of a valve.
type ValveProperty = string

// Property names of a valve.
const (
	ValvePropertyCurrentState    ValveProperty = "currentState"    // Current state, a ValveState
	ValvePropertyTargetState     ValveProperty = "targetState"     // Target state, Open or Closed
	ValvePropertyCurrentPosition ValveProperty = "currentPosition" // Current position, 0 (closed) to 100 (open)
	ValvePropertyTargetPosition  ValveProperty = "targetPosition"  // Target position, 0 (closed) to 100 (open)
	ValvePropertyDuration        ValveProperty = "duration"        // Seconds the valve stays open before it closes by itself
	ValvePropertyRemaining       ValveProperty = "remaining"       // Seconds left until the open valve closes by itself
	ValvePropertyKind            ValveProperty = "kind"            // What the valve controls, a ValveKind
	ValvePropertyIndex           ValveProperty = "index"           // Position of the valve on its device, from 1, 0 when not set
)

// ValveConfig describes a valve at construction.
type ValveConfig struct {
	// Index is the position of the valve on its device, from 1, e.g. the zone of an irrigation controller.
	Index int
}

type valveSetters interface {
	SetTargetState(value ValveState) error
	SetTargetPosition(position int) error
	SetDuration(seconds int) error
}

// ValveControl is a water or gas valve, or an irrigation zone. Override
// SetTargetState, SetTargetPosition and SetDuration (by embedding ValveControl
// in your own type and shadowing the methods) to drive hardware, then call the
// embedded ValveControl's methods to sync the SDK state. Report what the
// hardware does with SetCurrentState, SetCurrentPosition and SetRemaining.
//
// A valve that opens part way adds ValveCapabilityPosition, one that closes by
// itself after a set time ValveCapabilityDuration. SetKind says what the valve
// controls, ValveConfig.Index orders the zones of one irrigation controller.
//
// When the device refuses a command, return an error from the override instead of
// calling the embedded method: the write fails for whoever sent it and the state
// stays as it was.
type ValveControl struct{ BaseSensor }

// NewValveControl creates a valve with the given name, config and options.
func NewValveControl(name string, config ValveConfig, opts ...SensorOption) *ValveControl {
	s := &ValveControl{BaseSensor: NewBaseSensor(name, opts...)}
	s.writeState(map[string]any{
		ValvePropertyCurrentState:    int(ValveStateClosed),
		ValvePropertyTargetState:     int(ValveStateClosed),
		ValvePropertyCurrentPosition: 0,
		ValvePropertyTargetPosition:  0,
		ValvePropertyDuration:        600,
		ValvePropertyRemaining:       0,
		ValvePropertyIndex:           config.Index,
	})
	s.handleWrites(s)
	return s
}

func (s *ValveControl) GetType() SensorType         { return SensorTypeValve }
func (s *ValveControl) GetCategory() SensorCategory { return SensorCategoryControl }
func (s *ValveControl) ToJSON() sensorJSON          { return s.toBaseJSON(s.GetType(), s.GetCategory()) }

// GetCurrentState returns the current state, a ValveState.
func (s *ValveControl) GetCurrentState() ValveState {
	if v, ok := s.GetValue(ValvePropertyCurrentState).(int); ok {
		return ValveState(v)
	}
	return ValveStateClosed
}

// GetTargetState returns the target state, Open or Closed.
func (s *ValveControl) GetTargetState() ValveState {
	if v, ok := s.GetValue(ValvePropertyTargetState).(int); ok {
		return ValveState(v)
	}
	return ValveStateClosed
}

// GetCurrentPosition returns the current position, 0 (closed) to 100 (open).
func (s *ValveControl) GetCurrentPosition() int {
	v, _ := s.GetValue(ValvePropertyCurrentPosition).(int)
	return v
}

// GetTargetPosition returns the target position, 0 (closed) to 100 (open).
func (s *ValveControl) GetTargetPosition() int {
	v, _ := s.GetValue(ValvePropertyTargetPosition).(int)
	return v
}

// GetDuration returns the seconds the valve stays open before it closes by itself.
func (s *ValveControl) GetDuration() int {
	v, _ := s.GetValue(ValvePropertyDuration).(int)
	return v
}

// GetRemaining returns the seconds left until the open valve closes by itself.
func (s *ValveControl) GetRemaining() int {
	v, _ := s.GetValue(ValvePropertyRemaining).(int)
	return v
}

// GetKind returns what the valve controls, a ValveKind, empty when the plugin did not say.
func (s *ValveControl) GetKind() ValveKind {
	v, _ := s.GetValue(ValvePropertyKind).(string)
	return v
}

// GetIndex returns the position of the valve on its device, from 1, 0 when not set.
func (s *ValveControl) GetIndex() int {
	if v, ok := toInt64(s.GetValue(ValvePropertyIndex)); ok {
		return int(v)
	}
	return 0
}

// SetTargetState opens or closes the valve. Writes both targetState and currentState.
//
// Example:
//
//	valve.SetTargetState(ValveStateOpen)
func (s *ValveControl) SetTargetState(value ValveState) error {
	s.writeState(map[string]any{
		ValvePropertyTargetState:  int(value),
		ValvePropertyCurrentState: int(value),
	})
	return nil
}

// SetCurrentState reports the state of the valve.
//
// Example:
//
//	valve.SetCurrentState(ValveStateOpening)
func (s *ValveControl) SetCurrentState(value ValveState) {
	s.writeState(map[string]any{ValvePropertyCurrentState: int(value)})
}

// SetTargetPosition opens the valve to a position, 0 (closed) to 100 (open).
// Writes both targetPosition and currentPosition.
//
// Example:
//
//	valve.SetTargetPosition(50)
func (s *ValveControl) SetTargetPosition(position int) error {
	value := max(0, min(100, position))
	s.writeState(map[string]any{ValvePropertyTargetPosition: value, ValvePropertyCurrentPosition: value})
	return nil
}

// SetCurrentPosition reports the position of the valve, 0 (closed) to 100 (open).
//
// Example:
//
//	valve.SetCurrentPosition(30)
func (s *ValveControl) SetCurrentPosition(position int) {
	s.writeState(map[string]any{ValvePropertyCurrentPosition: max(0, min(100, position))})
}

// SetDuration sets how long the valve stays open, in seconds until it closes
// by itself.
//
// Example:
//
//	valve.SetDuration(900)
func (s *ValveControl) SetDuration(seconds int) error {
	s.writeState(map[string]any{ValvePropertyDuration: max(0, seconds)})
	return nil
}

// SetRemaining reports how long the open valve has left, in seconds until it
// closes by itself, 0 when closed.
//
// Example:
//
//	valve.SetRemaining(420)
func (s *ValveControl) SetRemaining(seconds int) {
	s.writeState(map[string]any{ValvePropertyRemaining: max(0, seconds)})
}

// SetKind says what the valve controls. Smart homes show it by its kind, and
// Home Assistant takes it as the device class.
//
// Example:
//
//	valve.SetKind(ValveKindGas)
func (s *ValveControl) SetKind(kind ValveKind) {
	s.writeState(map[string]any{ValvePropertyKind: kind})
	s.SetPropertySpec(ValvePropertyKind, &PropertySpecOverride{Values: []any{kind}})
}

func (s *ValveControl) applyValue(property string, value any) error {
	setters := outerOr[valveSetters](&s.BaseSensor, s)
	switch property {
	case ValvePropertyTargetState:
		if v, ok := toInt64(value); ok {
			if err := setters.SetTargetState(ValveState(v)); err != nil {
				return err
			}
		}
	case ValvePropertyTargetPosition:
		if v, ok := toFloat64(value); ok {
			if err := setters.SetTargetPosition(int(math.Round(v))); err != nil {
				return err
			}
		}
	case ValvePropertyDuration:
		if v, ok := toFloat64(value); ok {
			if err := setters.SetDuration(int(math.Round(v))); err != nil {
				return err
			}
		}
	}
	return nil
}
