package sdk

import "math"

// IlluminanceProperty is a property name of an illuminance sensor.
type IlluminanceProperty = string

// Property names of an illuminance sensor.
const (
	IlluminancePropertyCurrent IlluminanceProperty = "current" // Current illuminance in lux
)

// IlluminanceInfo reports the current light level in lux.
type IlluminanceInfo struct{ MeasurementInfo }

// NewIlluminanceInfo creates an illuminance info sensor with the given name and options.
func NewIlluminanceInfo(name string, opts ...SensorOption) *IlluminanceInfo {
	s := &IlluminanceInfo{}
	s.initMeasurement(SensorTypeIlluminance, measurementRange{initial: 0, min: 0, max: math.Inf(1)}, name, opts)
	return s
}
