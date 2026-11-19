package sdk

// OccupancyProperty is a property name of an occupancy sensor.
type OccupancyProperty = string

// Property names of an occupancy sensor.
const (
	OccupancyPropertyDetected OccupancyProperty = "detected" // Whether occupancy is detected (true = occupied)
)

// OccupancySensor reports occupancy/presence state.
type OccupancySensor struct{ BaseSensor }

// NewOccupancySensor creates an occupancy sensor with the given name and options.
func NewOccupancySensor(name string, opts ...SensorOption) *OccupancySensor {
	s := &OccupancySensor{BaseSensor: NewBaseSensor(name, opts...)}
	s.writeState(map[string]any{
		OccupancyPropertyDetected: false,
	})
	return s
}

func (s *OccupancySensor) GetType() SensorType         { return SensorTypeOccupancy }
func (s *OccupancySensor) GetCategory() SensorCategory { return SensorCategorySensor }
func (s *OccupancySensor) ToJSON() sensorJSON          { return s.toBaseJSON(s.GetType(), s.GetCategory()) }

// IsDetected reports whether occupancy is detected (true = occupied).
func (s *OccupancySensor) IsDetected() bool {
	v, _ := s.GetValue(OccupancyPropertyDetected).(bool)
	return v
}

// SetDetected reports occupancy state (true when the area is currently
// occupied).
//
// Example:
//
//	occupancy.SetDetected(true)
func (s *OccupancySensor) SetDetected(detected bool) {
	s.writeState(map[string]any{OccupancyPropertyDetected: detected})
}

// UpdateValue on a read-only sensor: external writes are ignored.
func (s *OccupancySensor) UpdateValue(property string, value any) error {
	return nil
}
