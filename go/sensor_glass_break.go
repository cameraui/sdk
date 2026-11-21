package sdk

// GlassBreakProperty is a property name of a glass break sensor.
type GlassBreakProperty = string

// Property names of a glass break sensor.
const (
	GlassBreakPropertyDetected GlassBreakProperty = "detected" // Whether breaking glass is detected
)

// GlassBreakSensor reports glass break detection state.
type GlassBreakSensor struct{ BinarySensor }

// NewGlassBreakSensor creates a glass break sensor with the given name and options.
func NewGlassBreakSensor(name string, opts ...SensorOption) *GlassBreakSensor {
	s := &GlassBreakSensor{}
	s.initBinary(SensorTypeGlassBreak, name, opts)
	return s
}
