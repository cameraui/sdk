package sdk

// IlluminanceProperty is a property name of an illuminance sensor.
type IlluminanceProperty = string

// Property names of an illuminance sensor.
const (
	IlluminancePropertyCurrent IlluminanceProperty = "current" // Current illuminance in lux
)

// IlluminanceInfo reports the current light level in lux.
type IlluminanceInfo struct{ BaseSensor }

// NewIlluminanceInfo creates an illuminance info sensor with the given name and options.
func NewIlluminanceInfo(name string, opts ...SensorOption) *IlluminanceInfo {
	s := &IlluminanceInfo{BaseSensor: NewBaseSensor(name, opts...)}
	s.writeState(map[string]any{
		IlluminancePropertyCurrent: 20.0,
	})
	return s
}

func (s *IlluminanceInfo) GetType() SensorType         { return SensorTypeIlluminance }
func (s *IlluminanceInfo) GetCategory() SensorCategory { return SensorCategoryInfo }
func (s *IlluminanceInfo) ToJSON() sensorJSON          { return s.toBaseJSON(s.GetType(), s.GetCategory()) }

// GetCurrent returns the current illuminance in lux.
func (s *IlluminanceInfo) GetCurrent() float64 {
	v, _ := s.GetValue(IlluminancePropertyCurrent).(float64)
	return v
}

// SetCurrent reports a new illuminance reading (clamped to [0,200000]).
//
// Example:
//
//	illuminance.SetCurrent(120)
func (s *IlluminanceInfo) SetCurrent(value float64) {
	if value < 0 {
		value = 0
	}
	if value > 200000 {
		value = 200000
	}
	s.writeState(map[string]any{IlluminancePropertyCurrent: value})
}

// UpdateValue on a read-only sensor: external writes are ignored.
func (s *IlluminanceInfo) UpdateValue(property string, value any) error {
	return nil
}
