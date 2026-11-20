package sdk

import "math"

const measurementPropertyCurrent = "current"

type measurementRange struct {
	initial float64
	min     float64
	max     float64
}

// MeasurementInfo is the base of the sensors that report one reading, such as a
// temperature or a CO2 level. The concrete sensor types embed it and set the
// reading they start with and the range the quantity can have.
type MeasurementInfo struct {
	BaseSensor
	sensorType SensorType
	min        float64
	max        float64
}

func (s *MeasurementInfo) GetType() SensorType         { return s.sensorType }
func (s *MeasurementInfo) GetCategory() SensorCategory { return SensorCategoryInfo }
func (s *MeasurementInfo) ToJSON() sensorJSON          { return s.toBaseJSON(s.GetType(), s.GetCategory()) }

// GetCurrent returns the current reading, in the unit of the sensor type.
func (s *MeasurementInfo) GetCurrent() float64 {
	v, _ := s.GetValue(measurementPropertyCurrent).(float64)
	return v
}

// SetCurrent reports a new reading. A value outside the range of the quantity
// is clamped to it, NaN and infinite values are ignored.
//
// Example:
//
//	temperature.SetCurrent(21.5)
func (s *MeasurementInfo) SetCurrent(value float64) {
	if math.IsNaN(value) || math.IsInf(value, 0) {
		return
	}
	s.writeState(map[string]any{measurementPropertyCurrent: math.Min(s.max, math.Max(s.min, value))})
}

// UpdateValue on a read-only sensor: external writes are ignored.
func (s *MeasurementInfo) UpdateValue(property string, value any) error {
	return nil
}

func (s *MeasurementInfo) initMeasurement(sensorType SensorType, r measurementRange, name string, opts []SensorOption) {
	s.BaseSensor = NewBaseSensor(name, opts...)
	s.sensorType = sensorType
	s.min = r.min
	s.max = r.max
	s.writeState(map[string]any{measurementPropertyCurrent: r.initial})
}
