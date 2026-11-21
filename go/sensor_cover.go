package sdk

import "math"

// CoverState is the state of a cover. A target takes Open and Closed.
type CoverState int

const (
	CoverStateOpen    CoverState = 0
	CoverStateClosed  CoverState = 1
	CoverStateOpening CoverState = 2
	CoverStateClosing CoverState = 3
	CoverStateStopped CoverState = 4
)

// CoverKind says what a cover is, it decides how smart homes show it.
type CoverKind = string

// Kinds of a cover.
const (
	CoverKindAwning  CoverKind = "awning"
	CoverKindBlind   CoverKind = "blind"
	CoverKindCurtain CoverKind = "curtain"
	CoverKindDamper  CoverKind = "damper"
	CoverKindDoor    CoverKind = "door"
	CoverKindShade   CoverKind = "shade"
	CoverKindShutter CoverKind = "shutter"
	CoverKindWindow  CoverKind = "window"
)

// Optional capabilities of a cover.
const (
	CoverCapabilityPosition = "position" // Cover moves to a position between closed and open
	CoverCapabilityTilt     = "tilt"     // Cover tilts its slats
	CoverCapabilityStop     = "stop"     // Cover stops while it moves
)

// CoverProperty is a property name of a cover.
type CoverProperty = string

// Property names of a cover.
const (
	CoverPropertyCurrentState        CoverProperty = "currentState"        // Current state, a CoverState
	CoverPropertyTargetState         CoverProperty = "targetState"         // Target state, Open or Closed
	CoverPropertyCurrentPosition     CoverProperty = "currentPosition"     // Current position, 0 (closed) to 100 (open)
	CoverPropertyTargetPosition      CoverProperty = "targetPosition"      // Target position, 0 (closed) to 100 (open)
	CoverPropertyCurrentTilt         CoverProperty = "currentTilt"         // Current tilt of the slats, 0 (closed) to 100 (open)
	CoverPropertyTargetTilt          CoverProperty = "targetTilt"          // Target tilt of the slats, 0 (closed) to 100 (open)
	CoverPropertyStop                CoverProperty = "stop"                // Command that stops the cover, it reads false again once handled
	CoverPropertyObstructionDetected CoverProperty = "obstructionDetected" // Whether something blocks the cover
	CoverPropertyKind                CoverProperty = "kind"                // What the cover is, a CoverKind
)

type coverSetters interface {
	SetTargetState(value CoverState)
	SetTargetPosition(position int)
	SetTargetTilt(tilt int)
	Stop()
}

// CoverControl is a blind, shutter, awning, curtain or other cover. Override
// SetTargetState, SetTargetPosition and SetTargetTilt (by embedding
// CoverControl in your own type and shadowing the methods) to drive hardware,
// then call the embedded CoverControl's methods to sync the SDK state. Report
// what the hardware does with SetCurrentState, SetCurrentPosition and
// SetCurrentTilt.
//
// A cover that moves to positions adds CoverCapabilityPosition, one with slats
// CoverCapabilityTilt, one that stops on command CoverCapabilityStop and
// shadows Stop. SetKind says what the cover is.
type CoverControl struct{ BaseSensor }

// NewCoverControl creates a cover with the given name and options.
func NewCoverControl(name string, opts ...SensorOption) *CoverControl {
	s := &CoverControl{BaseSensor: NewBaseSensor(name, opts...)}
	s.writeState(map[string]any{
		CoverPropertyCurrentState:        int(CoverStateClosed),
		CoverPropertyTargetState:         int(CoverStateClosed),
		CoverPropertyCurrentPosition:     0,
		CoverPropertyTargetPosition:      0,
		CoverPropertyCurrentTilt:         0,
		CoverPropertyTargetTilt:          0,
		CoverPropertyStop:                false,
		CoverPropertyObstructionDetected: false,
	})
	return s
}

func (s *CoverControl) GetType() SensorType         { return SensorTypeCover }
func (s *CoverControl) GetCategory() SensorCategory { return SensorCategoryControl }
func (s *CoverControl) ToJSON() sensorJSON          { return s.toBaseJSON(s.GetType(), s.GetCategory()) }

// GetCurrentState returns the current state.
func (s *CoverControl) GetCurrentState() CoverState {
	if v, ok := s.GetValue(CoverPropertyCurrentState).(int); ok {
		return CoverState(v)
	}
	return CoverStateClosed
}

// GetTargetState returns the target state.
func (s *CoverControl) GetTargetState() CoverState {
	if v, ok := s.GetValue(CoverPropertyTargetState).(int); ok {
		return CoverState(v)
	}
	return CoverStateClosed
}

// GetCurrentPosition returns the current position, 0 (closed) to 100 (open).
func (s *CoverControl) GetCurrentPosition() int {
	v, _ := s.GetValue(CoverPropertyCurrentPosition).(int)
	return v
}

