package sdk

import rpc "github.com/cameraui/rpc/go"

// ObjectProperty is a property name of an object detection sensor.
type ObjectProperty = string

// Property names of an object detection sensor.
const (
	ObjectPropertyDetected         ObjectProperty = "detected"         // Whether any object is currently detected
	ObjectPropertyDetections       ObjectProperty = "detections"       // List of detected objects with labels and bounding boxes. The plugin that owns the sensor does not get the backend's updates of it
	ObjectPropertyLabels           ObjectProperty = "labels"           // Unique labels of the current detections (auto-derived when reporting detections)
	ObjectPropertyStaticDetections ObjectProperty = "staticDetections" // Settled objects hidden from events, kept visible for overlays. Written by the backend. The plugin that owns the sensor does not get the backend's updates of it
)

var _ rpc.RPCMethodConcurrency = (*ObjectDetectorSensor)(nil)

// TrackVelocity is the signed centroid velocity in normalized units per second.
// Prefer it over deriving velocity from frame-to-frame position deltas.
type TrackVelocity struct {
	// X is the horizontal velocity, positive moves right.
	X float64 `msgpack:"x" json:"x"`
	// Y is the vertical velocity, positive moves down.
	Y float64 `msgpack:"y" json:"y"`
}

// TrackedDetection extends Detection with tracking metadata (stable IDs,
// velocity). Tracking fields are omitempty: plugins return plain Detection and
// the server-side tracker fills these in.
type TrackedDetection struct {
	Detection
	TrackId         *int           `msgpack:"trackId,omitempty" json:"trackId,omitempty"`                 // Stable sequential ID for this object across frames
	TrackAge        *int           `msgpack:"trackAge,omitempty" json:"trackAge,omitempty"`               // Number of frames this object has been continuously tracked
	TrackSpeed      *float64       `msgpack:"trackSpeed,omitempty" json:"trackSpeed,omitempty"`           // Velocity magnitude in normalized units per second
	TrackVelocity   *TrackVelocity `msgpack:"trackVelocity,omitempty" json:"trackVelocity,omitempty"`     // Signed centroid velocity in normalized units per second
	TrackLost       *bool          `msgpack:"trackLost,omitempty" json:"trackLost,omitempty"`             // True if the object was not matched in the current frame
	StationarySince *float64       `msgpack:"stationarySince,omitempty" json:"stationarySince,omitempty"` // Epoch ms since the object has been still; only present while it is settled
}

// ObjectResult is the return value of ObjectDetector.DetectObjects.
type ObjectResult struct {
	Detected   bool               `msgpack:"detected" json:"detected"`     // Whether any object is detected in this frame
	Detections []TrackedDetection `msgpack:"detections" json:"detections"` // Detections emitted for this frame
}

// ObjectDetector is implemented by plugins that detect objects in video
// frames. The runtime scales frames to match ModelSpec before each call.
type ObjectDetector interface {
	// ModelSpec declares the expected input dimensions.
	ModelSpec() ObjectModelSpec
	// DetectObjects analyzes a single video frame and returns the object result.
	DetectObjects(frame VideoFrameData) (*ObjectResult, error)
}

// ObjectSensor reports detected objects (person, vehicle, animal, etc.).
//
// Plugin authors call ReportDetections to push detection results. The detected
// flag and the labels are auto-derived from the detection list.
type ObjectSensor struct {
	BaseSensor
}

// NewObjectSensor creates an object sensor with the given name and options.
func NewObjectSensor(name string, opts ...SensorOption) *ObjectSensor {
	s := &ObjectSensor{BaseSensor: NewBaseSensor(name, opts...)}
	s.writeState(map[string]any{
		ObjectPropertyDetected:   false,
		ObjectPropertyDetections: []TrackedDetection{},
		ObjectPropertyLabels:     []string{},
	})
	return s
}

func (s *ObjectSensor) GetType() SensorType         { return SensorTypeObject }
func (s *ObjectSensor) GetCategory() SensorCategory { return SensorCategorySensor }
func (s *ObjectSensor) ToJSON() sensorJSON          { return s.toBaseJSON(s.GetType(), s.GetCategory()) }

// IsDetected reports whether any object is currently detected.
func (s *ObjectSensor) IsDetected() bool {
	v, _ := s.GetValue(ObjectPropertyDetected).(bool)
	return v
}

// GetDetections returns the detected objects with labels and bounding boxes. The plugin that owns the sensor does not get the backend's updates of it.
func (s *ObjectSensor) GetDetections() []TrackedDetection {
	v, _ := s.GetValue(ObjectPropertyDetections).([]TrackedDetection)
	return v
}

// GetLabels returns the unique labels of the current detections (auto-derived when reporting detections).
func (s *ObjectSensor) GetLabels() []string {
	v, _ := s.GetValue(ObjectPropertyLabels).([]string)
	return v
}

// ReportDetections reports detected objects. The detected flag and the labels
// are auto-derived from the detection list.
//
//   - ReportDetections(true, nil): generic trigger, synthesizes a single
//     full-frame "motion" detection as a fallback.
//   - ReportDetections(true, [...]): explicit detections.
//   - ReportDetections(false, nil): clear.
//
// Example:
//
//	sensor.ReportDetections(true, []TrackedDetection{
//	    {Detection: Detection{Label: "person", Confidence: 0.92, Box: &BoundingBox{X: 0.1, Y: 0.2, Width: 0.3, Height: 0.4}}},
//	})
//	sensor.ReportDetections(false, nil)
func (s *ObjectSensor) ReportDetections(detected bool, detections []TrackedDetection) {
	list := normalizeReportedDetections(detected, detections, func(d *TrackedDetection) *Detection { return &d.Detection }, "motion", "")
	labels := dedupLabels(list)
	s.writeState(map[string]any{
		ObjectPropertyDetected:   detected,
		ObjectPropertyDetections: list,
		ObjectPropertyLabels:     labels,
	})
}

// ClearDetections explicitly clears detection state (detected = false, detections = [], labels = []).
func (s *ObjectSensor) ClearDetections() {
	s.ReportDetections(false, nil)
}

// ObjectDetectorSensor is an object sensor that consumes video frames from
// the backend pipeline. Pair with an ObjectDetector implementation. Up to
// three DetectObjects calls can run at once on separate goroutines, so
// DetectObjects must be safe for concurrent use, or the embedding type
// declares its own RPCConcurrency returning nil to get one call at a time.
type ObjectDetectorSensor struct {
	ObjectSensor
}

// NewObjectDetectorSensor creates an object detector sensor with the given name and options.
func NewObjectDetectorSensor(name string, opts ...SensorOption) *ObjectDetectorSensor {
	s := &ObjectDetectorSensor{ObjectSensor: *NewObjectSensor(name, opts...)}
	s.requiresFrames = true
	return s
}

// RPCConcurrency returns how many calls per method the backend may run at
// once, keyed by wire name. A detector overrides it to change the limit.
//
// Example:
//
//	func (d *MyDetector) RPCConcurrency() map[string]int { return nil }
func (s *ObjectDetectorSensor) RPCConcurrency() map[string]int {
	return map[string]int{"detectObjects": 3}
}

func dedupLabels(detections []TrackedDetection) []string {
	seen := make(map[string]struct{})
	result := make([]string, 0, len(detections))
	for _, d := range detections {
		if d.Label == "" {
			continue
		}
		if _, ok := seen[d.Label]; ok {
			continue
		}
		seen[d.Label] = struct{}{}
		result = append(result, d.Label)
	}
	return result
}
