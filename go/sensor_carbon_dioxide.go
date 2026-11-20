package sdk

import "math"

// CarbonDioxideProperty is a property name of a carbon dioxide sensor.
type CarbonDioxideProperty = string

// Property names of a carbon dioxide sensor.
const (
	CarbonDioxidePropertyCurrent CarbonDioxideProperty = "current" // Current CO2 concentration in parts per million
)

// CarbonDioxideInfo reports the current CO2 concentration in ppm.
type CarbonDioxideInfo struct{ MeasurementInfo }

// NewCarbonDioxideInfo creates a carbon dioxide info sensor with the given name and options.
func NewCarbonDioxideInfo(name string, opts ...SensorOption) *CarbonDioxideInfo {
	s := &CarbonDioxideInfo{}
	s.initMeasurement(SensorTypeCarbonDioxide, measurementRange{initial: 400, min: 0, max: math.Inf(1)}, name, opts)
	return s
}
