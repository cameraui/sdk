package sdk

import "time"

const (
	commandPropertyCommand = "command"
	commandAutoResetMs     = 1000
)

// CommandControl is the base of the controls that take one-off commands, such
// as a vacuum or a media player. A command reads in command for a moment
// (commandAutoResetMs) and then empty again, so the history records each one
// and the next arrives the same way. The concrete control types embed it.
type CommandControl struct {
	BaseSensor
	sensorType        SensorType
	commandResetTimer *time.Timer
}

func (s *CommandControl) GetType() SensorType         { return s.sensorType }
func (s *CommandControl) GetCategory() SensorCategory { return SensorCategoryControl }
func (s *CommandControl) ToJSON() sensorJSON          { return s.toBaseJSON(s.GetType(), s.GetCategory()) }

func (s *CommandControl) initCommand(sensorType SensorType, name string, opts []SensorOption) {
	s.BaseSensor = NewBaseSensor(name, opts...)
	s.sensorType = sensorType
	s.writeState(map[string]any{commandPropertyCommand: ""})
}

func (s *CommandControl) sent(value string) {
	s.stopResetTimer()
	if v, _ := s.GetValue(commandPropertyCommand).(string); v != "" {
		s.writeState(map[string]any{commandPropertyCommand: ""})
	}
	s.writeState(map[string]any{commandPropertyCommand: value})

	timer := time.AfterFunc(time.Duration(commandAutoResetMs)*time.Millisecond, func() {
		s.mu.Lock()
		s.commandResetTimer = nil
		s.mu.Unlock()
		s.writeState(map[string]any{commandPropertyCommand: ""})
	})

	s.mu.Lock()
	s.commandResetTimer = timer
	s.mu.Unlock()
}

func (s *CommandControl) stopResetTimer() {
	s.mu.Lock()
	if s.commandResetTimer != nil {
		s.commandResetTimer.Stop()
		s.commandResetTimer = nil
	}
	s.mu.Unlock()
}

func (s *CommandControl) cleanup() {
	s.stopResetTimer()
	s.BaseSensor.cleanup()
}
