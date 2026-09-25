package sdk

// PersonEmbeddingResult is the return value of PersonEmbedder.EmbedPersons.
type PersonEmbeddingResult struct {
	Embedding      []float64 `msgpack:"embedding" json:"embedding"`           // Embedding vector for the person in this crop, empty when the crop could not be embedded
	EmbeddingModel string    `msgpack:"embeddingModel" json:"embeddingModel"` // Identifier of the embedding model that produced the vector
}

// PersonEmbedder is implemented by plugins that turn the crop of a person
// into a vector of their appearance.
type PersonEmbedder interface {
	// ModelSpec declares the expected input dimensions and trigger labels.
	ModelSpec() ModelSpec
	// EmbedPersons embeds a batch of person crops, each cut tight around the
	// detected box and stretched to ModelSpec().Input. Must return exactly one
	// PersonEmbeddingResult per input frame, in the same order; return an
	// empty Embedding for a crop the model could not use.
	EmbedPersons(frames []VideoFrameData) ([]PersonEmbeddingResult, error)
}

// PersonEmbedderSensor is a frame-only sensor that turns person crops into
// vectors of their appearance, to find the same person again when no face is
// visible. Pair with a PersonEmbedder implementation.
//
// The crop is the person's box from the object detector, cut tight from the
// source frame. A vector describes clothing and build, not identity: it finds
// the same person on the same day, not after a change of clothes. Vectors from
// different models are not comparable, which is why every result carries its
// embedding model.
type PersonEmbedderSensor struct{ BaseSensor }

// NewPersonEmbedderSensor creates a person embedder sensor with the given name and options.
func NewPersonEmbedderSensor(name string, opts ...SensorOption) *PersonEmbedderSensor {
	s := &PersonEmbedderSensor{BaseSensor: NewBaseSensor(name, opts...)}
	s.requiresFrames = true
	return s
}

func (s *PersonEmbedderSensor) GetType() SensorType         { return SensorTypePersonEmbedder }
func (s *PersonEmbedderSensor) GetCategory() SensorCategory { return SensorCategorySensor }
func (s *PersonEmbedderSensor) ToJSON() sensorJSON          { return s.toBaseJSON(s.GetType(), s.GetCategory()) }

// UpdateValue on a read-only sensor: external writes are ignored.
func (s *PersonEmbedderSensor) UpdateValue(property string, value any) error {
	return nil
}
