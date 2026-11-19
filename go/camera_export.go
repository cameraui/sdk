package sdk

// CameraExportSettings decide how other apps reach a camera.
type CameraExportSettings struct {
	// Onvif gives the camera an ONVIF device of its own on OnvifPort.
	Onvif bool `msgpack:"onvif" json:"onvif"`
	// OnvifPort is the port of the camera's own ONVIF device, set while Onvif is on.
	OnvifPort int `msgpack:"onvifPort,omitempty" json:"onvifPort,omitempty"`
	// Rtmp offers the camera's streams on the RTMP server.
	Rtmp bool `msgpack:"rtmp" json:"rtmp"`
}
