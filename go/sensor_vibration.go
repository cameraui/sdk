package sdk

// VibrationProperty is a property name of a vibration sensor.
type VibrationProperty = string

// Property names of a vibration sensor.
const (
	VibrationPropertyDetected VibrationProperty = "detected" // Whether vibration is detected
)

// VibrationSensor reports vibration detection state.
type VibrationSensor struct{ BinarySensor }

// NewVibrationSensor creates a vibration sensor with the given name and options.
func NewVibrationSensor(name string, opts ...SensorOption) *VibrationSensor {
	s := &VibrationSensor{}
	s.initBinary(SensorTypeVibration, name, opts)
	return s
}
