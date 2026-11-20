package sdk

import "math"

// TemperatureProperty is a property name of a temperature sensor.
type TemperatureProperty = string

// Property names of a temperature sensor.
const (
	TemperaturePropertyCurrent TemperatureProperty = "current" // Current temperature in degrees Celsius
)

// TemperatureInfo reports the current temperature in degrees Celsius.
type TemperatureInfo struct{ MeasurementInfo }

// NewTemperatureInfo creates a temperature info sensor with the given name and options.
func NewTemperatureInfo(name string, opts ...SensorOption) *TemperatureInfo {
	s := &TemperatureInfo{}
	s.initMeasurement(SensorTypeTemperature, measurementRange{initial: 20, min: -273.15, max: math.Inf(1)}, name, opts)
	return s
}
