package sdk

import (
	"math"
	"sync/atomic"
)

// Readings an air quality sensor can offer besides its overall level.
const (
	AirQualityCapabilityAqi  = "aqi"  // Air quality index
	AirQualityCapabilityPm25 = "pm25" // Fine particles up to 2.5 μm
	AirQualityCapabilityPm10 = "pm10" // Particles up to 10 μm
	AirQualityCapabilityVoc  = "voc"  // Volatile organic compounds
	AirQualityCapabilityNo2  = "no2"  // Nitrogen dioxide
)

// AirQualityProperty is a property name of an air quality sensor.
type AirQualityProperty = string

// Property names of an air quality sensor.
const (
	AirQualityPropertyLevel AirQualityProperty = "level" // Overall air quality, empty while unknown
	AirQualityPropertyAqi   AirQualityProperty = "aqi"   // Air quality index
	AirQualityPropertyPm25  AirQualityProperty = "pm25"  // Fine particles up to 2.5 μm, in μg/m³
	AirQualityPropertyPm10  AirQualityProperty = "pm10"  // Particles up to 10 μm, in μg/m³
	AirQualityPropertyVoc   AirQualityProperty = "voc"   // Volatile organic compounds, in μg/m³
	AirQualityPropertyNo2   AirQualityProperty = "no2"   // Nitrogen dioxide, in μg/m³
)

// AirQualityLevel is the overall air quality, from best to worst.
type AirQualityLevel string

const (
	AirQualityLevelExcellent AirQualityLevel = "excellent" // Clean air
	AirQualityLevelGood      AirQualityLevel = "good"      // Good air
	AirQualityLevelFair      AirQualityLevel = "fair"      // Acceptable air
	AirQualityLevelInferior  AirQualityLevel = "inferior"  // Poor air for sensitive people
	AirQualityLevelPoor      AirQualityLevel = "poor"      // Poor air
)

type airQualityStep struct {
	limit float64
	level AirQualityLevel
}

var aqiLevels = []airQualityStep{
	{50, AirQualityLevelExcellent},
	{100, AirQualityLevelGood},
	{150, AirQualityLevelFair},
	{200, AirQualityLevelInferior},
}

var pm25Levels = []airQualityStep{
	{9, AirQualityLevelExcellent},
	{35.4, AirQualityLevelGood},
	{55.4, AirQualityLevelFair},
	{125.4, AirQualityLevelInferior},
}

// AirQualityInfo reports an overall air quality level and the readings the
// device has.
//
// Set the capabilities to the readings the device offers. Without a level of
// its own from the plugin, the level follows the air quality index, else PM2.5.
type AirQualityInfo struct {
	BaseSensor
	levelFromPlugin atomic.Bool
}

// NewAirQualityInfo creates an air quality sensor with the given name and options.
func NewAirQualityInfo(name string, opts ...SensorOption) *AirQualityInfo {
	s := &AirQualityInfo{BaseSensor: NewBaseSensor(name, opts...)}
	s.writeState(map[string]any{
		AirQualityPropertyLevel: "",
		AirQualityPropertyAqi:   0.0,
		AirQualityPropertyPm25:  0.0,
		AirQualityPropertyPm10:  0.0,
		AirQualityPropertyVoc:   0.0,
		AirQualityPropertyNo2:   0.0,
	})
	return s
}

func (s *AirQualityInfo) GetType() SensorType         { return SensorTypeAirQuality }
func (s *AirQualityInfo) GetCategory() SensorCategory { return SensorCategoryInfo }
func (s *AirQualityInfo) ToJSON() sensorJSON          { return s.toBaseJSON(s.GetType(), s.GetCategory()) }

// GetLevel returns the overall air quality, empty while unknown.
func (s *AirQualityInfo) GetLevel() AirQualityLevel {
	v, _ := s.GetValue(AirQualityPropertyLevel).(string)
	return AirQualityLevel(v)
}

// GetReading returns a reading, 0 when the device has none.
func (s *AirQualityInfo) GetReading(property AirQualityProperty) float64 {
	v, _ := toFloat64(s.GetValue(property))
	return v
}

// SetLevel reports the overall air quality as the device rates it. From then
// on the level no longer follows the readings.
//
// Example:
//
//	airQuality.SetLevel(sdk.AirQualityLevelGood)
func (s *AirQualityInfo) SetLevel(value AirQualityLevel) {
	s.levelFromPlugin.Store(true)
	s.writeState(map[string]any{AirQualityPropertyLevel: string(value)})
}

// SetReading reports a reading. A value that is not a finite number is
// ignored, a negative one counts as 0.
//
// Example:
//
//	airQuality.SetReading(sdk.AirQualityPropertyPm25, 12.4)
func (s *AirQualityInfo) SetReading(property AirQualityProperty, value float64) {
	if math.IsNaN(value) || math.IsInf(value, 0) {
		return
	}

	s.writeState(map[string]any{property: math.Max(0, value)})
	if !s.levelFromPlugin.Load() {
		s.writeState(map[string]any{AirQualityPropertyLevel: string(s.derivedLevel())})
	}
}

func (s *AirQualityInfo) derivedLevel() AirQualityLevel {
	switch {
	case s.HasCapability(AirQualityCapabilityAqi):
		return levelOf(s.GetReading(AirQualityPropertyAqi), aqiLevels)
	case s.HasCapability(AirQualityCapabilityPm25):
		return levelOf(s.GetReading(AirQualityPropertyPm25), pm25Levels)
	}
	return s.GetLevel()
}

func levelOf(value float64, steps []airQualityStep) AirQualityLevel {
	for _, step := range steps {
		if value <= step.limit {
			return step.level
		}
	}
	return AirQualityLevelPoor
}
