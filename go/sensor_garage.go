package sdk

// GarageState defines garage door states.
type GarageState int

const (
	GarageStateOpen    GarageState = 0 // Door is fully open
	GarageStateClosed  GarageState = 1 // Door is fully closed
	GarageStateOpening GarageState = 2 // Door is moving towards open
	GarageStateClosing GarageState = 3 // Door is moving towards closed
	GarageStateStopped GarageState = 4 // Door stopped part-way
)

// GarageProperty is a property name of a garage control.
type GarageProperty = string

// Property names of a garage control.
const (
	GaragePropertyCurrentState        GarageProperty = "currentState"        // The actual current state of the garage door
	GaragePropertyTargetState         GarageProperty = "targetState"         // The desired target state (set by user, transitions to currentState)
	GaragePropertyObstructionDetected GarageProperty = "obstructionDetected" // Whether an obstruction is detected
)

type garageSetters interface {
	SetTargetState(value GarageState)
}

// GarageControl is a garage door control sensor. Override SetTargetState (by
// embedding GarageControl in your own type and shadowing the method) to drive
// hardware and call the embedded GarageControl's SetTargetState once the
// hardware confirms: the base implementation updates both targetState and
// currentState.
//
// For long-running transitions (Opening/Closing intermediate states) override
// SetTargetState and write currentState separately as the door moves.
type GarageControl struct{ BaseSensor }

// NewGarageControl creates a garage door control with the given name and options.
func NewGarageControl(name string, opts ...SensorOption) *GarageControl {
	s := &GarageControl{BaseSensor: NewBaseSensor(name, opts...)}
	s.writeState(map[string]any{
		GaragePropertyCurrentState:        int(GarageStateClosed),
		GaragePropertyTargetState:         int(GarageStateClosed),
		GaragePropertyObstructionDetected: false,
	})
	return s
}

func (s *GarageControl) GetType() SensorType         { return SensorTypeGarage }
func (s *GarageControl) GetCategory() SensorCategory { return SensorCategoryControl }
func (s *GarageControl) ToJSON() sensorJSON          { return s.toBaseJSON(s.GetType(), s.GetCategory()) }

// GetCurrentState returns the actual current state of the garage door.
func (s *GarageControl) GetCurrentState() GarageState {
	if v, ok := s.GetValue(GaragePropertyCurrentState).(int); ok {
		return GarageState(v)
	}
	return GarageStateClosed
}

// GetTargetState returns the desired target state (set by user, transitions to the current state).
func (s *GarageControl) GetTargetState() GarageState {
	if v, ok := s.GetValue(GaragePropertyTargetState).(int); ok {
		return GarageState(v)
	}
	return GarageStateClosed
}

// IsObstructionDetected reports whether an obstruction is detected.
func (s *GarageControl) IsObstructionDetected() bool {
	v, _ := s.GetValue(GaragePropertyObstructionDetected).(bool)
	return v
}

// SetTargetState sets the target state. Writes both targetState and currentState.
//
// Example:
//
//	garage.SetTargetState(GarageStateOpen)
func (s *GarageControl) SetTargetState(value GarageState) {
	s.writeState(map[string]any{
		GaragePropertyTargetState:  int(value),
		GaragePropertyCurrentState: int(value),
	})
}

// SetCurrentState publishes the actual door state. Use this to drive
// long-running transitions (Open, then Closing, then Closed) independently of
// the user-requested target state. Read-only from cross-process consumers,
// UpdateValue ignores it.
//
// Example:
//
//	garage.SetCurrentState(GarageStateClosing)
func (s *GarageControl) SetCurrentState(value GarageState) {
	s.writeState(map[string]any{GaragePropertyCurrentState: int(value)})
}

// SetObstructionDetected publishes the obstruction-detected state. Read-only
// from cross-process consumers, UpdateValue ignores it.
//
// Example:
//
//	garage.SetObstructionDetected(true)
func (s *GarageControl) SetObstructionDetected(detected bool) {
	s.writeState(map[string]any{GaragePropertyObstructionDetected: detected})
}

// UpdateValue routes generic property writes to the semantic setters.
// Only targetState is externally writable.
func (s *GarageControl) UpdateValue(property string, value any) error {
	if property == GaragePropertyTargetState {
		if v, ok := toInt64(value); ok {
			outerOr[garageSetters](&s.BaseSensor, s).SetTargetState(GarageState(v))
		}
	}
	return nil
}
