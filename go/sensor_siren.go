package sdk

// Optional capabilities of a siren control.
const (
	SirenCapabilityVolume = "volume" // Siren supports volume adjustment (0-100)
)

// SirenProperty is a property name of a siren control.
type SirenProperty = string

// Property names of a siren control.
const (
	SirenPropertyActive SirenProperty = "active" // Whether the siren is currently active
	SirenPropertyVolume SirenProperty = "volume" // Volume level (0-100)
)

type sirenSetters interface {
	SetActive() error
	SetInactive() error
	SetVolume(value int) error
}

// SirenControl is a siren on/off and volume control sensor. Override
// SetActive / SetInactive (by embedding SirenControl in your own type and
// shadowing the methods) to drive your hardware, then call the embedded
// SirenControl's methods to sync the SDK state. For hardware-pushed updates,
// call the embedded methods directly from your event handler. That bypasses
// any plugin override and only syncs state.
//
// When the device refuses a command, return an error from the override instead of
// calling the embedded method: the write fails for whoever sent it and the state
// stays as it was.
type SirenControl struct{ BaseSensor }

// NewSirenControl creates a siren control with the given name and options.
func NewSirenControl(name string, opts ...SensorOption) *SirenControl {
	s := &SirenControl{BaseSensor: NewBaseSensor(name, opts...)}
	s.writeState(map[string]any{
		SirenPropertyActive: false,
		SirenPropertyVolume: 100,
	})
	s.handleWrites(s)
	return s
}

func (s *SirenControl) GetType() SensorType         { return SensorTypeSiren }
func (s *SirenControl) GetCategory() SensorCategory { return SensorCategoryControl }
func (s *SirenControl) ToJSON() sensorJSON          { return s.toBaseJSON(s.GetType(), s.GetCategory()) }

// IsActive reports whether the siren is currently active.
func (s *SirenControl) IsActive() bool {
	v, _ := s.GetValue(SirenPropertyActive).(bool)
	return v
}

// GetVolume returns the volume level (0-100).
func (s *SirenControl) GetVolume() int {
	if v, ok := s.GetValue(SirenPropertyVolume).(int); ok {
		return v
	}
	return 0
}

// SetActive activates the siren.
//
// Example:
//
//	siren.SetActive()
func (s *SirenControl) SetActive() error {
	s.writeState(map[string]any{SirenPropertyActive: true})
	return nil
}

// SetInactive deactivates the siren.
//
// Example:
//
//	siren.SetInactive()
func (s *SirenControl) SetInactive() error {
	s.writeState(map[string]any{SirenPropertyActive: false})
	return nil
}

// SetVolume sets the siren volume (clamped to [0,100]).
//
// Example:
//
//	siren.SetVolume(80)
func (s *SirenControl) SetVolume(value int) error {
	if value < 0 {
		value = 0
	}
	if value > 100 {
		value = 100
	}
	s.writeState(map[string]any{SirenPropertyVolume: value})
	return nil
}

func (s *SirenControl) applyValue(property string, value any) error {
	setters := outerOr[sirenSetters](&s.BaseSensor, s)
	switch property {
	case SirenPropertyActive:
		if isTruthy(value) {
			if err := setters.SetActive(); err != nil {
				return err
			}
		} else {
			if err := setters.SetInactive(); err != nil {
				return err
			}
		}
	case SirenPropertyVolume:
		if v, ok := toInt64(value); ok {
			if err := setters.SetVolume(int(v)); err != nil {
				return err
			}
		}
	}
	return nil
}
