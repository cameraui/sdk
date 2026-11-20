package sdk

// CarbonMonoxideProperty is a property name of a carbon monoxide sensor.
type CarbonMonoxideProperty = string

// Property names of a carbon monoxide sensor.
const (
	CarbonMonoxidePropertyDetected CarbonMonoxideProperty = "detected" // Whether carbon monoxide is detected
)

// CarbonMonoxideSensor reports carbon monoxide detection state.
type CarbonMonoxideSensor struct{ BinarySensor }

// NewCarbonMonoxideSensor creates a carbon monoxide sensor with the given name and options.
func NewCarbonMonoxideSensor(name string, opts ...SensorOption) *CarbonMonoxideSensor {
	s := &CarbonMonoxideSensor{}
	s.initBinary(SensorTypeCarbonMonoxide, name, opts)
	return s
}
