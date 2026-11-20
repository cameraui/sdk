package sdk

// OccupancyProperty is a property name of an occupancy sensor.
type OccupancyProperty = string

// Property names of an occupancy sensor.
const (
	OccupancyPropertyDetected OccupancyProperty = "detected" // Whether occupancy is detected (true = occupied)
)

// OccupancySensor reports occupancy/presence state.
type OccupancySensor struct{ BinarySensor }

// NewOccupancySensor creates an occupancy sensor with the given name and options.
func NewOccupancySensor(name string, opts ...SensorOption) *OccupancySensor {
	s := &OccupancySensor{}
	s.initBinary(SensorTypeOccupancy, name, opts)
	return s
}
