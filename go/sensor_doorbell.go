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
	Trigger()
}

// DoorbellTrigger fires doorbell ring events.
//
// Plugin authors call Trigger to fire an event. The ring property is set to
// true and automatically reset to false after ringAutoResetMs.
type DoorbellTrigger struct {
	BaseSensor
	ringResetTimer *time.Timer
}

// NewDoorbellTrigger creates a doorbell trigger with the given name and options.
func NewDoorbellTrigger(name string, opts ...SensorOption) *DoorbellTrigger {
	s := &DoorbellTrigger{BaseSensor: NewBaseSensor(name, opts...)}
	s.writeState(map[string]any{DoorbellPropertyRing: false})
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
func (s *DoorbellTrigger) Trigger() {
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
}

// UpdateValue routes generic property writes to the semantic setters.
// Writing ring=false is ignored, the auto-reset timer owns the off transition.
func (s *DoorbellTrigger) UpdateValue(property string, value any) error {
	if property != DoorbellPropertyRing {
		return nil
	}
	truthy := false
	if b, ok := value.(bool); ok {
		truthy = b
	} else if v, ok := toInt64(value); ok {
		truthy = v != 0
	}
	if truthy {
		outerOr[doorbellSetters](&s.BaseSensor, s).Trigger()
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
