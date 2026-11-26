package sdk

// Optional capabilities of a display.
const (
	DisplayCapabilityPresets  = "presets"  // Display offers preset messages, listed as choices of DisplayPropertyPreset
	DisplayCapabilityDuration = "duration" // Display shows a message for a set time
)

// DisplayProperty is a property name of a display.
type DisplayProperty = string

// Property names of a display.
const (
	DisplayPropertyMessage  DisplayProperty = "message"  // Text on the display, empty when none is shown
	DisplayPropertyPreset   DisplayProperty = "preset"   // Preset message on the display, empty when none is shown
	DisplayPropertyDuration DisplayProperty = "duration" // Seconds a new message stays on the display, 0 until it is cleared
)

type displaySetters interface {
	SetMessage(value string) error
	SetPreset(value string) error
	SetDuration(value int) error
}

// DisplayControl is a text display on a device, such as the screen of a
// doorbell. Set the longest text with SetPropertySpec(DisplayPropertyMessage)
// and its MaxLength, the presets with SetPropertySpec(DisplayPropertyPreset)
// and its Choices. Override SetMessage and SetPreset (by embedding
// DisplayControl in your own type and shadowing the methods) to drive your
// hardware, then call the embedded methods to sync the SDK state.
//
// When the device refuses a command, return an error from the override instead of
// calling the embedded method: the write fails for whoever sent it and the state
// stays as it was.
type DisplayControl struct{ BaseSensor }

// NewDisplayControl creates a display with the given name and options.
func NewDisplayControl(name string, opts ...SensorOption) *DisplayControl {
	s := &DisplayControl{BaseSensor: NewBaseSensor(name, opts...)}
	s.writeState(map[string]any{DisplayPropertyMessage: "", DisplayPropertyPreset: "", DisplayPropertyDuration: 0})
	s.handleWrites(s)
	return s
}

func (s *DisplayControl) GetType() SensorType         { return SensorTypeDisplay }
func (s *DisplayControl) GetCategory() SensorCategory { return SensorCategoryControl }
func (s *DisplayControl) ToJSON() sensorJSON          { return s.toBaseJSON(s.GetType(), s.GetCategory()) }

// GetMessage returns the text on the display, empty when none is shown.
func (s *DisplayControl) GetMessage() string {
	v, _ := s.GetValue(DisplayPropertyMessage).(string)
	return v
}

// GetPreset returns the preset message on the display, empty when none is shown.
func (s *DisplayControl) GetPreset() string {
	v, _ := s.GetValue(DisplayPropertyPreset).(string)
	return v
}

// GetDuration returns the seconds a new message stays on the display, 0 until it is cleared.
func (s *DisplayControl) GetDuration() int {
	if v, ok := toInt64(s.GetValue(DisplayPropertyDuration)); ok {
		return int(v)
	}
	return 0
}

// SetMessage shows a text, an empty one clears the display.
//
// Example:
//
//	display.SetMessage("Back in 5 minutes")
func (s *DisplayControl) SetMessage(value string) error {
	s.writeState(map[string]any{DisplayPropertyMessage: value, DisplayPropertyPreset: ""})
	return nil
}

// SetPreset shows a preset message, an empty one clears the display.
//
// Example:
//
//	display.SetPreset("LEAVE_PACKAGE_AT_DOOR")
func (s *DisplayControl) SetPreset(value string) error {
	s.writeState(map[string]any{DisplayPropertyPreset: value, DisplayPropertyMessage: ""})
	return nil
}

// SetDuration sets how long a new message stays on the display, 0 keeps it
// until it is cleared.
//
// Example:
//
//	display.SetDuration(60)
func (s *DisplayControl) SetDuration(value int) error {
	s.writeState(map[string]any{DisplayPropertyDuration: max(0, value)})
	return nil
}

func (s *DisplayControl) applyValue(property string, value any) error {
	setters := outerOr[displaySetters](&s.BaseSensor, s)
	switch property {
	case DisplayPropertyMessage:
		v, _ := value.(string)
		if err := setters.SetMessage(v); err != nil {
			return err
		}
	case DisplayPropertyPreset:
		v, _ := value.(string)
		if err := setters.SetPreset(v); err != nil {
			return err
		}
	case DisplayPropertyDuration:
		if v, ok := toInt64(value); ok {
			if err := setters.SetDuration(int(v)); err != nil {
				return err
			}
		}
	}
	return nil
}
