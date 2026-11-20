package sdk

const binaryPropertyDetected = "detected"

// BinarySensor is the base of the sensors that report one condition as on or
// off, such as smoke, a leak or an open contact. The concrete sensor types
// embed it.
type BinarySensor struct {
	BaseSensor
	sensorType SensorType
}

func (s *BinarySensor) GetType() SensorType         { return s.sensorType }
func (s *BinarySensor) GetCategory() SensorCategory { return SensorCategorySensor }
func (s *BinarySensor) ToJSON() sensorJSON          { return s.toBaseJSON(s.GetType(), s.GetCategory()) }

// IsDetected reports whether the sensor currently detects its condition.
func (s *BinarySensor) IsDetected() bool {
	v, _ := s.GetValue(binaryPropertyDetected).(bool)
	return v
}

// SetDetected reports whether the condition is currently detected.
//
// Example:
//
//	sensor.SetDetected(true)
func (s *BinarySensor) SetDetected(detected bool) {
	s.writeState(map[string]any{binaryPropertyDetected: detected})
}

// UpdateValue on a read-only sensor: external writes are ignored.
func (s *BinarySensor) UpdateValue(property string, value any) error {
	return nil
}

func (s *BinarySensor) initBinary(sensorType SensorType, name string, opts []SensorOption) {
	s.BaseSensor = NewBaseSensor(name, opts...)
	s.sensorType = sensorType
	s.writeState(map[string]any{binaryPropertyDetected: false})
}
