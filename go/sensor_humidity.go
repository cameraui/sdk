package sdk

// HumidityProperty is a property name of a humidity sensor.
type HumidityProperty = string

// Property names of a humidity sensor.
const (
	HumidityPropertyCurrent HumidityProperty = "current" // Current relative humidity (0-100%)
)

// HumidityInfo reports current relative humidity (0-100%).
type HumidityInfo struct{ MeasurementInfo }

// NewHumidityInfo creates a humidity info sensor with the given name and options.
func NewHumidityInfo(name string, opts ...SensorOption) *HumidityInfo {
	s := &HumidityInfo{}
	s.initMeasurement(SensorTypeHumidity, measurementRange{initial: 50, min: 0, max: 100}, name, opts)
	return s
}
