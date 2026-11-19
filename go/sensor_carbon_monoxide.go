package sdk

// CarbonMonoxideProperty is a property name of a carbon monoxide sensor.
type CarbonMonoxideProperty = string

// Property names of a carbon monoxide sensor.
const (
	CarbonMonoxidePropertyDetected CarbonMonoxideProperty = "detected" // Whether carbon monoxide is detected
)

// CarbonMonoxideSensor reports carbon monoxide detection state.
type CarbonMonoxideSensor struct{ BaseSensor }

// NewCarbonMonoxideSensor creates a carbon monoxide sensor with the given name and options.
func NewCarbonMonoxideSensor(name string, opts ...SensorOption) *CarbonMonoxideSensor {
	s := &CarbonMonoxideSensor{BaseSensor: NewBaseSensor(name, opts...)}
	s.writeState(map[string]any{
		CarbonMonoxidePropertyDetected: false,
	})
	return s
}

func (s *CarbonMonoxideSensor) GetType() SensorType         { return SensorTypeCarbonMonoxide }
func (s *CarbonMonoxideSensor) GetCategory() SensorCategory { return SensorCategorySensor }
func (s *CarbonMonoxideSensor) ToJSON() sensorJSON          { return s.toBaseJSON(s.GetType(), s.GetCategory()) }

// IsDetected reports whether carbon monoxide is detected.
func (s *CarbonMonoxideSensor) IsDetected() bool {
	v, _ := s.GetValue(CarbonMonoxidePropertyDetected).(bool)
	return v
}

// SetDetected reports the carbon monoxide detection state.
//
// Example:
//
//	carbonMonoxide.SetDetected(true)
func (s *CarbonMonoxideSensor) SetDetected(detected bool) {
	s.writeState(map[string]any{CarbonMonoxidePropertyDetected: detected})
}

// UpdateValue on a read-only sensor: external writes are ignored.
func (s *CarbonMonoxideSensor) UpdateValue(property string, value any) error {
	return nil
}
