package sdk

// HeatProperty is a property name of a heat sensor.
type HeatProperty = string

// Property names of a heat sensor.
const (
	HeatPropertyDetected HeatProperty = "detected" // Whether abnormal heat is detected
)

// HeatSensor reports abnormal heat detection state.
type HeatSensor struct{ BaseSensor }

// NewHeatSensor creates a heat sensor with the given name and options.
func NewHeatSensor(name string, opts ...SensorOption) *HeatSensor {
	s := &HeatSensor{BaseSensor: NewBaseSensor(name, opts...)}
	s.writeState(map[string]any{
		HeatPropertyDetected: false,
	})
	return s
}

func (s *HeatSensor) GetType() SensorType         { return SensorTypeHeat }
func (s *HeatSensor) GetCategory() SensorCategory { return SensorCategorySensor }
func (s *HeatSensor) ToJSON() sensorJSON          { return s.toBaseJSON(s.GetType(), s.GetCategory()) }

// IsDetected reports whether abnormal heat is detected.
func (s *HeatSensor) IsDetected() bool {
	v, _ := s.GetValue(HeatPropertyDetected).(bool)
	return v
}

// SetDetected reports the abnormal heat detection state.
//
// Example:
//
//	heat.SetDetected(true)
func (s *HeatSensor) SetDetected(detected bool) {
	s.writeState(map[string]any{HeatPropertyDetected: detected})
}

// UpdateValue on a read-only sensor: external writes are ignored.
func (s *HeatSensor) UpdateValue(property string, value any) error {
	return nil
}
