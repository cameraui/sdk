package sdk

// RecordingMode selects how recordings are captured.
type RecordingMode string

const (
	// RecordingModeContinuous records around the clock.
	RecordingModeContinuous RecordingMode = "continuous"
	// RecordingModeEvent records only around detections, padded by the pre-buffer.
	RecordingModeEvent RecordingMode = "event"
	// RecordingModeAdhoc connects and records only while a detection event runs.
	RecordingModeAdhoc RecordingMode = "adhoc"
)

// RecordingSource is a stream tier to record.
type RecordingSource string

const (
	// RecordingSourceHigh is the high resolution stream.
	RecordingSourceHigh RecordingSource = "high"
	// RecordingSourceMid is the mid resolution stream.
	RecordingSourceMid RecordingSource = "mid"
	// RecordingSourceLow is the low resolution stream.
	RecordingSourceLow RecordingSource = "low"
)

// CameraRecordingSettings is the recording settings for a camera.
type CameraRecordingSettings struct {
	// Enabled reports whether recording is enabled.
	Enabled bool `msgpack:"enabled" json:"enabled"`
	// Mode is the recording mode.
	Mode RecordingMode `msgpack:"mode,omitempty" json:"mode"`
	// PreBuffer is the seconds of video kept before an event (event mode, 0 - 60).
	PreBuffer float64 `msgpack:"preBuffer,omitempty" json:"preBuffer"`
	// Sources are the stream tiers to record.
	Sources []RecordingSource `msgpack:"sources,omitempty" json:"sources,omitempty"`
	// Paused reports whether recording is paused. A paused camera keeps its place among the recording cameras.
	Paused bool `msgpack:"paused,omitempty" json:"paused,omitempty"`
	// PausedSince is when the pause began (Unix ms), set by the server.
	PausedSince int64 `msgpack:"pausedSince,omitempty" json:"pausedSince,omitempty"`
	// PausedUntil is when the pause ends by itself (Unix ms), zero while it has no end.
	PausedUntil int64 `msgpack:"pausedUntil,omitempty" json:"pausedUntil,omitempty"`
}
