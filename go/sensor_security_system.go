package sdk

// SecuritySystemState defines security system states.
type SecuritySystemState int

const (
	SecuritySystemStateStayArm        SecuritySystemState = 0 // Armed, occupants home
	SecuritySystemStateAwayArm        SecuritySystemState = 1 // Armed, occupants away
	SecuritySystemStateNightArm       SecuritySystemState = 2 // Armed for night mode
	SecuritySystemStateDisarmed       SecuritySystemState = 3 // System disarmed
	SecuritySystemStateAlarmTriggered SecuritySystemState = 4 // Alarm is triggered
)

// SecuritySystemProperty is a property name of a security system control.
type SecuritySystemProperty = string

// Property names of a security system control.
const (
	SecuritySystemPropertyCurrentState SecuritySystemProperty = "currentState" // The actual current state of the security system
	SecuritySystemPropertyTargetState  SecuritySystemProperty = "targetState"  // The desired target state (set by user, transitions to currentState). Never `AlarmTriggered`
)

type securitySystemSetters interface {
	SetTargetState(value SecuritySystemState) error
}

// SecuritySystem is a security system arm/disarm control sensor.
//
// When the device refuses a command, return an error from the override instead of
// calling the embedded method: the write fails for whoever sent it and the state
// stays as it was.
type SecuritySystem struct{ BaseSensor }

// NewSecuritySystem creates a security system with the given name and options.
func NewSecuritySystem(name string, opts ...SensorOption) *SecuritySystem {
	s := &SecuritySystem{BaseSensor: NewBaseSensor(name, opts...)}
	s.writeState(map[string]any{
		SecuritySystemPropertyCurrentState: int(SecuritySystemStateDisarmed),
		SecuritySystemPropertyTargetState:  int(SecuritySystemStateDisarmed),
	})
	s.handleWrites(s)
	return s
}

func (s *SecuritySystem) GetType() SensorType         { return SensorTypeSecuritySystem }
func (s *SecuritySystem) GetCategory() SensorCategory { return SensorCategoryControl }
func (s *SecuritySystem) ToJSON() sensorJSON          { return s.toBaseJSON(s.GetType(), s.GetCategory()) }

// GetCurrentState returns the actual current state of the security system.
func (s *SecuritySystem) GetCurrentState() SecuritySystemState {
	if v, ok := s.GetValue(SecuritySystemPropertyCurrentState).(int); ok {
		return SecuritySystemState(v)
	}
	return SecuritySystemStateDisarmed
}

// GetTargetState returns the desired target state (set by user, transitions to the current state), never SecuritySystemStateAlarmTriggered.
func (s *SecuritySystem) GetTargetState() SecuritySystemState {
	if v, ok := s.GetValue(SecuritySystemPropertyTargetState).(int); ok {
		return SecuritySystemState(v)
	}
	return SecuritySystemStateDisarmed
}

// SetTargetState sets the target state. Writes both targetState and
// currentState. The target state is never SecuritySystemStateAlarmTriggered,
// publish that through SetCurrentState.
//
// Example:
//
//	alarm.SetTargetState(SecuritySystemStateAwayArm)
func (s *SecuritySystem) SetTargetState(value SecuritySystemState) error {
	s.writeState(map[string]any{
		SecuritySystemPropertyTargetState:  int(value),
		SecuritySystemPropertyCurrentState: int(value),
	})
	return nil
}

// SetCurrentState publishes the actual security system state. Use this for
// transitions that diverge from the user-requested target: AlarmTriggered when
// an intruder is detected, or arming-delay intermediate states. Read-only from
// cross-process consumers (UpdateValue ignores it).
//
// Example:
//
//	alarm.SetCurrentState(SecuritySystemStateAlarmTriggered)
func (s *SecuritySystem) SetCurrentState(value SecuritySystemState) {
	s.writeState(map[string]any{SecuritySystemPropertyCurrentState: int(value)})
}

func (s *SecuritySystem) applyValue(property string, value any) error {
	if property == SecuritySystemPropertyTargetState {
		if v, ok := toInt64(value); ok {
			if err := outerOr[securitySystemSetters](&s.BaseSensor, s).SetTargetState(SecuritySystemState(v)); err != nil {
				return err
			}
		}
	}
	return nil
}
