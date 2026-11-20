package sdk

// ProblemProperty is a property name of a problem sensor.
type ProblemProperty = string

// Property names of a problem sensor.
const (
	ProblemPropertyDetected ProblemProperty = "detected" // Whether a problem is detected
)

// ProblemSensor reports the problem state.
type ProblemSensor struct{ BinarySensor }

// NewProblemSensor creates a problem sensor with the given name and options.
func NewProblemSensor(name string, opts ...SensorOption) *ProblemSensor {
	s := &ProblemSensor{}
	s.initBinary(SensorTypeProblem, name, opts)
	return s
}
