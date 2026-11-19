package sdk

// HumidityProperty is a property name of a humidity sensor.
type HumidityProperty = string

// Property names of a humidity sensor.
const (
	HumidityPropertyCurrent HumidityProperty = "current" // Current relative humidity (0-100%)
)

// HumidityInfo reports current relative humidity (0-100%).
type HumidityInfo struct{ BaseSensor }

// NewHumidityInfo creates a humidity info sensor with the given name and options.
func NewHumidityInfo(name string, opts ...SensorOption) *HumidityInfo {
	s := &HumidityInfo{BaseSensor: NewBaseSensor(name, opts...)}
	s.writeState(map[string]any{
		HumidityPropertyCurrent: 50.0,
	})
	return s
}

func (s *HumidityInfo) GetType() SensorType         { return SensorTypeHumidity }
func (s *HumidityInfo) GetCategory() SensorCategory { return SensorCategoryInfo }
func (s *HumidityInfo) ToJSON() sensorJSON          { return s.toBaseJSON(s.GetType(), s.GetCategory()) }

// GetCurrent returns the current relative humidity (0-100%).
func (s *HumidityInfo) GetCurrent() float64 {
	v, _ := s.GetValue(HumidityPropertyCurrent).(float64)
	return v
}

// SetCurrent sets the current relative humidity (clamped to [0,100]).
//
// Example:
//
//	humidity.SetCurrent(63)
func (s *HumidityInfo) SetCurrent(value float64) {
	if value < 0 {
		value = 0
	}
	if value > 100 {
		value = 100
	}
	s.writeState(map[string]any{HumidityPropertyCurrent: value})
}

// UpdateValue on a read-only sensor: external writes are ignored.
func (s *HumidityInfo) UpdateValue(property string, value any) error {
	return nil
}
