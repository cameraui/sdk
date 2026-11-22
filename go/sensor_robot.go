package sdk

const robotPropertyActivity = "activity"

// RobotControl is the base of the robots that run on their own and take
// one-off commands, such as a vacuum or a lawn mower. The concrete control
// types embed it.
type RobotControl struct{ CommandControl }

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
