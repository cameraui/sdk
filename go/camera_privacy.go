package sdk

// CameraPrivacy is the privacy mode of a camera.
type CameraPrivacy struct {
	// Enabled reports whether privacy mode is on. Nobody sees the camera live, its snapshots or its shares.
	Enabled bool `msgpack:"enabled" json:"enabled"`
	// PauseRecording reports whether recording and detection pause too while privacy mode is on.
	PauseRecording bool `msgpack:"pauseRecording" json:"pauseRecording"`
	// Since is when privacy mode began (Unix ms), set by the server.
	Since int64 `msgpack:"since,omitempty" json:"since,omitempty"`
	// Until is when privacy mode ends by itself (Unix ms), zero while it has no end.
	Until int64 `msgpack:"until,omitempty" json:"until,omitempty"`
}
