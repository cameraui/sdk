package sdk

// HeatProperty is a property name of a heat sensor.
type HeatProperty = string

// Property names of a heat sensor.
const (
	HeatPropertyDetected HeatProperty = "detected" // Whether abnormal heat is detected
)

// HeatSensor reports abnormal heat detection state.
type HeatSensor struct{ BinarySensor }

// NewHeatSensor creates a heat sensor with the given name and options.
func NewHeatSensor(name string, opts ...SensorOption) *HeatSensor {
	s := &HeatSensor{}
	s.initBinary(SensorTypeHeat, name, opts)
	return s
}
