package sdk

// LicensePlateProperty is a property name of a license plate sensor.
type LicensePlateProperty = string

// Property names of a license plate sensor.
const (
	LicensePlatePropertyDetected   LicensePlateProperty = "detected"   // Whether any license plate is currently detected
	LicensePlatePropertyDetections LicensePlateProperty = "detections" // List of detected plates with OCR text. The plugin that owns the sensor does not get the backend's updates of it
	LicensePlatePropertyPlates     LicensePlateProperty = "plates"     // Plate texts recognized during the active detection phase
)

// LicensePlateDetection is a license plate detection result, extending
// Detection with OCR fields. The Attribute field of the embedded Detection
// is fixed to "license_plate".
type LicensePlateDetection struct {
	Detection
	PlateText     string  `msgpack:"plateText" json:"plateText"`                             // Recognized plate text (e.g. "ABC 1234")
	OcrConfidence float64 `msgpack:"ocrConfidence,omitempty" json:"ocrConfidence,omitempty"` // Average text recognition confidence (0-1), separate from the box confidence
}

// LicensePlateResult is the return value of LicensePlateDetector.DetectLicensePlates.
type LicensePlateResult struct {
	Detected   bool                    `msgpack:"detected" json:"detected"`     // Whether any license plate is detected in this frame
	Detections []LicensePlateDetection `msgpack:"detections" json:"detections"` // Detections emitted for this frame
}

// LicensePlateDetector is implemented by plugins that perform license plate
// detection and OCR.
type LicensePlateDetector interface {
	// ModelSpec declares the expected input dimensions and trigger labels. The
	// runtime scales frames to match.
	ModelSpec() ModelSpec
	// DetectLicensePlates analyzes a batch of frames pre-scaled to the ModelSpec
	// input: normally a vehicle region cropped by the upstream object detector,
	// but the whole scene when no decoded frame is available. Must return exactly
	// one result per input frame, in the same order.
	DetectLicensePlates(frames []VideoFrameData) ([]LicensePlateResult, error)
}

// LicensePlateSensor reports detected license plates and OCR results.
//
// Plugin authors call ReportDetections to push detected plates. The detected
// flag is auto-derived from the detection list.
type LicensePlateSensor struct{ BaseSensor }

// NewLicensePlateSensor creates a license plate sensor with the given name and options.
func NewLicensePlateSensor(name string, opts ...SensorOption) *LicensePlateSensor {
	s := &LicensePlateSensor{BaseSensor: NewBaseSensor(name, opts...)}
	s.writeState(map[string]any{
		LicensePlatePropertyDetected:   false,
		LicensePlatePropertyDetections: []LicensePlateDetection{},
		LicensePlatePropertyPlates:     []string{},
	})
	return s
}

func (s *LicensePlateSensor) GetType() SensorType         { return SensorTypeLicensePlate }
func (s *LicensePlateSensor) GetCategory() SensorCategory { return SensorCategorySensor }
func (s *LicensePlateSensor) ToJSON() sensorJSON {
	return s.toBaseJSON(s.GetType(), s.GetCategory())
}

// IsDetected reports whether any license plate is currently detected.
func (s *LicensePlateSensor) IsDetected() bool {
	v, _ := s.GetValue(LicensePlatePropertyDetected).(bool)
	return v
}

// GetDetections returns the detected plates with OCR text. The plugin that owns the sensor does not get the backend's updates of it.
func (s *LicensePlateSensor) GetDetections() []LicensePlateDetection {
	v, _ := s.GetValue(LicensePlatePropertyDetections).([]LicensePlateDetection)
	return v
}

// GetPlates returns the plate texts recognized during the active detection
// phase.
func (s *LicensePlateSensor) GetPlates() []string {
	v, _ := s.GetValue(LicensePlatePropertyPlates).([]string)
	return v
}

// ReportDetections reports detected license plates.
//
//   - ReportDetections(true, nil): plate detected without specifics, the SDK
//     synthesizes a single full-frame detection with empty plateText.
//   - ReportDetections(true, [...]): explicit plate detections with OCR text.
//   - ReportDetections(false, nil): clear.
//
// Example:
//
//	sensor.ReportDetections(true, []LicensePlateDetection{
//	    {Detection: Detection{Label: "vehicle", Confidence: 0.93, Box: &BoundingBox{X: 0.2, Y: 0.5, Width: 0.2, Height: 0.08}, Attribute: "license_plate"}, PlateText: "ABC 1234"},
//	})
//	sensor.ReportDetections(false, nil)
func (s *LicensePlateSensor) ReportDetections(detected bool, detections []LicensePlateDetection) {
	list := normalizeReportedDetections(detected, detections, func(d *LicensePlateDetection) *Detection { return &d.Detection }, "vehicle", "license_plate")
	state := map[string]any{
		LicensePlatePropertyDetected:   detected,
		LicensePlatePropertyDetections: list,
	}
	// plates accumulate while they stay visible, so automations don't flap when the OCR misses a frame
	recognized := make([]string, 0, len(list))
	for _, d := range list {
		if d.PlateText != "" {
			recognized = append(recognized, d.PlateText)
		}
	}
	if !detected {
		state[LicensePlatePropertyPlates] = []string{}
	} else if len(recognized) > 0 {
		state[LicensePlatePropertyPlates] = mergeSortedUnique(s.GetPlates(), recognized)
	}
	s.writeState(state)
}

// ClearDetections explicitly clears license plate state (detected = false, detections = []).
func (s *LicensePlateSensor) ClearDetections() {
	s.ReportDetections(false, nil)
}

// LicensePlateDetectorSensor is a license plate sensor that consumes video
// frames from the backend pipeline. Pair with a LicensePlateDetector
// implementation.
type LicensePlateDetectorSensor struct {
	LicensePlateSensor
}

// NewLicensePlateDetectorSensor creates a license plate detector sensor with the given name and options.
func NewLicensePlateDetectorSensor(name string, opts ...SensorOption) *LicensePlateDetectorSensor {
	s := &LicensePlateDetectorSensor{LicensePlateSensor: *NewLicensePlateSensor(name, opts...)}
	s.requiresFrames = true
	return s
}
