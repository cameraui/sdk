package sdk

// ObjectMask is the outline of one object: a mask laid over its box.
type ObjectMask struct {
	Box    BoundingBox `msgpack:"box" json:"box"`       // Box the mask covers, normalized to the image the object was found in
	Width  int         `msgpack:"width" json:"width"`   // Mask width in pixels
	Height int         `msgpack:"height" json:"height"` // Mask height in pixels
	Data   []byte      `msgpack:"data" json:"data"`     // One byte per pixel, row by row from the top left: how likely the pixel belongs to the object (0 - 255). Above 127 counts as the object
}

// SegmentationFrame is a crop handed to Segmenter.SegmentObjects, with the
// object it was cut for.
type SegmentationFrame struct {
	VideoFrameData `msgpack:",inline"`
	Box            BoundingBox `msgpack:"box" json:"box"` // Box of the object to outline, normalized to this crop
}

// SegmentationResult is the return value of Segmenter.SegmentObjects.
type SegmentationResult struct {
	Mask *ObjectMask `msgpack:"mask,omitempty" json:"mask,omitempty"` // The object's outline, nil when the model found no object at the box
}

// Segmenter is implemented by plugins that outline an object inside a crop.
type Segmenter interface {
	// ModelSpec declares the expected input dimensions and trigger labels.
	ModelSpec() ModelSpec
	// SegmentObjects outlines objects in batch. Each frame is a region around
	// one object, scaled to ModelSpec().Input, and carries the object's box.
	// Must return exactly one SegmentationResult per input frame, in the same
	// order; leave Mask nil when the model found no object at the box.
	SegmentObjects(frames []SegmentationFrame) ([]SegmentationResult, error)
}

// SegmenterSensor is a frame-only sensor that outlines an object inside a
// crop. Pair with a Segmenter implementation.
//
// Each crop is a region around an object the object detector found, and the
// object's box inside it says which object is meant. The mask separates the
// object from its background, but not from a neighbour the detector saw as
// part of it: two people in one box come back as one outline.
type SegmenterSensor struct{ BaseSensor }

// NewSegmenterSensor creates a segmenter sensor with the given name and options.
func NewSegmenterSensor(name string, opts ...SensorOption) *SegmenterSensor {
	s := &SegmenterSensor{BaseSensor: NewBaseSensor(name, opts...)}
	s.requiresFrames = true
	return s
}

func (s *SegmenterSensor) GetType() SensorType         { return SensorTypeSegmenter }
func (s *SegmenterSensor) GetCategory() SensorCategory { return SensorCategorySensor }
func (s *SegmenterSensor) ToJSON() sensorJSON          { return s.toBaseJSON(s.GetType(), s.GetCategory()) }

// UpdateValue on a read-only sensor: external writes are ignored.
func (s *SegmenterSensor) UpdateValue(property string, value any) error {
	return nil
}
