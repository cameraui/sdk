package sdk

import "time"

// Optional capabilities of a chime.
const (
	ChimeCapabilityVolume = "volume" // Chime supports volume adjustment (0-100)
	ChimeCapabilityRepeat = "repeat" // Chime can play its tone several times in a row
)

// ChimeProperty is a property name of a chime.
type ChimeProperty = string

// Property names of a chime.
const (
	ChimePropertyActive ChimeProperty = "active" // Whether the chime is playing
	ChimePropertyTone   ChimeProperty = "tone"   // Tone the chime plays, one of the tones the device offers
	ChimePropertyVolume ChimeProperty = "volume" // Volume level (0-100)
	ChimePropertyRepeat ChimeProperty = "repeat" // How often the tone plays (1-10)
)

const chimeAutoResetMs = 10_000

type chimeSetters interface {
	Play()
	Stop()
	SetTone(value string)
	SetVolume(value int)
	SetRepeat(value int)
}

// ChimeControl is a chime, such as a door chime or a speaker that plays
// ringtones. Offer the device's tones with SetPropertySpec(ChimePropertyTone)
// and its Choices. Override Play (by embedding ChimeControl in your own type
// and shadowing the method) to drive your hardware, then call the embedded
// method to sync the SDK state, and call Stop when the device reports the end.
// Without that the chime counts as done after chimeAutoResetMs.
type ChimeControl struct {
	BaseSensor
	playResetTimer *time.Timer
}

// NewChimeControl creates a chime with the given name and options.
func NewChimeControl(name string, opts ...SensorOption) *ChimeControl {
	s := &ChimeControl{BaseSensor: NewBaseSensor(name, opts...)}
	s.writeState(map[string]any{
		ChimePropertyActive: false,
		ChimePropertyTone:   "",
		ChimePropertyVolume: 100,
		ChimePropertyRepeat: 1,
	})
	return s
}

func (s *ChimeControl) GetType() SensorType         { return SensorTypeChime }
func (s *ChimeControl) GetCategory() SensorCategory { return SensorCategoryControl }
func (s *ChimeControl) ToJSON() sensorJSON          { return s.toBaseJSON(s.GetType(), s.GetCategory()) }

// IsActive reports whether the chime is playing.
func (s *ChimeControl) IsActive() bool {
	v, _ := s.GetValue(ChimePropertyActive).(bool)
	return v
}

// GetTone returns the tone the chime plays.
func (s *ChimeControl) GetTone() string {
	v, _ := s.GetValue(ChimePropertyTone).(string)
	return v
}

// GetVolume returns the volume level (0-100).
func (s *ChimeControl) GetVolume() int {
	if v, ok := toInt64(s.GetValue(ChimePropertyVolume)); ok {
		return int(v)
	}
	return 0
}

// GetRepeat returns how often the tone plays.
func (s *ChimeControl) GetRepeat() int {
	if v, ok := toInt64(s.GetValue(ChimePropertyRepeat)); ok {
		return int(v)
	}
	return 1
}

// Play plays the tone.
//
// Example:
//
//	chime.Play()
func (s *ChimeControl) Play() {
	s.stopResetTimer()
	s.writeState(map[string]any{ChimePropertyActive: true})

	timer := time.AfterFunc(time.Duration(chimeAutoResetMs)*time.Millisecond, func() {
		s.mu.Lock()
		s.playResetTimer = nil
		s.mu.Unlock()
		s.writeState(map[string]any{ChimePropertyActive: false})
	})

	s.mu.Lock()
	s.playResetTimer = timer
	s.mu.Unlock()
}

// Stop stops playing, call it too when the device reports the end.
//
// Example:
//
//	chime.Stop()
func (s *ChimeControl) Stop() {
	s.stopResetTimer()
	s.writeState(map[string]any{ChimePropertyActive: false})
}

// SetTone chooses the tone, one of the tones offered as choices.
//
// Example:
//
//	chime.SetTone("ding-dong")
func (s *ChimeControl) SetTone(value string) {
	s.writeState(map[string]any{ChimePropertyTone: value})
}

// SetVolume sets the chime volume (clamped to [0,100]).
//
// Example:
//
//	chime.SetVolume(60)
func (s *ChimeControl) SetVolume(value int) {
	s.writeState(map[string]any{ChimePropertyVolume: max(0, min(100, value))})
}

// SetRepeat sets how often the tone plays (clamped to [1,10]).
//
// Example:
//
//	chime.SetRepeat(2)
func (s *ChimeControl) SetRepeat(value int) {
	s.writeState(map[string]any{ChimePropertyRepeat: max(1, min(10, value))})
}

// UpdateValue routes generic property writes to the semantic setters.
func (s *ChimeControl) UpdateValue(property string, value any) error {
	setters := outerOr[chimeSetters](&s.BaseSensor, s)
	switch property {
	case ChimePropertyActive:
		active := false
		if b, ok := value.(bool); ok {
			active = b
		} else if v, ok := toInt64(value); ok {
			active = v != 0
		}
		if active {
			setters.Play()
		} else {
			setters.Stop()
		}
	case ChimePropertyTone:
		if v, ok := value.(string); ok {
			setters.SetTone(v)
		}
	case ChimePropertyVolume:
		if v, ok := toInt64(value); ok {
			setters.SetVolume(int(v))
		}
	case ChimePropertyRepeat:
		if v, ok := toInt64(value); ok {
			setters.SetRepeat(int(v))
		}
	}
	return nil
}

func (s *ChimeControl) stopResetTimer() {
	s.mu.Lock()
	if s.playResetTimer != nil {
		s.playResetTimer.Stop()
		s.playResetTimer = nil
	}
	s.mu.Unlock()
}

func (s *ChimeControl) cleanup() {
	s.stopResetTimer()
	s.BaseSensor.cleanup()
}
