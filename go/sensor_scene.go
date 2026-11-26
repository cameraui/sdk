package sdk

import "time"

// SceneProperty is a property name of a scene.
type SceneProperty = string

// Property names of a scene.
const (
	ScenePropertyActive SceneProperty = "active" // True for a moment while the scene runs, a command when written true
)

const sceneAutoResetMs = 1000

type sceneSetters interface {
	Activate() error
}

// SceneControl is a scene or script that runs on command and has no state of
// its own. Override Activate (by embedding SceneControl in your own type and
// shadowing the method) to run it on the device, then call the embedded
// method after success, which sets active for a moment (sceneAutoResetMs).
//
// When the device refuses a command, return an error from the override instead of
// calling the embedded method: the write fails for whoever sent it and the state
// stays as it was.
type SceneControl struct {
	BaseSensor
	activeResetTimer *time.Timer
}

// NewSceneControl creates a scene with the given name and options.
func NewSceneControl(name string, opts ...SensorOption) *SceneControl {
	s := &SceneControl{BaseSensor: NewBaseSensor(name, opts...)}
	s.writeState(map[string]any{ScenePropertyActive: false})
	s.handleWrites(s)
	return s
}

func (s *SceneControl) GetType() SensorType         { return SensorTypeScene }
func (s *SceneControl) GetCategory() SensorCategory { return SensorCategoryControl }
func (s *SceneControl) ToJSON() sensorJSON          { return s.toBaseJSON(s.GetType(), s.GetCategory()) }

// IsActive reports true for a moment after the scene ran.
func (s *SceneControl) IsActive() bool {
	v, _ := s.GetValue(ScenePropertyActive).(bool)
	return v
}

// Activate runs the scene. The active property reads true for a moment and
// then false again, so the next command arrives the same way.
//
// Example:
//
//	scene.Activate()
func (s *SceneControl) Activate() error {
	s.stopResetTimer()
	s.writeState(map[string]any{ScenePropertyActive: true})

	timer := time.AfterFunc(time.Duration(sceneAutoResetMs)*time.Millisecond, func() {
		s.mu.Lock()
		s.activeResetTimer = nil
		s.mu.Unlock()
		s.writeState(map[string]any{ScenePropertyActive: false})
	})

	s.mu.Lock()
	s.activeResetTimer = timer
	s.mu.Unlock()
	return nil
}

func (s *SceneControl) applyValue(property string, value any) error {
	if property != ScenePropertyActive {
		return nil
	}
	// active=false is ignored, the reset timer owns the off transition
	if isTruthy(value) {
		if err := outerOr[sceneSetters](&s.BaseSensor, s).Activate(); err != nil {
			return err
		}
	}
	return nil
}

func (s *SceneControl) stopResetTimer() {
	s.mu.Lock()
	if s.activeResetTimer != nil {
		s.activeResetTimer.Stop()
		s.activeResetTimer = nil
	}
	s.mu.Unlock()
}

func (s *SceneControl) cleanup() {
	s.stopResetTimer()
	s.BaseSensor.cleanup()
}
