package sdk

// ProblemProperty is a property name of a problem sensor.
type ProblemProperty = string

// Property names of a problem sensor.
const (
	ProblemPropertyDetected ProblemProperty = "detected" // Whether a problem is detected
)

// ProblemSensor reports the problem state.
type ProblemSensor struct{ BaseSensor }

// NewProblemSensor creates a problem sensor with the given name and options.
func NewProblemSensor(name string, opts ...SensorOption) *ProblemSensor {
	s := &ProblemSensor{BaseSensor: NewBaseSensor(name, opts...)}
	s.writeState(map[string]any{
		ProblemPropertyDetected: false,
	})
	return s
}

func (s *ProblemSensor) GetType() SensorType         { return SensorTypeProblem }
func (s *ProblemSensor) GetCategory() SensorCategory { return SensorCategorySensor }
func (s *ProblemSensor) ToJSON() sensorJSON          { return s.toBaseJSON(s.GetType(), s.GetCategory()) }

// IsDetected reports whether a problem is detected.
func (s *ProblemSensor) IsDetected() bool {
	v, _ := s.GetValue(ProblemPropertyDetected).(bool)
	return v
}

// SetDetected reports the the problem state.
//
// Example:
//
//	problem.SetDetected(true)
func (s *ProblemSensor) SetDetected(detected bool) {
	s.writeState(map[string]any{ProblemPropertyDetected: detected})
}

// UpdateValue on a read-only sensor: external writes are ignored.
func (s *ProblemSensor) UpdateValue(property string, value any) error {
	return nil
}
