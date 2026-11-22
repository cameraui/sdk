package sdk

import "time"

const (
	robotPropertyActivity = "activity"
	robotPropertyCommand  = "command"
)

const commandAutoResetMs = 1000

// RobotControl is the base of the robots that run on their own and take
// one-off commands, such as a vacuum or a lawn mower. A command reads in
// command for a moment (commandAutoResetMs) and then empty again, so the
// history records each one and the next arrives the same way. The concrete
// control types embed it.
type RobotControl struct {
	BaseSensor
	sensorType        SensorType
	commandResetTimer *time.Timer
}

func (s *RobotControl) GetType() SensorType         { return s.sensorType }
func (s *RobotControl) GetCategory() SensorCategory { return SensorCategoryControl }
func (s *RobotControl) ToJSON() sensorJSON          { return s.toBaseJSON(s.GetType(), s.GetCategory()) }

// GetActivity returns what the robot does right now, empty before the first report.
func (s *RobotControl) GetActivity() string {
	v, _ := s.GetValue(robotPropertyActivity).(string)
	return v
}

// SetActivity reports what the robot does right now, one of the activities of its type.
//
// Example:
//
//	robot.SetActivity(VacuumActivityDocked)
func (s *RobotControl) SetActivity(value string) {
	s.writeState(map[string]any{robotPropertyActivity: value})
}

func (s *RobotControl) initRobot(sensorType SensorType, name string, opts []SensorOption) {
	s.BaseSensor = NewBaseSensor(name, opts...)
	s.sensorType = sensorType
	s.writeState(map[string]any{robotPropertyCommand: ""})
}

func (s *RobotControl) sent(value string) {
	s.stopResetTimer()
	if v, _ := s.GetValue(robotPropertyCommand).(string); v != "" {
		s.writeState(map[string]any{robotPropertyCommand: ""})
	}
	s.writeState(map[string]any{robotPropertyCommand: value})

	timer := time.AfterFunc(time.Duration(commandAutoResetMs)*time.Millisecond, func() {
		s.mu.Lock()
		s.commandResetTimer = nil
		s.mu.Unlock()
		s.writeState(map[string]any{robotPropertyCommand: ""})
	})

	s.mu.Lock()
	s.commandResetTimer = timer
	s.mu.Unlock()
}

func (s *RobotControl) stopResetTimer() {
	s.mu.Lock()
	if s.commandResetTimer != nil {
		s.commandResetTimer.Stop()
		s.commandResetTimer = nil
	}
	s.mu.Unlock()
}

func (s *RobotControl) cleanup() {
	s.stopResetTimer()
	s.BaseSensor.cleanup()
}
