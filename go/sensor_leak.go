package sdk

// LeakProperty is a property name of a leak sensor.
type LeakProperty = string

// Property names of a leak sensor.
const (
	LeakPropertyDetected LeakProperty = "detected" // Whether a leak is detected
)

// LeakSensor reports water leak detection state.
type LeakSensor struct{ BinarySensor }

// NewLeakSensor creates a leak sensor with the given name and options.
func NewLeakSensor(name string, opts ...SensorOption) *LeakSensor {
	s := &LeakSensor{}
	s.initBinary(SensorTypeLeak, name, opts)
	return s
}
