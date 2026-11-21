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
	SetMessage(value string)
	SetPreset(value string)
	SetDuration(value int)
}

// DisplayControl is a text display on a device, such as the screen of a
// doorbell. Set the longest text with SetPropertySpec(DisplayPropertyMessage)
// and its MaxLength, the presets with SetPropertySpec(DisplayPropertyPreset)
// and its Choices. Override SetMessage and SetPreset (by embedding
// DisplayControl in your own type and shadowing the methods) to drive your
// hardware, then call the embedded methods to sync the SDK state.
type DisplayControl struct{ BaseSensor }

// NewDisplayControl creates a display with the given name and options.
func NewDisplayControl(name string, opts ...SensorOption) *DisplayControl {
	s := &DisplayControl{BaseSensor: NewBaseSensor(name, opts...)}
	s.writeState(map[string]any{DisplayPropertyMessage: "", DisplayPropertyPreset: "", DisplayPropertyDuration: 0})
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
func (s *DisplayControl) SetMessage(value string) {
	s.writeState(map[string]any{DisplayPropertyMessage: value, DisplayPropertyPreset: ""})
}

// SetPreset shows a preset message, an empty one clears the display.
//
// Example:
//
//	display.SetPreset("LEAVE_PACKAGE_AT_DOOR")
func (s *DisplayControl) SetPreset(value string) {
	s.writeState(map[string]any{DisplayPropertyPreset: value, DisplayPropertyMessage: ""})
}

// SetDuration sets how long a new message stays on the display, 0 keeps it
// until it is cleared.
//
// Example:
//
//	display.SetDuration(60)
func (s *DisplayControl) SetDuration(value int) {
	s.writeState(map[string]any{DisplayPropertyDuration: max(0, value)})
}

// UpdateValue routes generic property writes to the semantic setters.
func (s *DisplayControl) UpdateValue(property string, value any) error {
	setters := outerOr[displaySetters](&s.BaseSensor, s)
	switch property {
	case DisplayPropertyMessage:
		v, _ := value.(string)
		setters.SetMessage(v)
	case DisplayPropertyPreset:
		v, _ := value.(string)
		setters.SetPreset(v)
	case DisplayPropertyDuration:
		if v, ok := toInt64(value); ok {
			setters.SetDuration(int(v))
		}
	}
	return nil
}