// GetTargetPosition returns the target position, 0 (closed) to 100 (open).
func (s *CoverControl) GetTargetPosition() int {
	v, _ := s.GetValue(CoverPropertyTargetPosition).(int)
	return v
}

// GetCurrentTilt returns the current tilt of the slats, 0 (closed) to 100 (open).
func (s *CoverControl) GetCurrentTilt() int {
	v, _ := s.GetValue(CoverPropertyCurrentTilt).(int)
	return v
}

// GetTargetTilt returns the target tilt of the slats, 0 (closed) to 100 (open).
func (s *CoverControl) GetTargetTilt() int {
	v, _ := s.GetValue(CoverPropertyTargetTilt).(int)
	return v
}

// IsObstructionDetected reports whether something blocks the cover.
func (s *CoverControl) IsObstructionDetected() bool {
	v, _ := s.GetValue(CoverPropertyObstructionDetected).(bool)
	return v
}

// GetKind returns what the cover is, empty when the plugin did not say.
func (s *CoverControl) GetKind() CoverKind {
	v, _ := s.GetValue(CoverPropertyKind).(string)
	return v
}

// SetTargetState opens or closes the cover. Writes both targetState and currentState.
//
// Example:
//
//	cover.SetTargetState(CoverStateOpen)
func (s *CoverControl) SetTargetState(value CoverState) {
	s.writeState(map[string]any{
		CoverPropertyTargetState:  int(value),
		CoverPropertyCurrentState: int(value),
	})
}

// Stop stops the cover and reports it as stopped. The stop property is a
// command and stays false.
//
// Example:
//
//	cover.Stop()
func (s *CoverControl) Stop() {
	s.writeState(map[string]any{CoverPropertyCurrentState: int(CoverStateStopped)})
}

// SetCurrentState reports the state of the cover.
//
// Example:
//
//	cover.SetCurrentState(CoverStateOpening)
func (s *CoverControl) SetCurrentState(value CoverState) {
	s.writeState(map[string]any{CoverPropertyCurrentState: int(value)})
}

// SetTargetPosition moves the cover to a position, 0 (closed) to 100 (open).
// Writes both targetPosition and currentPosition.
//
// Example:
//
//	cover.SetTargetPosition(50)
func (s *CoverControl) SetTargetPosition(position int) {
	value := max(0, min(100, position))
	s.writeState(map[string]any{CoverPropertyTargetPosition: value, CoverPropertyCurrentPosition: value})
}

// SetCurrentPosition reports the position of the cover, 0 (closed) to 100 (open).
//
// Example:
//
//	cover.SetCurrentPosition(30)
func (s *CoverControl) SetCurrentPosition(position int) {
	s.writeState(map[string]any{CoverPropertyCurrentPosition: max(0, min(100, position))})
}

// SetTargetTilt tilts the slats, 0 (closed) to 100 (open). Writes both
// targetTilt and currentTilt.
//
// Example:
//
//	cover.SetTargetTilt(100)
func (s *CoverControl) SetTargetTilt(tilt int) {
	value := max(0, min(100, tilt))
	s.writeState(map[string]any{CoverPropertyTargetTilt: value, CoverPropertyCurrentTilt: value})
}

// SetCurrentTilt reports the tilt of the slats, 0 (closed) to 100 (open).
//
// Example:
//
//	cover.SetCurrentTilt(40)
func (s *CoverControl) SetCurrentTilt(tilt int) {
	s.writeState(map[string]any{CoverPropertyCurrentTilt: max(0, min(100, tilt))})
}

// SetObstructionDetected reports whether something blocks the cover.
//
// Example:
//
//	cover.SetObstructionDetected(true)
func (s *CoverControl) SetObstructionDetected(detected bool) {
	s.writeState(map[string]any{CoverPropertyObstructionDetected: detected})
}

// SetKind says what the cover is. Smart homes show it by its kind, a window or
// a door for example, and Home Assistant takes it as the device class.
//
// Example:
//
//	cover.SetKind(CoverKindShutter)
func (s *CoverControl) SetKind(kind CoverKind) {
	s.writeState(map[string]any{CoverPropertyKind: kind})
	s.SetPropertySpec(CoverPropertyKind, &PropertySpecOverride{Values: []any{kind}})
}

// UpdateValue routes generic property writes to the semantic setters.
func (s *CoverControl) UpdateValue(property string, value any) error {
	setters := outerOr[coverSetters](&s.BaseSensor, s)
	switch property {
	case CoverPropertyTargetState:
		if v, ok := toInt64(value); ok {
			setters.SetTargetState(CoverState(v))
		}
	case CoverPropertyTargetPosition:
		if v, ok := toFloat64(value); ok {
			setters.SetTargetPosition(int(math.Round(v)))
		}
	case CoverPropertyTargetTilt:
		if v, ok := toFloat64(value); ok {
			setters.SetTargetTilt(int(math.Round(v)))
		}
	case CoverPropertyStop:
		if b, ok := value.(bool); ok && b {
			setters.Stop()
		}
	}
	return nil
}
