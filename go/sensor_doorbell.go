package sdk

import "time"

// DoorbellProperty is a property name of a doorbell trigger.
type DoorbellProperty = string

// Property names of a doorbell trigger.
const (
	DoorbellPropertyRing DoorbellProperty = "ring" // Whether the doorbell is currently ringing
)

const ringAutoResetMs = 2000

type doorbellSetters interface {
	Trigger() error
}

// DoorbellTrigger fires doorbell ring events.
//
// Plugin authors call Trigger to fire an event. The ring property is set to
// true and automatically reset to false after ringAutoResetMs.
//
// When the device refuses a command, return an error from the override instead of
// calling the embedded method: the write fails for whoever sent it and the state
// stays as it was.
type DoorbellTrigger struct {
	BaseSensor
	ringResetTimer *time.Timer
}

// NewDoorbellTrigger creates a doorbell trigger with the given name and options.
func NewDoorbellTrigger(name string, opts ...SensorOption) *DoorbellTrigger {
	s := &DoorbellTrigger{BaseSensor: NewBaseSensor(name, opts...)}
	s.writeState(map[string]any{DoorbellPropertyRing: false})
	s.handleWrites(s)
	return s
}

func (s *DoorbellTrigger) GetType() SensorType         { return SensorTypeDoorbell }
func (s *DoorbellTrigger) GetCategory() SensorCategory { return SensorCategoryTrigger }
func (s *DoorbellTrigger) ToJSON() sensorJSON          { return s.toBaseJSON(s.GetType(), s.GetCategory()) }

// IsRinging reports whether the doorbell is currently ringing.
func (s *DoorbellTrigger) IsRinging() bool {
	v, _ := s.GetValue(DoorbellPropertyRing).(bool)
	return v
}

// Trigger fires a doorbell ring event. Sets ring to true and auto-resets after
// ringAutoResetMs. Re-triggering while ringing resets the timer (extends the
// ring phase).
//
// Example:
//
//	doorbell.Trigger()
func (s *DoorbellTrigger) Trigger() error {
	s.mu.Lock()
	if s.ringResetTimer != nil {
		s.ringResetTimer.Stop()
		s.ringResetTimer = nil
	}
	s.mu.Unlock()

	s.writeState(map[string]any{DoorbellPropertyRing: true})

	timer := time.AfterFunc(time.Duration(ringAutoResetMs)*time.Millisecond, func() {
		s.mu.Lock()
		s.ringResetTimer = nil
		s.mu.Unlock()
		s.writeState(map[string]any{DoorbellPropertyRing: false})
	})

	s.mu.Lock()
	s.ringResetTimer = timer
	s.mu.Unlock()
	return nil
}

func (s *DoorbellTrigger) applyValue(property string, value any) error {
	if property != DoorbellPropertyRing {
		return nil
	}
	// ring=false is ignored, the auto-reset timer owns the off transition
	if isTruthy(value) {
		if err := outerOr[doorbellSetters](&s.BaseSensor, s).Trigger(); err != nil {
			return err
		}
	}
	return nil
}

func (s *DoorbellTrigger) cleanup() {
	// a pending reset would otherwise clear a fresh ring after the sensor is re-added
	s.mu.Lock()
	if s.ringResetTimer != nil {
		s.ringResetTimer.Stop()
		s.ringResetTimer = nil
	}
	s.mu.Unlock()

	s.BaseSensor.cleanup()
}
