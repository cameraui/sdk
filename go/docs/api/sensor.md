# Sensors

Detection sensors (motion, object, face, license-plate, audio, classifier, clip), smart-home sensors and accessories (contact, lock, light, cover, thermostat, media player, environmental readings and the rest) and PTZ. Plus the sensor-level model specs and shared detection types (`Detection`, `BoundingBox`, `TrackedDetection`).

!!! note
    The reference below is auto-generated from Go doc comments via [`gomarkdoc`](https://github.com/princjef/gomarkdoc). Re-run `scripts/gen-api-docs.sh` to refresh it.

<a name="UpdateModelSpec"></a>
## func UpdateModelSpec

	func UpdateModelSpec(sensor Sensor)

UpdateModelSpec re\-announces a detector's model spec, e.g. once its models finished loading: what a detector reports at registration is only what it knew then, models loading in the background are missing from it. sensor must be the concrete sensor value.

<a name="AccessAttempt"></a>
## type AccessAttempt

AccessAttempt holds the details of an access attempt, as the device reports them.

	type AccessAttempt struct {
	    // Method is how the attempt was made.
	    Method AccessMethod
	    // User is who made it, when the device knows.
	    User string
	}

<a name="AccessMethod"></a>
## type AccessMethod

AccessMethod is how an access attempt was made.

	type AccessMethod string

<a name="AccessMethodFingerprint"></a>

	const (
	    AccessMethodFingerprint AccessMethod = "fingerprint" // Fingerprint
	    AccessMethodNfc         AccessMethod = "nfc"         // NFC card or tag
	    AccessMethodPin         AccessMethod = "pin"         // PIN code
	    AccessMethodFace        AccessMethod = "face"        // Face recognition at the device
	    AccessMethodApp         AccessMethod = "app"         // App on a phone
	)

<a name="AccessProperty"></a>
## type AccessProperty

AccessProperty is a property name of an access reader.

	type AccessProperty = string

<a name="AccessPropertyResult"></a>Property names of an access reader.

	const (
	    AccessPropertyResult AccessProperty = "result" // Result of the attempt in progress, empty between attempts
	    AccessPropertyMethod AccessProperty = "method" // How the last attempt was made
	    AccessPropertyUser   AccessProperty = "user"   // Who made the last attempt, empty when unknown
	)

<a name="AccessResult"></a>
## type AccessResult

AccessResult is the result of an access attempt.

	type AccessResult string

<a name="AccessResultGranted"></a>

	const (
	    AccessResultGranted AccessResult = "granted" // Access was granted
	    AccessResultDenied  AccessResult = "denied"  // Access was denied
	)

<a name="AccessTrigger"></a>
## type AccessTrigger

AccessTrigger is an access reader, such as a fingerprint or NFC reader on a doorbell or a keypad.

Call Report for each attempt: result is set and goes back to empty after accessAutoResetMs, method and user stay until the next attempt.

	type AccessTrigger struct {
	    BaseSensor
	    // contains filtered or unexported fields
	}

<a name="NewAccessTrigger"></a>
### func NewAccessTrigger

	func NewAccessTrigger(name string, opts ...SensorOption) *AccessTrigger

NewAccessTrigger creates an access reader with the given name and options.

<a name="AccessTrigger.GetCategory"></a>
### func \(\*AccessTrigger\) GetCategory

	func (s *AccessTrigger) GetCategory() SensorCategory



<a name="AccessTrigger.GetMethod"></a>
### func \(\*AccessTrigger\) GetMethod

	func (s *AccessTrigger) GetMethod() AccessMethod

GetMethod returns how the last attempt was made.

<a name="AccessTrigger.GetResult"></a>
### func \(\*AccessTrigger\) GetResult

	func (s *AccessTrigger) GetResult() AccessResult

GetResult returns the result of the attempt in progress, empty between attempts.

<a name="AccessTrigger.GetType"></a>
### func \(\*AccessTrigger\) GetType

	func (s *AccessTrigger) GetType() SensorType



<a name="AccessTrigger.GetUser"></a>
### func \(\*AccessTrigger\) GetUser

	func (s *AccessTrigger) GetUser() string

GetUser returns who made the last attempt, empty when unknown.

<a name="AccessTrigger.Report"></a>
### func \(\*AccessTrigger\) Report

	func (s *AccessTrigger) Report(result AccessResult, attempt AccessAttempt)

Report reports an access attempt. An attempt while the last result is still set counts as a new one.

Example:

	reader.Report(sdk.AccessResultGranted, sdk.AccessAttempt{Method: sdk.AccessMethodFingerprint, User: "Anna"})
	

<a name="AccessTrigger.ToJSON"></a>
### func \(\*AccessTrigger\) ToJSON

	func (s *AccessTrigger) ToJSON() sensorJSON



<a name="AccessTrigger.UpdateValue"></a>
### func \(\*AccessTrigger\) UpdateValue

	func (s *AccessTrigger) UpdateValue(string, any) error

UpdateValue ignores writes, attempts come from the device.

<a name="AirPurifierControl"></a>
## type AirPurifierControl

AirPurifierControl is an air purifier. Override SetOn, SetOff, SetSpeed, SetAuto, SetPreset and SetChildLock \(by embedding AirPurifierControl in your own type and shadowing the methods\) to drive hardware, then call the embedded AirPurifierControl's methods to sync the SDK state. Report what the purifier does and how its filter is with SetState, SetFilterLife and SetFilterChange.

Each optional part comes with its AirPurifierCapability constant. The presets it offers come as choices: SetPropertySpec\(AirPurifierPropertyPreset, &PropertySpecOverride\{Choices: ...\}\).

	type AirPurifierControl struct{ BaseSensor }

<a name="NewAirPurifierControl"></a>
### func NewAirPurifierControl

	func NewAirPurifierControl(name string, opts ...SensorOption) *AirPurifierControl

NewAirPurifierControl creates an air purifier with the given name and options.

<a name="AirPurifierControl.GetCategory"></a>
### func \(\*AirPurifierControl\) GetCategory

	func (s *AirPurifierControl) GetCategory() SensorCategory



<a name="AirPurifierControl.GetFilterLife"></a>
### func \(\*AirPurifierControl\) GetFilterLife

	func (s *AirPurifierControl) GetFilterLife() (int, bool)

GetFilterLife returns the filter life left in percent, false before the first report.

<a name="AirPurifierControl.GetPreset"></a>
### func \(\*AirPurifierControl\) GetPreset

	func (s *AirPurifierControl) GetPreset() string

GetPreset returns the active preset.

<a name="AirPurifierControl.GetSpeed"></a>
### func \(\*AirPurifierControl\) GetSpeed

	func (s *AirPurifierControl) GetSpeed() int

GetSpeed returns the speed in percent.

<a name="AirPurifierControl.GetState"></a>
### func \(\*AirPurifierControl\) GetState

	func (s *AirPurifierControl) GetState() AirPurifierState

GetState returns what the purifier does right now, empty before the first report.

<a name="AirPurifierControl.GetType"></a>
### func \(\*AirPurifierControl\) GetType

	func (s *AirPurifierControl) GetType() SensorType



<a name="AirPurifierControl.IsAuto"></a>
### func \(\*AirPurifierControl\) IsAuto

	func (s *AirPurifierControl) IsAuto() bool

IsAuto reports true while the purifier runs in its automatic mode.

<a name="AirPurifierControl.IsChildLocked"></a>
### func \(\*AirPurifierControl\) IsChildLocked

	func (s *AirPurifierControl) IsChildLocked() bool

IsChildLocked reports true while the buttons on the purifier are locked.

<a name="AirPurifierControl.IsOn"></a>
### func \(\*AirPurifierControl\) IsOn

	func (s *AirPurifierControl) IsOn() bool

IsOn reports true while the purifier is on.

<a name="AirPurifierControl.NeedsFilterChange"></a>
### func \(\*AirPurifierControl\) NeedsFilterChange

	func (s *AirPurifierControl) NeedsFilterChange() bool

NeedsFilterChange reports true when the filter needs a change.

<a name="AirPurifierControl.SetAuto"></a>
### func \(\*AirPurifierControl\) SetAuto

	func (s *AirPurifierControl) SetAuto(auto bool)

SetAuto switches the automatic mode on, or back to a set speed with false.

Example:

	purifier.SetAuto(true)
	

<a name="AirPurifierControl.SetChildLock"></a>
### func \(\*AirPurifierControl\) SetChildLock

	func (s *AirPurifierControl) SetChildLock(locked bool)

SetChildLock locks the buttons on the purifier, or unlocks them with false.

Example:

	purifier.SetChildLock(true)
	

<a name="AirPurifierControl.SetFilterChange"></a>
### func \(\*AirPurifierControl\) SetFilterChange

	func (s *AirPurifierControl) SetFilterChange(change bool)

SetFilterChange reports whether the filter needs a change.

Example:

	purifier.SetFilterChange(true)
	

<a name="AirPurifierControl.SetFilterLife"></a>
### func \(\*AirPurifierControl\) SetFilterLife

	func (s *AirPurifierControl) SetFilterLife(percent float64)

SetFilterLife reports how much filter life is left, 0 to 100 percent.

Example:

	purifier.SetFilterLife(35)
	

<a name="AirPurifierControl.SetOff"></a>
### func \(\*AirPurifierControl\) SetOff

	func (s *AirPurifierControl) SetOff()

SetOff turns the purifier off.

Example:

	purifier.SetOff()
	

<a name="AirPurifierControl.SetOn"></a>
### func \(\*AirPurifierControl\) SetOn

	func (s *AirPurifierControl) SetOn()

SetOn turns the purifier on.

Example:

	purifier.SetOn()
	

<a name="AirPurifierControl.SetPreset"></a>
### func \(\*AirPurifierControl\) SetPreset

	func (s *AirPurifierControl) SetPreset(value string)

SetPreset sets the preset, one of the preset choices.

Example:

	purifier.SetPreset("sleep")
	

<a name="AirPurifierControl.SetSpeed"></a>
### func \(\*AirPurifierControl\) SetSpeed

	func (s *AirPurifierControl) SetSpeed(speed int)

SetSpeed sets the speed, 0 to 100 percent.

Example:

	purifier.SetSpeed(60)
	

<a name="AirPurifierControl.SetState"></a>
### func \(\*AirPurifierControl\) SetState

	func (s *AirPurifierControl) SetState(value AirPurifierState)

SetState reports what the purifier does right now: inactive, idle or purifying.

Example:

	purifier.SetState(AirPurifierStateIdle)
	

<a name="AirPurifierControl.ToJSON"></a>
### func \(\*AirPurifierControl\) ToJSON

	func (s *AirPurifierControl) ToJSON() sensorJSON



<a name="AirPurifierControl.UpdateValue"></a>
### func \(\*AirPurifierControl\) UpdateValue

	func (s *AirPurifierControl) UpdateValue(property string, value any) error

UpdateValue routes generic property writes to the semantic setters.

<a name="AirPurifierProperty"></a>
## type AirPurifierProperty

AirPurifierProperty is a property name of an air purifier.

	type AirPurifierProperty = string

<a name="AirPurifierPropertyOn"></a>Property names of an air purifier.

	const (
	    AirPurifierPropertyOn           AirPurifierProperty = "on"           // True while the purifier is on, a command when written
	    AirPurifierPropertyState        AirPurifierProperty = "state"        // What the purifier does right now, an AirPurifierState
	    AirPurifierPropertySpeed        AirPurifierProperty = "speed"        // Speed in percent
	    AirPurifierPropertyAuto         AirPurifierProperty = "auto"         // True while the purifier runs in its automatic mode
	    AirPurifierPropertyPreset       AirPurifierProperty = "preset"       // Active preset, one of the choices the plugin sets
	    AirPurifierPropertyChildLock    AirPurifierProperty = "childLock"    // True while the buttons on the purifier are locked
	    AirPurifierPropertyFilterLife   AirPurifierProperty = "filterLife"   // Filter life left in percent
	    AirPurifierPropertyFilterChange AirPurifierProperty = "filterChange" // True when the filter needs a change
	)

<a name="AirPurifierState"></a>
## type AirPurifierState

AirPurifierState is what an air purifier does right now.

	type AirPurifierState = string

<a name="AirPurifierStateInactive"></a>States of an air purifier.

	const (
	    AirPurifierStateInactive  AirPurifierState = "inactive"
	    AirPurifierStateIdle      AirPurifierState = "idle"
	    AirPurifierStatePurifying AirPurifierState = "purifying"
	)

<a name="AirQualityInfo"></a>
## type AirQualityInfo

AirQualityInfo reports an overall air quality level and the readings the device has.

Set the capabilities to the readings the device offers. Without a level of its own from the plugin, the level follows the air quality index, else PM2.5.

	type AirQualityInfo struct {
	    BaseSensor
	    // contains filtered or unexported fields
	}

<a name="NewAirQualityInfo"></a>
### func NewAirQualityInfo

	func NewAirQualityInfo(name string, opts ...SensorOption) *AirQualityInfo

NewAirQualityInfo creates an air quality sensor with the given name and options.

<a name="AirQualityInfo.GetCategory"></a>
### func \(\*AirQualityInfo\) GetCategory

	func (s *AirQualityInfo) GetCategory() SensorCategory



<a name="AirQualityInfo.GetLevel"></a>
### func \(\*AirQualityInfo\) GetLevel

	func (s *AirQualityInfo) GetLevel() AirQualityLevel

GetLevel returns the overall air quality, empty while unknown.

<a name="AirQualityInfo.GetReading"></a>
### func \(\*AirQualityInfo\) GetReading

	func (s *AirQualityInfo) GetReading(property AirQualityProperty) float64

GetReading returns a reading, 0 when the device has none.

<a name="AirQualityInfo.GetType"></a>
### func \(\*AirQualityInfo\) GetType

	func (s *AirQualityInfo) GetType() SensorType



<a name="AirQualityInfo.SetLevel"></a>
### func \(\*AirQualityInfo\) SetLevel

	func (s *AirQualityInfo) SetLevel(value AirQualityLevel)

SetLevel reports the overall air quality as the device rates it. From then on the level no longer follows the readings.

Example:

	airQuality.SetLevel(sdk.AirQualityLevelGood)
	

<a name="AirQualityInfo.SetReading"></a>
### func \(\*AirQualityInfo\) SetReading

	func (s *AirQualityInfo) SetReading(property AirQualityProperty, value float64)

SetReading reports a reading. A value that is not a finite number is ignored, a negative one counts as 0.

Example:

	airQuality.SetReading(sdk.AirQualityPropertyPm25, 12.4)
	

<a name="AirQualityInfo.ToJSON"></a>
### func \(\*AirQualityInfo\) ToJSON

	func (s *AirQualityInfo) ToJSON() sensorJSON



<a name="AirQualityInfo.UpdateValue"></a>
### func \(\*AirQualityInfo\) UpdateValue

	func (s *AirQualityInfo) UpdateValue(string, any) error

UpdateValue ignores writes, readings come from the device.

<a name="AirQualityLevel"></a>
## type AirQualityLevel

AirQualityLevel is the overall air quality, from best to worst.

	type AirQualityLevel string

<a name="AirQualityLevelExcellent"></a>

	const (
	    AirQualityLevelExcellent AirQualityLevel = "excellent" // Clean air
	    AirQualityLevelGood      AirQualityLevel = "good"      // Good air
	    AirQualityLevelFair      AirQualityLevel = "fair"      // Acceptable air
	    AirQualityLevelInferior  AirQualityLevel = "inferior"  // Poor air for sensitive people
	    AirQualityLevelPoor      AirQualityLevel = "poor"      // Poor air
	)

<a name="AirQualityProperty"></a>
## type AirQualityProperty

AirQualityProperty is a property name of an air quality sensor.

	type AirQualityProperty = string

<a name="AirQualityPropertyLevel"></a>Property names of an air quality sensor.

	const (
	    AirQualityPropertyLevel AirQualityProperty = "level" // Overall air quality, empty while unknown
	    AirQualityPropertyAqi   AirQualityProperty = "aqi"   // Air quality index
	    AirQualityPropertyPm25  AirQualityProperty = "pm25"  // Fine particles up to 2.5 μm, in μg/m³
	    AirQualityPropertyPm10  AirQualityProperty = "pm10"  // Particles up to 10 μm, in μg/m³
	    AirQualityPropertyVoc   AirQualityProperty = "voc"   // Volatile organic compounds, in μg/m³
	    AirQualityPropertyNo2   AirQualityProperty = "no2"   // Nitrogen dioxide, in μg/m³
	)

<a name="AudioDetector"></a>
## type AudioDetector

AudioDetector is implemented by plugins that classify audio events. The runtime resamples and buffers audio to match ModelSpec before each call.

	type AudioDetector interface {
	    // ModelSpec declares the expected audio input format.
	    ModelSpec() AudioModelSpec
	    // DetectAudio analyzes a single audio frame and returns the audio result.
	    DetectAudio(audio AudioFrameData) (*AudioResult, error)
	}

<a name="AudioDetectorSensor"></a>
## type AudioDetectorSensor

AudioDetectorSensor is an audio sensor that consumes audio frames from the backend pipeline. Pair with an AudioDetector implementation.

	type AudioDetectorSensor struct {
	    AudioSensor
	}

<a name="NewAudioDetectorSensor"></a>
### func NewAudioDetectorSensor

	func NewAudioDetectorSensor(name string, opts ...SensorOption) *AudioDetectorSensor

NewAudioDetectorSensor creates an audio detector sensor with the given name and options.

<a name="AudioFormat"></a>
## type AudioFormat

AudioFormat identifies the sample format of an audio buffer.

	type AudioFormat string

<a name="AudioFormatPCM16"></a>Supported audio sample formats.

	const (
	    AudioFormatPCM16   AudioFormat = "pcm16"   // 16-bit signed integer PCM
	    AudioFormatFloat32 AudioFormat = "float32" // 32-bit float
	)

<a name="AudioFrameData"></a>
## type AudioFrameData

AudioFrameData is audio frame data delivered to audio detector sensors by the backend pipeline.

	type AudioFrameData struct {
	    CameraID   string      `msgpack:"cameraId" json:"cameraId"`     // Camera the frame originated from
	    Data       []byte      `msgpack:"data" json:"data"`             // Raw audio sample buffer
	    SampleRate int         `msgpack:"sampleRate" json:"sampleRate"` // Sample rate of the buffer in Hz
	    Channels   int         `msgpack:"channels" json:"channels"`     // Channel count of the buffer (typically 1 = mono)
	    Format     AudioFormat `msgpack:"format" json:"format"`         // Sample format: pcm16 = 16-bit signed integer PCM, float32 = 32-bit float
	    Decibels   float64     `msgpack:"decibels" json:"decibels"`     // Pre-computed decibel level for this frame, if available
	    Timestamp  int64       `msgpack:"timestamp" json:"timestamp"`   // Capture timestamp in milliseconds since epoch
	}

<a name="AudioInputSpec"></a>
## type AudioInputSpec

AudioInputSpec describes the expected audio input format for an audio detector model.

	type AudioInputSpec struct {
	    SampleRate      int         `msgpack:"sampleRate" json:"sampleRate"`                               // Sample rate in Hz the model expects
	    Channels        int         `msgpack:"channels" json:"channels"`                                   // Channel count the model expects (typically 1 = mono)
	    Format          AudioFormat `msgpack:"format" json:"format"`                                       // Sample format (pcm16 = 16-bit signed PCM, float32 = 32-bit float)
	    SamplesPerFrame int         `msgpack:"samplesPerFrame,omitempty" json:"samplesPerFrame,omitempty"` // Number of samples per audio frame; the backend buffers audio to deliver exactly this many samples per call
	}

<a name="AudioLabel"></a>
## type AudioLabel

AudioLabel is one of the built\-in audio labels, or any custom string emitted by an audio detector.

	type AudioLabel = string

<a name="AudioModelSpec"></a>
## type AudioModelSpec

AudioModelSpec describes an audio detection model.

	type AudioModelSpec struct {
	    ModelRuntime `msgpack:",inline"`
	    Input        AudioInputSpec `msgpack:"input" json:"input"` // Required input audio format
	}

<a name="AudioProperty"></a>
## type AudioProperty

AudioProperty is a property name of an audio sensor.

	type AudioProperty = string

<a name="AudioPropertyDetected"></a>Property names of an audio sensor.

	const (
	    AudioPropertyDetected      AudioProperty = "detected"      // Whether an audio event is currently detected
	    AudioPropertyDetections    AudioProperty = "detections"    // List of detected audio events (e.g. glass break, scream). The plugin that owns the sensor does not get the backend's updates of it
	    AudioPropertyDecibels      AudioProperty = "decibels"      // Current audio level in decibels. The plugin that owns the sensor does not get the backend's updates of it
	    AudioPropertyLastTriggered AudioProperty = "lastTriggered" // Timestamp in milliseconds of the last detection trigger, set by the backend
	)

<a name="AudioResult"></a>
## type AudioResult

AudioResult is the return value of AudioDetector.DetectAudio.

	type AudioResult struct {
	    Detected   bool        `msgpack:"detected" json:"detected"`     // Whether an audio event is detected in this frame
	    Detections []Detection `msgpack:"detections" json:"detections"` // Detections emitted for this frame
	    Decibels   float64     `msgpack:"decibels" json:"decibels"`     // Optional decibel level computed for this frame
	}

<a name="AudioSensor"></a>
## type AudioSensor

AudioSensor reports audio events and decibel levels.

Plugin authors call ReportDetections to push detected audio events \(the detected flag is auto\-derived from the list\) and SetDecibels to publish the audio level.

	type AudioSensor struct {
	    BaseSensor
	}

<a name="NewAudioSensor"></a>
### func NewAudioSensor

	func NewAudioSensor(name string, opts ...SensorOption) *AudioSensor

NewAudioSensor creates an audio sensor with the given name and options.

<a name="AudioSensor.ClearDetections"></a>
### func \(\*AudioSensor\) ClearDetections

	func (s *AudioSensor) ClearDetections()

ClearDetections explicitly clears audio detection state \(detected = false, detections = \[\]\).

<a name="AudioSensor.GetCategory"></a>
### func \(\*AudioSensor\) GetCategory

	func (s *AudioSensor) GetCategory() SensorCategory



<a name="AudioSensor.GetDecibels"></a>
### func \(\*AudioSensor\) GetDecibels

	func (s *AudioSensor) GetDecibels() float64

GetDecibels returns the current audio level in decibels. The plugin that owns the sensor does not get the backend's updates of it.

<a name="AudioSensor.GetDetections"></a>
### func \(\*AudioSensor\) GetDetections

	func (s *AudioSensor) GetDetections() []Detection

GetDetections returns the detected audio events \(e.g. glass break, scream\). The plugin that owns the sensor does not get the backend's updates of it.

<a name="AudioSensor.GetType"></a>
### func \(\*AudioSensor\) GetType

	func (s *AudioSensor) GetType() SensorType



<a name="AudioSensor.IsDetected"></a>
### func \(\*AudioSensor\) IsDetected

	func (s *AudioSensor) IsDetected() bool

IsDetected reports whether an audio event is currently detected.

<a name="AudioSensor.ReportDetections"></a>
### func \(\*AudioSensor\) ReportDetections

	func (s *AudioSensor) ReportDetections(detected bool, detections []Detection)

ReportDetections reports detected audio events.

- ReportDetections\(true, nil\): audio detected without specifics. The SDK synthesizes a single full\-frame "audio" detection.
- ReportDetections\(true, \[...\]\): audio detected with explicit detections.
- ReportDetections\(false, nil\): clear.

Example:

	sensor.ReportDetections(true, []Detection{
	    {Label: "glass_break", Confidence: 0.91, Box: &BoundingBox{X: 0, Y: 0, Width: 1, Height: 1}},
	})
	sensor.ReportDetections(false, nil)
	

<a name="AudioSensor.SetDecibels"></a>
### func \(\*AudioSensor\) SetDecibels

	func (s *AudioSensor) SetDecibels(value float64)

SetDecibels updates the current audio level \(in decibels\).

Example:

	sensor.SetDecibels(72)
	

<a name="AudioSensor.ToJSON"></a>
### func \(\*AudioSensor\) ToJSON

	func (s *AudioSensor) ToJSON() sensorJSON



<a name="AudioSensor.UpdateValue"></a>
### func \(\*AudioSensor\) UpdateValue

	func (s *AudioSensor) UpdateValue(property string, value any) error

UpdateValue on a read\-only sensor: external writes are ignored.

<a name="BaseSensor"></a>
## type BaseSensor

BaseSensor is the base struct for all sensors. Embed this in concrete sensor types.

Sensors are standalone entities: the plugin supplies the durable identity \(WithNativeID\), everything else belongs to the user: camera assignments, display name and whether the sensor is exported or not. A plugin never decides where its sensor is used and never handles the export itself.

	type BaseSensor struct {
	    // contains filtered or unexported fields
	}

<a name="NewBaseSensor"></a>
### func NewBaseSensor

	func NewBaseSensor(name string, opts ...SensorOption) BaseSensor

NewBaseSensor creates the embedded base for a concrete sensor type. The id it assigns is provisional until the host registers the sensor, and Storage stays nil until then.

Example:

	type MySensor struct{ sdk.BaseSensor }
	
	s := &MySensor{BaseSensor: sdk.NewBaseSensor("Front Door", sdk.WithNativeID("dev-1"))}
	

<a name="BaseSensor.AssignmentLocked"></a>
### func \(\*BaseSensor\) AssignmentLocked

	func (s *BaseSensor) AssignmentLocked() bool

AssignmentLocked reports whether the sensor is bound to the camera it was added to, so the user cannot assign it elsewhere.

<a name="BaseSensor.Connected"></a>
### func \(\*BaseSensor\) Connected

	func (s *BaseSensor) Connected() bool

Connected reports whether the sensor is registered and its plugin is connected.

<a name="BaseSensor.GetAddress"></a>
### func \(\*BaseSensor\) GetAddress

	func (s *BaseSensor) GetAddress() string

GetAddress returns the current address at the source, e.g. a Home Assistant entity id. Display only.

<a name="BaseSensor.GetAssignedCameraIDs"></a>
### func \(\*BaseSensor\) GetAssignedCameraIDs

	func (s *BaseSensor) GetAssignedCameraIDs() []string

GetAssignedCameraIDs returns the ids of the cameras the user assigned the sensor to.

<a name="BaseSensor.GetCapabilities"></a>
### func \(\*BaseSensor\) GetCapabilities

	func (s *BaseSensor) GetCapabilities() []string

GetCapabilities returns the capabilities the sensor advertises.

<a name="BaseSensor.GetDeviceInfo"></a>
### func \(\*BaseSensor\) GetDeviceInfo

	func (s *BaseSensor) GetDeviceInfo() *SensorDevice

GetDeviceInfo returns the device the sensor belongs to, nil without one and for a camera's own sensor.

<a name="BaseSensor.GetDisplayName"></a>
### func \(\*BaseSensor\) GetDisplayName

	func (s *BaseSensor) GetDisplayName() string

GetDisplayName returns the full name shown to the user: inside a device the device name plus the short name, otherwise the plugin's name until the user renames the sensor.

<a name="BaseSensor.GetID"></a>
### func \(\*BaseSensor\) GetID

	func (s *BaseSensor) GetID() string

GetID returns the entity id of the sensor, provisional on a new sensor until registration.

<a name="BaseSensor.GetName"></a>
### func \(\*BaseSensor\) GetName

	func (s *BaseSensor) GetName() string

GetName returns the name the plugin gave the sensor.

<a name="BaseSensor.GetNativeID"></a>
### func \(\*BaseSensor\) GetNativeID

	func (s *BaseSensor) GetNativeID() string

GetNativeID returns the durable identity the plugin supplied, e.g. an upstream device id.

<a name="BaseSensor.GetOrigin"></a>
### func \(\*BaseSensor\) GetOrigin

	func (s *BaseSensor) GetOrigin() string

GetOrigin returns the source system the sensor was imported from, e.g. "homeassistant".

<a name="BaseSensor.GetPluginID"></a>
### func \(\*BaseSensor\) GetPluginID

	func (s *BaseSensor) GetPluginID() string

GetPluginID returns the id of the plugin that owns the sensor, set at registration.

<a name="BaseSensor.GetPropertySpecs"></a>
### func \(\*BaseSensor\) GetPropertySpecs

	func (s *BaseSensor) GetPropertySpecs() map[string]SensorPropertySpec

GetPropertySpecs returns the specs of the properties the plugin narrowed or described, resolved against the type's. A property without an entry follows its type's spec.

<a name="BaseSensor.GetShortName"></a>
### func \(\*BaseSensor\) GetShortName

	func (s *BaseSensor) GetShortName() string

GetShortName returns the name inside its device, the same as GetDisplayName for a sensor without a device.

<a name="BaseSensor.GetSourceState"></a>
### func \(\*BaseSensor\) GetSourceState

	func (s *BaseSensor) GetSourceState() SensorSourceState

GetSourceState returns the state of the source behind an adopted sensor, as reported with SetSourceState.

<a name="BaseSensor.GetValue"></a>
### func \(\*BaseSensor\) GetValue

	func (s *BaseSensor) GetValue(property string) any

GetValue returns the current value of a sensor property.

<a name="BaseSensor.GetValues"></a>
### func \(\*BaseSensor\) GetValues

	func (s *BaseSensor) GetValues() map[string]any

GetValues returns a snapshot copy of all property values.

<a name="BaseSensor.HasCapability"></a>
### func \(\*BaseSensor\) HasCapability

	func (s *BaseSensor) HasCapability(cap string) bool

HasCapability reports whether the sensor advertises the given capability.

Example:

	dimmable := sensor.HasCapability(sdk.LightCapabilityBrightness)
	

<a name="BaseSensor.IsAssigned"></a>
### func \(\*BaseSensor\) IsAssigned

	func (s *BaseSensor) IsAssigned() bool

IsAssigned reports whether the sensor is assigned to at least one camera.

<a name="BaseSensor.OnAssignmentChanged"></a>
### func \(\*BaseSensor\) OnAssignmentChanged

	func (s *BaseSensor) OnAssignmentChanged(callback func([]string)) *Disposable

OnAssignmentChanged fires with the current camera id list whenever the user changes this sensor's camera assignments.

<a name="BaseSensor.OnCapabilitiesChanged"></a>
### func \(\*BaseSensor\) OnCapabilitiesChanged

	func (s *BaseSensor) OnCapabilitiesChanged(callback func([]string)) *Disposable

OnCapabilitiesChanged returns a Disposable that fires when capabilities change.

<a name="BaseSensor.OnConnectedChanged"></a>
### func \(\*BaseSensor\) OnConnectedChanged

	func (s *BaseSensor) OnConnectedChanged(callback func(bool)) *Disposable

OnConnectedChanged fires when the sensor's registration state changes.

<a name="BaseSensor.OnDeviceInfoChanged"></a>
### func \(\*BaseSensor\) OnDeviceInfoChanged

	func (s *BaseSensor) OnDeviceInfoChanged(callback func(*SensorDevice)) *Disposable

OnDeviceInfoChanged fires with the device whenever the sensor joins or leaves one, or its device, names or main\-sensor role change.

<a name="BaseSensor.OnPropertyChanged"></a>
### func \(\*BaseSensor\) OnPropertyChanged

	func (s *BaseSensor) OnPropertyChanged(callback func(SensorPropertyChange)) *Disposable

OnPropertyChanged subscribes to property changes. Returns a Disposable to unsubscribe.

<a name="BaseSensor.OnPropertySpecsChanged"></a>
### func \(\*BaseSensor\) OnPropertySpecsChanged

	func (s *BaseSensor) OnPropertySpecsChanged(callback func(map[string]SensorPropertySpec)) *Disposable

OnPropertySpecsChanged fires with the property specs whenever the plugin changes them.

<a name="BaseSensor.Primary"></a>
### func \(\*BaseSensor\) Primary

	func (s *BaseSensor) Primary() bool

Primary reports whether the sensor is the main sensor of its device, called like the device when it stands alone.

<a name="BaseSensor.SetAddress"></a>
### func \(\*BaseSensor\) SetAddress

	func (s *BaseSensor) SetAddress(address string)

SetAddress reports the sensor's current address at the source, e.g. after a Home Assistant entity was renamed. The identity \(nativeId\) stays.

Example:

	sensor.SetAddress(entry.EntityID)
	

<a name="BaseSensor.SetCapabilities"></a>
### func \(\*BaseSensor\) SetCapabilities

	func (s *BaseSensor) SetCapabilities(caps []string)

SetCapabilities replaces the advertised feature flags and notifies the backend plus local listeners.

Example:

	sensor.SetCapabilities([]string{sdk.LightCapabilityBrightness})
	

<a name="BaseSensor.SetDeviceInfo"></a>
### func \(\*BaseSensor\) SetDeviceInfo

	func (s *BaseSensor) SetDeviceInfo(device *DeviceInfo, primary bool)

SetDeviceInfo puts the sensor into a device, or takes it out with nil. Sensors of this plugin that report the same DeviceInfo.ID form one device. Pass the device with WithDevice when it is known at construction, call this for what changes later: a new firmware, a rename at the source. Only a change reaches the host. Ignored for a sensor added with CameraDevice.AddSensor, its camera is its device. primary marks the device's main sensor.

Example:

	sensor.SetDeviceInfo(&sdk.DeviceInfo{ID: hub.Serial, Name: hub.Name, Manufacturer: "Acme", Firmware: hub.Version}, true)
	

<a name="BaseSensor.SetDisplayName"></a>
### func \(\*BaseSensor\) SetDisplayName

	func (s *BaseSensor) SetDisplayName(name string)

SetDisplayName sets the display name \(the only mutable identifier on a sensor\). name is the human\-readable label shown in the UI.

Example:

	sensor.SetDisplayName("Front Door Motion")
	

<a name="BaseSensor.SetPropertySpec"></a>
### func \(\*BaseSensor\) SetPropertySpec

	func (s *BaseSensor) SetPropertySpec(property string, spec *PropertySpecOverride)

SetPropertySpec narrows or describes one property for this device: a range and step, the enum values it supports, the choices it offers with their names, a text limit. The host rejects a command outside it before it reaches the plugin. Pass it with WithPropertySpec when it is known at construction, call this for what changes later. Only a change reaches the host. A nil spec follows the type's spec again.

Example:

	alarm.SetPropertySpec(sdk.SecuritySystemPropertyTargetState, &sdk.PropertySpecOverride{
		Values: []any{sdk.SecuritySystemStateAwayArm, sdk.SecuritySystemStateStayArm, sdk.SecuritySystemStateDisarmed},
	})
	

<a name="BaseSensor.SetSourceState"></a>
### func \(\*BaseSensor\) SetSourceState

	func (s *BaseSensor) SetSourceState(state SensorSourceState)

SetSourceState reports what the source behind this sensor looks like right now. The host shows the state with its reason on the sensors page and never deletes on it. Only meaningful for adopted sensors.

Example:

	sensor.SetSourceState(sdk.SensorSourceStateRemoved)
	

<a name="BaseSensor.Storage"></a>
### func \(\*BaseSensor\) Storage

	func (s *BaseSensor) Storage() *DeviceStorage

Storage returns the per\-sensor storage, nil before registration.

<a name="BatteryInfo"></a>
## type BatteryInfo

BatteryInfo reports battery level, charging state, and low\-battery alerts.

Plugin authors call SetLevel, SetCharging, and SetLow to push updates from the device.

	type BatteryInfo struct{ BaseSensor }

<a name="NewBatteryInfo"></a>
### func NewBatteryInfo

	func NewBatteryInfo(name string, opts ...SensorOption) *BatteryInfo

NewBatteryInfo creates a battery info sensor with the given name and options.

<a name="BatteryInfo.GetCategory"></a>
### func \(\*BatteryInfo\) GetCategory

	func (s *BatteryInfo) GetCategory() SensorCategory



<a name="BatteryInfo.GetCharging"></a>
### func \(\*BatteryInfo\) GetCharging

	func (s *BatteryInfo) GetCharging() ChargingState

GetCharging returns the current charging state.

<a name="BatteryInfo.GetLevel"></a>
### func \(\*BatteryInfo\) GetLevel

	func (s *BatteryInfo) GetLevel() int

GetLevel returns the battery level percentage \(0\-100\).

<a name="BatteryInfo.GetType"></a>
### func \(\*BatteryInfo\) GetType

	func (s *BatteryInfo) GetType() SensorType



<a name="BatteryInfo.IsLow"></a>
### func \(\*BatteryInfo\) IsLow

	func (s *BatteryInfo) IsLow() bool

IsLow reports whether the battery is critically low.

<a name="BatteryInfo.SetCharging"></a>
### func \(\*BatteryInfo\) SetCharging

	func (s *BatteryInfo) SetCharging(value ChargingState)

SetCharging sets the charging state.

Example:

	battery.SetCharging(ChargingStateCharging)
	

<a name="BatteryInfo.SetLevel"></a>
### func \(\*BatteryInfo\) SetLevel

	func (s *BatteryInfo) SetLevel(value int)

SetLevel reports a new battery level percentage, clamped to \[0,100\].

Example:

	battery.SetLevel(87)
	

<a name="BatteryInfo.SetLow"></a>
### func \(\*BatteryInfo\) SetLow

	func (s *BatteryInfo) SetLow(value bool)

SetLow sets the low\-battery alert flag.

Example:

	battery.SetLow(true)
	

<a name="BatteryInfo.ToJSON"></a>
### func \(\*BatteryInfo\) ToJSON

	func (s *BatteryInfo) ToJSON() sensorJSON



<a name="BatteryInfo.UpdateValue"></a>
### func \(\*BatteryInfo\) UpdateValue

	func (s *BatteryInfo) UpdateValue(property string, value any) error

UpdateValue on a read\-only sensor: external writes are ignored.

<a name="BatteryProperty"></a>
## type BatteryProperty

BatteryProperty is a property name of a battery info sensor.

	type BatteryProperty = string

<a name="BatteryPropertyLevel"></a>Property names of a battery info sensor.

	const (
	    BatteryPropertyLevel    BatteryProperty = "level"    // Battery level percentage (0-100)
	    BatteryPropertyCharging BatteryProperty = "charging" // Current charging state
	    BatteryPropertyLow      BatteryProperty = "low"      // Whether the battery is critically low
	)

<a name="BinarySensor"></a>
## type BinarySensor

BinarySensor is the base of the sensors that report one condition as on or off, such as smoke, a leak or an open contact. The concrete sensor types embed it.

	type BinarySensor struct {
	    BaseSensor
	    // contains filtered or unexported fields
	}

<a name="BinarySensor.GetCategory"></a>
### func \(\*BinarySensor\) GetCategory

	func (s *BinarySensor) GetCategory() SensorCategory



<a name="BinarySensor.GetType"></a>
### func \(\*BinarySensor\) GetType

	func (s *BinarySensor) GetType() SensorType



<a name="BinarySensor.IsDetected"></a>
### func \(\*BinarySensor\) IsDetected

	func (s *BinarySensor) IsDetected() bool

IsDetected reports whether the sensor currently detects its condition.

<a name="BinarySensor.SetDetected"></a>
### func \(\*BinarySensor\) SetDetected

	func (s *BinarySensor) SetDetected(detected bool)

SetDetected reports whether the condition is currently detected.

Example:

	sensor.SetDetected(true)
	

<a name="BinarySensor.ToJSON"></a>
### func \(\*BinarySensor\) ToJSON

	func (s *BinarySensor) ToJSON() sensorJSON



<a name="BinarySensor.UpdateValue"></a>
### func \(\*BinarySensor\) UpdateValue

	func (s *BinarySensor) UpdateValue(property string, value any) error

UpdateValue on a read\-only sensor: external writes are ignored.

<a name="BoundingBox"></a>
## type BoundingBox

BoundingBox is the bounding box of a detection. All coordinates are normalized to 0\-1 \(fraction of frame dimensions\), so they are independent of resolution.

	type BoundingBox struct {
	    X      float64 `msgpack:"x" json:"x"`           // X coordinate of the top-left corner (0-1)
	    Y      float64 `msgpack:"y" json:"y"`           // Y coordinate of the top-left corner (0-1)
	    Width  float64 `msgpack:"width" json:"width"`   // Width as a fraction of frame width (0-1)
	    Height float64 `msgpack:"height" json:"height"` // Height as a fraction of frame height (0-1)
	}

<a name="ButtonConfig"></a>
## type ButtonConfig

ButtonConfig describes a button at construction.

	type ButtonConfig struct {
	    // Index is the position of the button on its device, from 1, e.g. for HomeKit's button order.
	    Index int
	    // Presses lists the kinds of press the button reports besides a single press.
	    Presses []ButtonPress
	}

<a name="ButtonPress"></a>
## type ButtonPress

ButtonPress is how a button was pressed.

	type ButtonPress string

<a name="ButtonPressSingle"></a>

	const (
	    ButtonPressSingle ButtonPress = "single" // One short press
	    ButtonPressDouble ButtonPress = "double" // Two short presses in a row
	    ButtonPressLong   ButtonPress = "long"   // A press held down
	)

<a name="ButtonProperty"></a>
## type ButtonProperty

ButtonProperty is a property name of a button.

	type ButtonProperty = string

<a name="ButtonPropertyPress"></a>Property names of a button.

	const (
	    ButtonPropertyPress ButtonProperty = "press" // Kind of the press in progress, empty between presses
	    ButtonPropertyIndex ButtonProperty = "index" // Position of the button on its device, from 1, 0 leaves the order to the creation order
	)

<a name="ButtonTrigger"></a>
## type ButtonTrigger

ButtonTrigger is a physical button, such as one on a remote or a wall switch.

Call Press when the device reports a press: press is set to its kind and goes back to empty after pressAutoResetMs. A single press is always offered, double and long presses only when listed in ButtonConfig.Presses.

	type ButtonTrigger struct {
	    BaseSensor
	    // contains filtered or unexported fields
	}

<a name="NewButtonTrigger"></a>
### func NewButtonTrigger

	func NewButtonTrigger(name string, config ButtonConfig, opts ...SensorOption) *ButtonTrigger

NewButtonTrigger creates a button with the given name, config and options.

<a name="ButtonTrigger.GetCategory"></a>
### func \(\*ButtonTrigger\) GetCategory

	func (s *ButtonTrigger) GetCategory() SensorCategory



<a name="ButtonTrigger.GetIndex"></a>
### func \(\*ButtonTrigger\) GetIndex

	func (s *ButtonTrigger) GetIndex() int

GetIndex returns the position of the button on its device, 0 when not set.

<a name="ButtonTrigger.GetPress"></a>
### func \(\*ButtonTrigger\) GetPress

	func (s *ButtonTrigger) GetPress() ButtonPress

GetPress returns the kind of the press in progress, empty between presses.

<a name="ButtonTrigger.GetType"></a>
### func \(\*ButtonTrigger\) GetType

	func (s *ButtonTrigger) GetType() SensorType



<a name="ButtonTrigger.Press"></a>
### func \(\*ButtonTrigger\) Press

	func (s *ButtonTrigger) Press(kind ButtonPress) error

Press reports a press. A press while the last one is still set counts as a new one. It fails when the button does not offer this kind of press.

Example:

	err := button.Press(sdk.ButtonPressDouble)
	

<a name="ButtonTrigger.ToJSON"></a>
### func \(\*ButtonTrigger\) ToJSON

	func (s *ButtonTrigger) ToJSON() sensorJSON



<a name="ButtonTrigger.UpdateValue"></a>
### func \(\*ButtonTrigger\) UpdateValue

	func (s *ButtonTrigger) UpdateValue(string, any) error

UpdateValue ignores writes, presses come from the device.

<a name="CarbonDioxideInfo"></a>
## type CarbonDioxideInfo

CarbonDioxideInfo reports the current CO2 concentration in ppm.

	type CarbonDioxideInfo struct{ MeasurementInfo }

<a name="NewCarbonDioxideInfo"></a>
### func NewCarbonDioxideInfo

	func NewCarbonDioxideInfo(name string, opts ...SensorOption) *CarbonDioxideInfo

NewCarbonDioxideInfo creates a carbon dioxide info sensor with the given name and options.

<a name="CarbonDioxideProperty"></a>
## type CarbonDioxideProperty

CarbonDioxideProperty is a property name of a carbon dioxide sensor.

	type CarbonDioxideProperty = string

<a name="CarbonDioxidePropertyCurrent"></a>Property names of a carbon dioxide sensor.

	const (
	    CarbonDioxidePropertyCurrent CarbonDioxideProperty = "current" // Current CO2 concentration in parts per million
	)

<a name="CarbonMonoxideProperty"></a>
## type CarbonMonoxideProperty

CarbonMonoxideProperty is a property name of a carbon monoxide sensor.

	type CarbonMonoxideProperty = string

<a name="CarbonMonoxidePropertyDetected"></a>Property names of a carbon monoxide sensor.

	const (
	    CarbonMonoxidePropertyDetected CarbonMonoxideProperty = "detected" // Whether carbon monoxide is detected
	)

<a name="CarbonMonoxideSensor"></a>
## type CarbonMonoxideSensor

CarbonMonoxideSensor reports carbon monoxide detection state.

	type CarbonMonoxideSensor struct{ BinarySensor }

<a name="NewCarbonMonoxideSensor"></a>
### func NewCarbonMonoxideSensor

	func NewCarbonMonoxideSensor(name string, opts ...SensorOption) *CarbonMonoxideSensor

NewCarbonMonoxideSensor creates a carbon monoxide sensor with the given name and options.

<a name="ChargingState"></a>
## type ChargingState

ChargingState defines battery charging states.

	type ChargingState string

<a name="ChargingStateNotCharging"></a>

	const (
	    ChargingStateNotCharging   ChargingState = "NOT_CHARGING"   // Battery is not charging
	    ChargingStateNotChargeable ChargingState = "NOT_CHARGEABLE" // Device has no rechargeable battery
	    ChargingStateCharging      ChargingState = "CHARGING"       // Battery is currently charging
	    ChargingStateFull          ChargingState = "FULL"           // Battery is fully charged
	)

<a name="ChimeControl"></a>
## type ChimeControl

ChimeControl is a chime, such as a door chime or a speaker that plays ringtones. Offer the device's tones with SetPropertySpec\(ChimePropertyTone\) and its Choices. Override Play \(by embedding ChimeControl in your own type and shadowing the method\) to drive your hardware, then call the embedded method to sync the SDK state, and call Stop when the device reports the end. Without that the chime counts as done after chimeAutoResetMs.

	type ChimeControl struct {
	    BaseSensor
	    // contains filtered or unexported fields
	}

<a name="NewChimeControl"></a>
### func NewChimeControl

	func NewChimeControl(name string, opts ...SensorOption) *ChimeControl

NewChimeControl creates a chime with the given name and options.

<a name="ChimeControl.GetCategory"></a>
### func \(\*ChimeControl\) GetCategory

	func (s *ChimeControl) GetCategory() SensorCategory



<a name="ChimeControl.GetRepeat"></a>
### func \(\*ChimeControl\) GetRepeat

	func (s *ChimeControl) GetRepeat() int

GetRepeat returns how often the tone plays.

<a name="ChimeControl.GetTone"></a>
### func \(\*ChimeControl\) GetTone

	func (s *ChimeControl) GetTone() string

GetTone returns the tone the chime plays.

<a name="ChimeControl.GetType"></a>
### func \(\*ChimeControl\) GetType

	func (s *ChimeControl) GetType() SensorType



<a name="ChimeControl.GetVolume"></a>
### func \(\*ChimeControl\) GetVolume

	func (s *ChimeControl) GetVolume() int

GetVolume returns the volume level \(0\-100\).

<a name="ChimeControl.IsActive"></a>
### func \(\*ChimeControl\) IsActive

	func (s *ChimeControl) IsActive() bool

IsActive reports whether the chime is playing.

<a name="ChimeControl.Play"></a>
### func \(\*ChimeControl\) Play

	func (s *ChimeControl) Play()

Play plays the tone.

Example:

	chime.Play()
	

<a name="ChimeControl.SetRepeat"></a>
### func \(\*ChimeControl\) SetRepeat

	func (s *ChimeControl) SetRepeat(value int)

SetRepeat sets how often the tone plays \(clamped to \[1,10\]\).

Example:

	chime.SetRepeat(2)
	

<a name="ChimeControl.SetTone"></a>
### func \(\*ChimeControl\) SetTone

	func (s *ChimeControl) SetTone(value string)

SetTone chooses the tone, one of the tones offered as choices.

Example:

	chime.SetTone("ding-dong")
	

<a name="ChimeControl.SetVolume"></a>
### func \(\*ChimeControl\) SetVolume

	func (s *ChimeControl) SetVolume(value int)

SetVolume sets the chime volume \(clamped to \[0,100\]\).

Example:

	chime.SetVolume(60)
	

<a name="ChimeControl.Stop"></a>
### func \(\*ChimeControl\) Stop

	func (s *ChimeControl) Stop()

Stop stops playing, call it too when the device reports the end.

Example:

	chime.Stop()
	

<a name="ChimeControl.ToJSON"></a>
### func \(\*ChimeControl\) ToJSON

	func (s *ChimeControl) ToJSON() sensorJSON



<a name="ChimeControl.UpdateValue"></a>
### func \(\*ChimeControl\) UpdateValue

	func (s *ChimeControl) UpdateValue(property string, value any) error

UpdateValue routes generic property writes to the semantic setters.

<a name="ChimeProperty"></a>
## type ChimeProperty

ChimeProperty is a property name of a chime.

	type ChimeProperty = string

<a name="ChimePropertyActive"></a>Property names of a chime.

	const (
	    ChimePropertyActive ChimeProperty = "active" // Whether the chime is playing
	    ChimePropertyTone   ChimeProperty = "tone"   // Tone the chime plays, one of the tones the device offers
	    ChimePropertyVolume ChimeProperty = "volume" // Volume level (0-100)
	    ChimePropertyRepeat ChimeProperty = "repeat" // How often the tone plays (1-10)
	)

<a name="ClassifierDetection"></a>
## type ClassifierDetection

ClassifierDetection is a classifier detection result with an open attribute for classifier categories. The Attribute field of the embedded Detection holds the classifier category \(e.g. "bird", "delivery"\).

	type ClassifierDetection struct {
	    Detection
	    SubAttribute string `msgpack:"subAttribute" json:"subAttribute"` // Classifier sub-category (e.g. "woodpecker", "amazon")
	}

<a name="ClassifierDetector"></a>
## type ClassifierDetector

ClassifierDetector is implemented by plugins that run image classification models against pre\-cropped trigger regions.

	type ClassifierDetector interface {
	    // ModelSpec declares the expected input dimensions and trigger labels. The
	    // runtime scales frames to match.
	    ModelSpec() ModelSpec
	    // DetectClassifications classifies a batch of frames, each scaled to
	    // ModelSpec().Input: normally a trigger region cropped by the upstream
	    // object detector, but the whole scene when no decoded frame is available.
	    // Must return exactly one ClassifierResult per input frame, in the same
	    // order.
	    DetectClassifications(frames []VideoFrameData) ([]ClassifierResult, error)
	}

<a name="ClassifierDetectorSensor"></a>
## type ClassifierDetectorSensor

ClassifierDetectorSensor is a classifier sensor that consumes video frames from the backend pipeline. Pair with a ClassifierDetector implementation.

	type ClassifierDetectorSensor struct {
	    ClassifierSensor
	}

<a name="NewClassifierDetectorSensor"></a>
### func NewClassifierDetectorSensor

	func NewClassifierDetectorSensor(name string, opts ...SensorOption) *ClassifierDetectorSensor

NewClassifierDetectorSensor creates a classifier detector sensor with the given name and options.

<a name="ClassifierProperty"></a>
## type ClassifierProperty

ClassifierProperty is a property name of a classifier sensor.

	type ClassifierProperty = string

<a name="ClassifierPropertyDetected"></a>Property names of a classifier sensor.

	const (
	    ClassifierPropertyDetected   ClassifierProperty = "detected"   // Whether any classification result is active
	    ClassifierPropertyDetections ClassifierProperty = "detections" // List of classification results with labels and confidence. The plugin that owns the sensor does not get the backend's updates of it
	    ClassifierPropertyLabels     ClassifierProperty = "labels"     // Labels recognized during the active detection phase (auto-derived when reporting detections)
	)

<a name="ClassifierResult"></a>
## type ClassifierResult

ClassifierResult is the return value of ClassifierDetector.DetectClassifications.

	type ClassifierResult struct {
	    Detected   bool                  `msgpack:"detected" json:"detected"`     // Whether any classification result is emitted for this frame
	    Detections []ClassifierDetection `msgpack:"detections" json:"detections"` // Detections emitted for this frame
	}

<a name="ClassifierSensor"></a>
## type ClassifierSensor

ClassifierSensor reports classification results from image analysis.

Plugin authors call ReportDetections to push classification results. The detected flag and labels are auto\-derived from the detection list.

	type ClassifierSensor struct{ BaseSensor }

<a name="NewClassifierSensor"></a>
### func NewClassifierSensor

	func NewClassifierSensor(name string, opts ...SensorOption) *ClassifierSensor

NewClassifierSensor creates a classifier sensor with the given name and options.

<a name="ClassifierSensor.ClearDetections"></a>
### func \(\*ClassifierSensor\) ClearDetections

	func (s *ClassifierSensor) ClearDetections()

ClearDetections explicitly clears classifier state \(detected = false, detections = \[\], labels = \[\]\).

<a name="ClassifierSensor.GetCategory"></a>
### func \(\*ClassifierSensor\) GetCategory

	func (s *ClassifierSensor) GetCategory() SensorCategory



<a name="ClassifierSensor.GetDetections"></a>
### func \(\*ClassifierSensor\) GetDetections

	func (s *ClassifierSensor) GetDetections() []ClassifierDetection

GetDetections returns the classification results with labels and confidence. The plugin that owns the sensor does not get the backend's updates of it.

<a name="ClassifierSensor.GetLabels"></a>
### func \(\*ClassifierSensor\) GetLabels

	func (s *ClassifierSensor) GetLabels() []string

GetLabels returns the labels recognized during the active detection phase \(auto\-derived when reporting detections\).

<a name="ClassifierSensor.GetType"></a>
### func \(\*ClassifierSensor\) GetType

	func (s *ClassifierSensor) GetType() SensorType



<a name="ClassifierSensor.IsDetected"></a>
### func \(\*ClassifierSensor\) IsDetected

	func (s *ClassifierSensor) IsDetected() bool

IsDetected reports whether any classification result is active.

<a name="ClassifierSensor.ReportDetections"></a>
### func \(\*ClassifierSensor\) ReportDetections

	func (s *ClassifierSensor) ReportDetections(detected bool, detections []ClassifierDetection)

ReportDetections reports classification results. The detected flag and labels are auto\-derived from the detection list.

- ReportDetections\(true, nil\): generic classification trigger. The SDK synthesizes a single full\-frame detection with empty attribute and sub\-attribute.
- ReportDetections\(true, \[...\]\): explicit classifier detections.
- ReportDetections\(false, nil\): clear.

Example:

	sensor.ReportDetections(true, []ClassifierDetection{
	    {Detection: Detection{Label: "animal", Confidence: 0.88, Box: &BoundingBox{X: 0.1, Y: 0.2, Width: 0.3, Height: 0.4}, Attribute: "bird"}, SubAttribute: "woodpecker"},
	})
	sensor.ReportDetections(false, nil)
	

<a name="ClassifierSensor.ToJSON"></a>
### func \(\*ClassifierSensor\) ToJSON

	func (s *ClassifierSensor) ToJSON() sensorJSON



<a name="ClassifierSensor.UpdateValue"></a>
### func \(\*ClassifierSensor\) UpdateValue

	func (s *ClassifierSensor) UpdateValue(property string, value any) error

UpdateValue on a read\-only sensor: external writes are ignored.

<a name="ClipDetector"></a>
## type ClipDetector

ClipDetector is implemented by plugins that generate CLIP embeddings for downstream semantic search.

	type ClipDetector interface {
	    // ModelSpec declares the expected input dimensions and trigger labels.
	    ModelSpec() ModelSpec
	    // DetectEmbeddings produces CLIP embeddings for a batch of frames, each
	    // scaled to ModelSpec().Input: normally a trigger region cropped by the
	    // upstream object detector, but the whole scene when no decoded frame is
	    // available. Must return exactly one ClipResult per input frame, in the
	    // same order; use VideoFrameData.Label to tag the emitted embedding.
	    DetectEmbeddings(frames []VideoFrameData) ([]ClipResult, error)
	}

<a name="ClipDetectorSensor"></a>
## type ClipDetectorSensor

ClipDetectorSensor is a frame\-only sensor that generates CLIP embeddings from video frames. Pair with a ClipDetector implementation.

	type ClipDetectorSensor struct{ BaseSensor }

<a name="NewClipDetectorSensor"></a>
### func NewClipDetectorSensor

	func NewClipDetectorSensor(name string, opts ...SensorOption) *ClipDetectorSensor

NewClipDetectorSensor creates a CLIP detector sensor with the given name and options.

<a name="ClipDetectorSensor.GetCategory"></a>
### func \(\*ClipDetectorSensor\) GetCategory

	func (s *ClipDetectorSensor) GetCategory() SensorCategory



<a name="ClipDetectorSensor.GetType"></a>
### func \(\*ClipDetectorSensor\) GetType

	func (s *ClipDetectorSensor) GetType() SensorType



<a name="ClipDetectorSensor.ToJSON"></a>
### func \(\*ClipDetectorSensor\) ToJSON

	func (s *ClipDetectorSensor) ToJSON() sensorJSON



<a name="ClipDetectorSensor.UpdateValue"></a>
### func \(\*ClipDetectorSensor\) UpdateValue

	func (s *ClipDetectorSensor) UpdateValue(property string, value any) error

UpdateValue on a read\-only sensor: external writes are ignored.

<a name="ClipEmbedding"></a>
## type ClipEmbedding

ClipEmbedding is a CLIP embedding result for a detected region.

	type ClipEmbedding struct {
	    Label     string      `msgpack:"label" json:"label"`         // Detection label this embedding was computed for (e.g. "person", "vehicle")
	    Box       BoundingBox `msgpack:"box" json:"box"`             // Bounding box of the detected region in normalized coordinates
	    Embedding []float64   `msgpack:"embedding" json:"embedding"` // CLIP embedding vector
	}

<a name="ClipResult"></a>
## type ClipResult

ClipResult is the return value of ClipDetector.DetectEmbeddings.

	type ClipResult struct {
	    Embeddings     []ClipEmbedding `msgpack:"embeddings" json:"embeddings"`         // Embeddings emitted for this frame
	    EmbeddingModel string          `msgpack:"embeddingModel" json:"embeddingModel"` // Identifier of the embedding model used to produce the vectors
	}

<a name="ColdProperty"></a>
## type ColdProperty

ColdProperty is a property name of a cold sensor.

	type ColdProperty = string

<a name="ColdPropertyDetected"></a>Property names of a cold sensor.

	const (
	    ColdPropertyDetected ColdProperty = "detected" // Whether abnormal cold is detected
	)

<a name="ColdSensor"></a>
## type ColdSensor

ColdSensor reports abnormal cold detection state.

	type ColdSensor struct{ BinarySensor }

<a name="NewColdSensor"></a>
### func NewColdSensor

	func NewColdSensor(name string, opts ...SensorOption) *ColdSensor

NewColdSensor creates a cold sensor with the given name and options.

<a name="CommandControl"></a>
## type CommandControl

CommandControl is the base of the controls that take one\-off commands, such as a vacuum or a media player. A command reads in command for a moment \(commandAutoResetMs\) and then empty again, so the history records each one and the next arrives the same way. The concrete control types embed it.

	type CommandControl struct {
	    BaseSensor
	    // contains filtered or unexported fields
	}

<a name="CommandControl.GetCategory"></a>
### func \(\*CommandControl\) GetCategory

	func (s *CommandControl) GetCategory() SensorCategory



<a name="CommandControl.GetType"></a>
### func \(\*CommandControl\) GetType

	func (s *CommandControl) GetType() SensorType



<a name="CommandControl.ToJSON"></a>
### func \(\*CommandControl\) ToJSON

	func (s *CommandControl) ToJSON() sensorJSON

<a name="ContactProperty"></a>
## type ContactProperty

ContactProperty is a property name of a contact sensor.

	type ContactProperty = string

<a name="ContactPropertyDetected"></a>Property names of a contact sensor.

	const (
	    ContactPropertyDetected ContactProperty = "detected" // Whether the contact is open (true = open, false = closed)
	)

<a name="ContactSensor"></a>
## type ContactSensor

ContactSensor reports door/window open\-close state.

	type ContactSensor struct{ BinarySensor }

<a name="NewContactSensor"></a>
### func NewContactSensor

	func NewContactSensor(name string, opts ...SensorOption) *ContactSensor

NewContactSensor creates a contact sensor with the given name and options.

<a name="CoverControl"></a>
## type CoverControl

CoverControl is a blind, shutter, awning, curtain or other cover. Override SetTargetState, SetTargetPosition and SetTargetTilt \(by embedding CoverControl in your own type and shadowing the methods\) to drive hardware, then call the embedded CoverControl's methods to sync the SDK state. Report what the hardware does with SetCurrentState, SetCurrentPosition and SetCurrentTilt.

A cover that moves to positions adds CoverCapabilityPosition, one with slats CoverCapabilityTilt, one that stops on command CoverCapabilityStop and shadows Stop. SetKind says what the cover is.

	type CoverControl struct{ BaseSensor }

<a name="NewCoverControl"></a>
### func NewCoverControl

	func NewCoverControl(name string, opts ...SensorOption) *CoverControl

NewCoverControl creates a cover with the given name and options.

<a name="CoverControl.GetCategory"></a>
### func \(\*CoverControl\) GetCategory

	func (s *CoverControl) GetCategory() SensorCategory



<a name="CoverControl.GetCurrentPosition"></a>
### func \(\*CoverControl\) GetCurrentPosition

	func (s *CoverControl) GetCurrentPosition() int

GetCurrentPosition returns the current position, 0 \(closed\) to 100 \(open\).

<a name="CoverControl.GetCurrentState"></a>
### func \(\*CoverControl\) GetCurrentState

	func (s *CoverControl) GetCurrentState() CoverState

GetCurrentState returns the current state.

<a name="CoverControl.GetCurrentTilt"></a>
### func \(\*CoverControl\) GetCurrentTilt

	func (s *CoverControl) GetCurrentTilt() int

GetCurrentTilt returns the current tilt of the slats, 0 \(closed\) to 100 \(open\).

<a name="CoverControl.GetKind"></a>
### func \(\*CoverControl\) GetKind

	func (s *CoverControl) GetKind() CoverKind

GetKind returns what the cover is, empty when the plugin did not say.

<a name="CoverControl.GetTargetPosition"></a>
### func \(\*CoverControl\) GetTargetPosition

	func (s *CoverControl) GetTargetPosition() int

GetTargetPosition returns the target position, 0 \(closed\) to 100 \(open\).

<a name="CoverControl.GetTargetState"></a>
### func \(\*CoverControl\) GetTargetState

	func (s *CoverControl) GetTargetState() CoverState

GetTargetState returns the target state.

<a name="CoverControl.GetTargetTilt"></a>
### func \(\*CoverControl\) GetTargetTilt

	func (s *CoverControl) GetTargetTilt() int

GetTargetTilt returns the target tilt of the slats, 0 \(closed\) to 100 \(open\).

<a name="CoverControl.GetType"></a>
### func \(\*CoverControl\) GetType

	func (s *CoverControl) GetType() SensorType



<a name="CoverControl.IsObstructionDetected"></a>
### func \(\*CoverControl\) IsObstructionDetected

	func (s *CoverControl) IsObstructionDetected() bool

IsObstructionDetected reports whether something blocks the cover.

<a name="CoverControl.SetCurrentPosition"></a>
### func \(\*CoverControl\) SetCurrentPosition

	func (s *CoverControl) SetCurrentPosition(position int)

SetCurrentPosition reports the position of the cover, 0 \(closed\) to 100 \(open\).

Example:

	cover.SetCurrentPosition(30)
	

<a name="CoverControl.SetCurrentState"></a>
### func \(\*CoverControl\) SetCurrentState

	func (s *CoverControl) SetCurrentState(value CoverState)

SetCurrentState reports the state of the cover.

Example:

	cover.SetCurrentState(CoverStateOpening)
	

<a name="CoverControl.SetCurrentTilt"></a>
### func \(\*CoverControl\) SetCurrentTilt

	func (s *CoverControl) SetCurrentTilt(tilt int)

SetCurrentTilt reports the tilt of the slats, 0 \(closed\) to 100 \(open\).

Example:

	cover.SetCurrentTilt(40)
	

<a name="CoverControl.SetKind"></a>
### func \(\*CoverControl\) SetKind

	func (s *CoverControl) SetKind(kind CoverKind)

SetKind says what the cover is. Smart homes show it by its kind, a window or a door for example, and Home Assistant takes it as the device class.

Example:

	cover.SetKind(CoverKindShutter)
	

<a name="CoverControl.SetObstructionDetected"></a>
### func \(\*CoverControl\) SetObstructionDetected

	func (s *CoverControl) SetObstructionDetected(detected bool)

SetObstructionDetected reports whether something blocks the cover.

Example:

	cover.SetObstructionDetected(true)
	

<a name="CoverControl.SetTargetPosition"></a>
### func \(\*CoverControl\) SetTargetPosition

	func (s *CoverControl) SetTargetPosition(position int)

SetTargetPosition moves the cover to a position, 0 \(closed\) to 100 \(open\). Writes both targetPosition and currentPosition.

Example:

	cover.SetTargetPosition(50)
	

<a name="CoverControl.SetTargetState"></a>
### func \(\*CoverControl\) SetTargetState

	func (s *CoverControl) SetTargetState(value CoverState)

SetTargetState opens or closes the cover. Writes both targetState and currentState.

Example:

	cover.SetTargetState(CoverStateOpen)
	

<a name="CoverControl.SetTargetTilt"></a>
### func \(\*CoverControl\) SetTargetTilt

	func (s *CoverControl) SetTargetTilt(tilt int)

SetTargetTilt tilts the slats, 0 \(closed\) to 100 \(open\). Writes both targetTilt and currentTilt.

Example:

	cover.SetTargetTilt(100)
	

<a name="CoverControl.Stop"></a>
### func \(\*CoverControl\) Stop

	func (s *CoverControl) Stop()

Stop stops the cover and reports it as stopped. The stop property is a command and stays false.

Example:

	cover.Stop()
	

<a name="CoverControl.ToJSON"></a>
### func \(\*CoverControl\) ToJSON

	func (s *CoverControl) ToJSON() sensorJSON



<a name="CoverControl.UpdateValue"></a>
### func \(\*CoverControl\) UpdateValue

	func (s *CoverControl) UpdateValue(property string, value any) error

UpdateValue routes generic property writes to the semantic setters.

<a name="CoverKind"></a>
## type CoverKind

CoverKind says what a cover is, it decides how smart homes show it.

	type CoverKind = string

<a name="CoverKindAwning"></a>Kinds of a cover.

	const (
	    CoverKindAwning  CoverKind = "awning"
	    CoverKindBlind   CoverKind = "blind"
	    CoverKindCurtain CoverKind = "curtain"
	    CoverKindDamper  CoverKind = "damper"
	    CoverKindDoor    CoverKind = "door"
	    CoverKindShade   CoverKind = "shade"
	    CoverKindShutter CoverKind = "shutter"
	    CoverKindWindow  CoverKind = "window"
	)

<a name="CoverProperty"></a>
## type CoverProperty

CoverProperty is a property name of a cover.

	type CoverProperty = string

<a name="CoverPropertyCurrentState"></a>Property names of a cover.

	const (
	    CoverPropertyCurrentState        CoverProperty = "currentState"        // Current state, a CoverState
	    CoverPropertyTargetState         CoverProperty = "targetState"         // Target state, Open or Closed
	    CoverPropertyCurrentPosition     CoverProperty = "currentPosition"     // Current position, 0 (closed) to 100 (open)
	    CoverPropertyTargetPosition      CoverProperty = "targetPosition"      // Target position, 0 (closed) to 100 (open)
	    CoverPropertyCurrentTilt         CoverProperty = "currentTilt"         // Current tilt of the slats, 0 (closed) to 100 (open)
	    CoverPropertyTargetTilt          CoverProperty = "targetTilt"          // Target tilt of the slats, 0 (closed) to 100 (open)
	    CoverPropertyStop                CoverProperty = "stop"                // Command that stops the cover, it reads false again once handled
	    CoverPropertyObstructionDetected CoverProperty = "obstructionDetected" // Whether something blocks the cover
	    CoverPropertyKind                CoverProperty = "kind"                // What the cover is, a CoverKind
	)

<a name="CoverState"></a>
## type CoverState

CoverState is the state of a cover. A target takes Open and Closed.

	type CoverState int

<a name="CoverStateOpen"></a>

	const (
	    CoverStateOpen    CoverState = 0
	    CoverStateClosed  CoverState = 1
	    CoverStateOpening CoverState = 2
	    CoverStateClosing CoverState = 3
	    CoverStateStopped CoverState = 4
	)

<a name="Detection"></a>
## type Detection

Detection is a single detection result emitted by any detection sensor.

	type Detection struct {
	    Label      string       `msgpack:"label" json:"label"`                             // Detection label (e.g. "person", "vehicle")
	    Confidence float64      `msgpack:"confidence" json:"confidence"`                   // Confidence score in the range 0-1
	    Box        *BoundingBox `msgpack:"box,omitempty" json:"box,omitempty"`             // Bounding box in normalized coordinates
	    Attribute  string       `msgpack:"attribute,omitempty" json:"attribute,omitempty"` // Optional sub-detection attribute (face, license_plate, or classifier-specific)
	}

<a name="DetectionAttribute"></a>
## type DetectionAttribute

DetectionAttribute identifies the kind of a sub\-detection \(face, license plate, ...\).

	type DetectionAttribute = string

<a name="DetectionLabel"></a>
## type DetectionLabel

DetectionLabel is a label identifying a type of detection.

	type DetectionLabel = string

<a name="DeviceInfo"></a>
## type DeviceInfo

DeviceInfo is the physical device a sensor belongs to, as the plugin reports it. Sensors of one plugin that report the same ID form one device: one row on the sensors page, one HomeKit accessory, one Home Assistant device. A sensor without a device is its own device, and a sensor added with CameraDevice.AddSensor belongs to its camera.

	type DeviceInfo struct {
	    // ID is the source's stable id for the device, never an address: a vendor
	    // device id, a Home Assistant device id, a serial number.
	    ID  string `msgpack:"id" json:"id"`
	    // Name is the name of the device at the source.
	    Name string `msgpack:"name" json:"name"`
	    // Manufacturer is the manufacturer label (optional).
	    Manufacturer string `msgpack:"manufacturer,omitempty" json:"manufacturer,omitempty"`
	    // Model is the model label (optional).
	    Model string `msgpack:"model,omitempty" json:"model,omitempty"`
	    // Firmware is the firmware version (optional).
	    Firmware string `msgpack:"firmware,omitempty" json:"firmware,omitempty"`
	    // SerialNumber is the serial number (optional).
	    SerialNumber string `msgpack:"serialNumber,omitempty" json:"serialNumber,omitempty"`
	}

<a name="DisplayControl"></a>
## type DisplayControl

DisplayControl is a text display on a device, such as the screen of a doorbell. Set the longest text with SetPropertySpec\(DisplayPropertyMessage\) and its MaxLength, the presets with SetPropertySpec\(DisplayPropertyPreset\) and its Choices. Override SetMessage and SetPreset \(by embedding DisplayControl in your own type and shadowing the methods\) to drive your hardware, then call the embedded methods to sync the SDK state.

	type DisplayControl struct{ BaseSensor }

<a name="NewDisplayControl"></a>
### func NewDisplayControl

	func NewDisplayControl(name string, opts ...SensorOption) *DisplayControl

NewDisplayControl creates a display with the given name and options.

<a name="DisplayControl.GetCategory"></a>
### func \(\*DisplayControl\) GetCategory

	func (s *DisplayControl) GetCategory() SensorCategory



<a name="DisplayControl.GetDuration"></a>
### func \(\*DisplayControl\) GetDuration

	func (s *DisplayControl) GetDuration() int

GetDuration returns the seconds a new message stays on the display, 0 until it is cleared.

<a name="DisplayControl.GetMessage"></a>
### func \(\*DisplayControl\) GetMessage

	func (s *DisplayControl) GetMessage() string

GetMessage returns the text on the display, empty when none is shown.

<a name="DisplayControl.GetPreset"></a>
### func \(\*DisplayControl\) GetPreset

	func (s *DisplayControl) GetPreset() string

GetPreset returns the preset message on the display, empty when none is shown.

<a name="DisplayControl.GetType"></a>
### func \(\*DisplayControl\) GetType

	func (s *DisplayControl) GetType() SensorType



<a name="DisplayControl.SetDuration"></a>
### func \(\*DisplayControl\) SetDuration

	func (s *DisplayControl) SetDuration(value int)

SetDuration sets how long a new message stays on the display, 0 keeps it until it is cleared.

Example:

	display.SetDuration(60)
	

<a name="DisplayControl.SetMessage"></a>
### func \(\*DisplayControl\) SetMessage

	func (s *DisplayControl) SetMessage(value string)

SetMessage shows a text, an empty one clears the display.

Example:

	display.SetMessage("Back in 5 minutes")
	

<a name="DisplayControl.SetPreset"></a>
### func \(\*DisplayControl\) SetPreset

	func (s *DisplayControl) SetPreset(value string)

SetPreset shows a preset message, an empty one clears the display.

Example:

	display.SetPreset("LEAVE_PACKAGE_AT_DOOR")
	

<a name="DisplayControl.ToJSON"></a>
### func \(\*DisplayControl\) ToJSON

	func (s *DisplayControl) ToJSON() sensorJSON



<a name="DisplayControl.UpdateValue"></a>
### func \(\*DisplayControl\) UpdateValue

	func (s *DisplayControl) UpdateValue(property string, value any) error

UpdateValue routes generic property writes to the semantic setters.

<a name="DisplayProperty"></a>
## type DisplayProperty

DisplayProperty is a property name of a display.

	type DisplayProperty = string

<a name="DisplayPropertyMessage"></a>Property names of a display.

	const (
	    DisplayPropertyMessage  DisplayProperty = "message"  // Text on the display, empty when none is shown
	    DisplayPropertyPreset   DisplayProperty = "preset"   // Preset message on the display, empty when none is shown
	    DisplayPropertyDuration DisplayProperty = "duration" // Seconds a new message stays on the display, 0 until it is cleared
	)

<a name="DoorbellProperty"></a>
## type DoorbellProperty

DoorbellProperty is a property name of a doorbell trigger.

	type DoorbellProperty = string

<a name="DoorbellPropertyRing"></a>Property names of a doorbell trigger.

	const (
	    DoorbellPropertyRing DoorbellProperty = "ring" // Whether the doorbell is currently ringing
	)

<a name="DoorbellTrigger"></a>
## type DoorbellTrigger

DoorbellTrigger fires doorbell ring events.

Plugin authors call Trigger to fire an event. The ring property is set to true and automatically reset to false after ringAutoResetMs.

	type DoorbellTrigger struct {
	    BaseSensor
	    // contains filtered or unexported fields
	}

<a name="NewDoorbellTrigger"></a>
### func NewDoorbellTrigger

	func NewDoorbellTrigger(name string, opts ...SensorOption) *DoorbellTrigger

NewDoorbellTrigger creates a doorbell trigger with the given name and options.

<a name="DoorbellTrigger.GetCategory"></a>
### func \(\*DoorbellTrigger\) GetCategory

	func (s *DoorbellTrigger) GetCategory() SensorCategory



<a name="DoorbellTrigger.GetType"></a>
### func \(\*DoorbellTrigger\) GetType

	func (s *DoorbellTrigger) GetType() SensorType



<a name="DoorbellTrigger.IsRinging"></a>
### func \(\*DoorbellTrigger\) IsRinging

	func (s *DoorbellTrigger) IsRinging() bool

IsRinging reports whether the doorbell is currently ringing.

<a name="DoorbellTrigger.ToJSON"></a>
### func \(\*DoorbellTrigger\) ToJSON

	func (s *DoorbellTrigger) ToJSON() sensorJSON



<a name="DoorbellTrigger.Trigger"></a>
### func \(\*DoorbellTrigger\) Trigger

	func (s *DoorbellTrigger) Trigger()

Trigger fires a doorbell ring event. Sets ring to true and auto\-resets after ringAutoResetMs. Re\-triggering while ringing resets the timer \(extends the ring phase\).

Example:

	doorbell.Trigger()
	

<a name="DoorbellTrigger.UpdateValue"></a>
### func \(\*DoorbellTrigger\) UpdateValue

	func (s *DoorbellTrigger) UpdateValue(property string, value any) error

UpdateValue routes generic property writes to the semantic setters. Writing ring=false is ignored, the auto\-reset timer owns the off transition.

<a name="FaceDetection"></a>
## type FaceDetection

FaceDetection is a face detection result, extending Detection with face\-specific fields. The Attribute field of the embedded Detection is fixed to "face".

	type FaceDetection struct {
	    Detection
	    Identity string `msgpack:"identity,omitempty" json:"identity,omitempty"` // Recognized identity name, if matched against known faces
	}

<a name="FaceDetector"></a>
## type FaceDetector

FaceDetector is implemented by plugins that perform face detection and recognition.

	type FaceDetector interface {
	    // ModelSpec declares the expected input dimensions and trigger labels. The
	    // runtime scales frames to match.
	    ModelSpec() ModelSpec
	    // DetectFaces analyzes a batch of frames, each scaled to ModelSpec().Input:
	    // normally a person region cropped by the upstream object detector, but the
	    // whole scene when no decoded frame is available. Must return exactly one
	    // FaceResult per input frame, in the same order.
	    DetectFaces(frames []VideoFrameData) ([]FaceResult, error)
	}

<a name="FaceDetectorSensor"></a>
## type FaceDetectorSensor

FaceDetectorSensor is a face sensor that consumes video frames from the backend pipeline. Pair with a FaceDetector implementation.

	type FaceDetectorSensor struct {
	    FaceSensor
	}

<a name="NewFaceDetectorSensor"></a>
### func NewFaceDetectorSensor

	func NewFaceDetectorSensor(name string, opts ...SensorOption) *FaceDetectorSensor

NewFaceDetectorSensor creates a face detector sensor with the given name and options.

<a name="FaceEmbedder"></a>
## type FaceEmbedder

FaceEmbedder is implemented by plugins that turn a face crop into a vector for recognition against enrolled faces.

	type FaceEmbedder interface {
	    // ModelSpec declares the expected input dimensions and trigger labels.
	    ModelSpec() ModelSpec
	    // EmbedFaces embeds a batch of face crops, each padded around the
	    // detected box and scaled to ModelSpec().Input. Must return exactly one
	    // FaceEmbeddingResult per input frame, in the same order; return an empty
	    // Embedding for a crop the model could not use.
	    EmbedFaces(frames []VideoFrameData) ([]FaceEmbeddingResult, error)
	}

<a name="FaceEmbedderSensor"></a>
## type FaceEmbedderSensor

FaceEmbedderSensor is a frame\-only sensor that turns face crops into vectors. Pair with a FaceEmbedder implementation.

The crop comes from the face detector's box, cut from the source frame, so the sensor runs after face detection rather than on the raw scene. Vectors from different models are not comparable, which is why every result carries its embedding model.

	type FaceEmbedderSensor struct{ BaseSensor }

<a name="NewFaceEmbedderSensor"></a>
### func NewFaceEmbedderSensor

	func NewFaceEmbedderSensor(name string, opts ...SensorOption) *FaceEmbedderSensor

NewFaceEmbedderSensor creates a face embedder sensor with the given name and options.

<a name="FaceEmbedderSensor.GetCategory"></a>
### func \(\*FaceEmbedderSensor\) GetCategory

	func (s *FaceEmbedderSensor) GetCategory() SensorCategory



<a name="FaceEmbedderSensor.GetType"></a>
### func \(\*FaceEmbedderSensor\) GetType

	func (s *FaceEmbedderSensor) GetType() SensorType



<a name="FaceEmbedderSensor.ToJSON"></a>
### func \(\*FaceEmbedderSensor\) ToJSON

	func (s *FaceEmbedderSensor) ToJSON() sensorJSON



<a name="FaceEmbedderSensor.UpdateValue"></a>
### func \(\*FaceEmbedderSensor\) UpdateValue

	func (s *FaceEmbedderSensor) UpdateValue(property string, value any) error

UpdateValue on a read\-only sensor: external writes are ignored.

<a name="FaceEmbeddingResult"></a>
## type FaceEmbeddingResult

FaceEmbeddingResult is the return value of FaceEmbedder.EmbedFaces.

	type FaceEmbeddingResult struct {
	    Embedding      []float64 `msgpack:"embedding" json:"embedding"`                     // Embedding vector for the face in this crop, empty when no face could be embedded
	    EmbeddingModel string    `msgpack:"embeddingModel" json:"embeddingModel"`           // Identifier of the embedding model that produced the vector
	    Landmarks      []Point   `msgpack:"landmarks,omitempty" json:"landmarks,omitempty"` // The five points the face was aligned on, in 0 - 1 of the input image: right eye, left eye, nose, right and left mouth corner
	    Quality        float64   `msgpack:"quality,omitempty" json:"quality,omitempty"`     // How clearly the picture shows a face (0 - 1), also sent with an empty embedding when the face was too unclear; not sent when the landmarks were passed in
	}

<a name="FaceProperty"></a>
## type FaceProperty

FaceProperty is a property name of a face sensor.

	type FaceProperty = string

<a name="FacePropertyDetected"></a>Property names of a face sensor.

	const (
	    FacePropertyDetected   FaceProperty = "detected"   // Whether any face is currently detected
	    FacePropertyDetections FaceProperty = "detections" // List of detected faces, with an identity where one was matched. The plugin that owns the sensor does not get the backend's updates of it
	    FacePropertyIdentities FaceProperty = "identities" // Names of the faces recognized during the active detection phase
	)

<a name="FaceResult"></a>
## type FaceResult

FaceResult is the return value of FaceDetector.DetectFaces.

	type FaceResult struct {
	    Detected   bool            `msgpack:"detected" json:"detected"`     // Whether any face is detected in this frame
	    Detections []FaceDetection `msgpack:"detections" json:"detections"` // Detections emitted for this frame
	}

<a name="FaceSensor"></a>
## type FaceSensor

FaceSensor reports detected faces and optional identity matches.

Plugin authors call ReportDetections to push detected faces. The detected flag is auto\-derived from the detection list.

	type FaceSensor struct{ BaseSensor }

<a name="NewFaceSensor"></a>
### func NewFaceSensor

	func NewFaceSensor(name string, opts ...SensorOption) *FaceSensor

NewFaceSensor creates a face sensor with the given name and options.

<a name="FaceSensor.ClearDetections"></a>
### func \(\*FaceSensor\) ClearDetections

	func (s *FaceSensor) ClearDetections()

ClearDetections explicitly clears face detection state \(detected = false, detections = \[\]\).

<a name="FaceSensor.GetCategory"></a>
### func \(\*FaceSensor\) GetCategory

	func (s *FaceSensor) GetCategory() SensorCategory



<a name="FaceSensor.GetDetections"></a>
### func \(\*FaceSensor\) GetDetections

	func (s *FaceSensor) GetDetections() []FaceDetection

GetDetections returns the detected faces, with an identity where one was matched. The plugin that owns the sensor does not get the backend's updates of it.

<a name="FaceSensor.GetIdentities"></a>
### func \(\*FaceSensor\) GetIdentities

	func (s *FaceSensor) GetIdentities() []string

GetIdentities returns the names of the faces recognized during the active detection phase.

<a name="FaceSensor.GetType"></a>
### func \(\*FaceSensor\) GetType

	func (s *FaceSensor) GetType() SensorType



<a name="FaceSensor.IsDetected"></a>
### func \(\*FaceSensor\) IsDetected

	func (s *FaceSensor) IsDetected() bool

IsDetected reports whether any face is currently detected.

<a name="FaceSensor.ReportDetections"></a>
### func \(\*FaceSensor\) ReportDetections

	func (s *FaceSensor) ReportDetections(detected bool, detections []FaceDetection)

ReportDetections reports detected faces.

- ReportDetections\(true, nil\): face detected without specifics. The SDK synthesizes a single full\-frame face detection without identity.
- ReportDetections\(true, \[...\]\): explicit face detections, with an identity where the plugin recognizes the face itself.
- ReportDetections\(false, nil\): clear.

Example:

	sensor.ReportDetections(true, []FaceDetection{
	    {Detection: Detection{Label: "person", Confidence: 0.94, Box: &BoundingBox{X: 0.4, Y: 0.2, Width: 0.15, Height: 0.25}, Attribute: "face"}, Identity: "Alice"},
	})
	sensor.ReportDetections(false, nil)
	

<a name="FaceSensor.ToJSON"></a>
### func \(\*FaceSensor\) ToJSON

	func (s *FaceSensor) ToJSON() sensorJSON



<a name="FaceSensor.UpdateValue"></a>
### func \(\*FaceSensor\) UpdateValue

	func (s *FaceSensor) UpdateValue(property string, value any) error

UpdateValue on a read\-only sensor: external writes are ignored.

<a name="FanControl"></a>
## type FanControl

FanControl is a ceiling, desk or other fan. Override SetOn, SetOff, SetSpeed and the other commands \(by embedding FanControl in your own type and shadowing the methods\) to drive hardware, then call the embedded FanControl's methods to sync the SDK state.

A fan with speeds adds FanCapabilitySpeed, one that turns both ways FanCapabilityDirection, one that swings FanCapabilityOscillation. Presets are the device's own, add FanCapabilityPreset and set them as Choices. A fan with a few fixed speeds sets the speed's Step, three speeds are a step of 33.

	type FanControl struct{ BaseSensor }

<a name="NewFanControl"></a>
### func NewFanControl

	func NewFanControl(name string, opts ...SensorOption) *FanControl

NewFanControl creates a fan with the given name and options.

<a name="FanControl.GetCategory"></a>
### func \(\*FanControl\) GetCategory

	func (s *FanControl) GetCategory() SensorCategory



<a name="FanControl.GetDirection"></a>
### func \(\*FanControl\) GetDirection

	func (s *FanControl) GetDirection() FanDirection

GetDirection returns the direction the fan turns.

<a name="FanControl.GetPreset"></a>
### func \(\*FanControl\) GetPreset

	func (s *FanControl) GetPreset() string

GetPreset returns the active preset.

<a name="FanControl.GetSpeed"></a>
### func \(\*FanControl\) GetSpeed

	func (s *FanControl) GetSpeed() int

GetSpeed returns the speed, 0 to 100 percent.

<a name="FanControl.GetType"></a>
### func \(\*FanControl\) GetType

	func (s *FanControl) GetType() SensorType



<a name="FanControl.IsOn"></a>
### func \(\*FanControl\) IsOn

	func (s *FanControl) IsOn() bool

IsOn reports whether the fan runs.

<a name="FanControl.IsOscillating"></a>
### func \(\*FanControl\) IsOscillating

	func (s *FanControl) IsOscillating() bool

IsOscillating reports whether the fan swings from side to side.

<a name="FanControl.SetDirection"></a>
### func \(\*FanControl\) SetDirection

	func (s *FanControl) SetDirection(direction FanDirection)

SetDirection sets the direction, forward or reverse.

Example:

	fan.SetDirection(FanDirectionReverse)
	

<a name="FanControl.SetOff"></a>
### func \(\*FanControl\) SetOff

	func (s *FanControl) SetOff()

SetOff turns the fan off.

Example:

	fan.SetOff()
	

<a name="FanControl.SetOn"></a>
### func \(\*FanControl\) SetOn

	func (s *FanControl) SetOn()

SetOn turns the fan on.

Example:

	fan.SetOn()
	

<a name="FanControl.SetOscillating"></a>
### func \(\*FanControl\) SetOscillating

	func (s *FanControl) SetOscillating(value bool)

SetOscillating lets the fan swing, or stops it with false.

Example:

	fan.SetOscillating(true)
	

<a name="FanControl.SetPreset"></a>
### func \(\*FanControl\) SetPreset

	func (s *FanControl) SetPreset(value string)

SetPreset sets the preset, one of the preset choices.

Example:

	fan.SetPreset("sleep")
	

<a name="FanControl.SetSpeed"></a>
### func \(\*FanControl\) SetSpeed

	func (s *FanControl) SetSpeed(speed int)

SetSpeed sets the speed, 0 to 100 percent.

Example:

	fan.SetSpeed(66)
	

<a name="FanControl.ToJSON"></a>
### func \(\*FanControl\) ToJSON

	func (s *FanControl) ToJSON() sensorJSON



<a name="FanControl.UpdateValue"></a>
### func \(\*FanControl\) UpdateValue

	func (s *FanControl) UpdateValue(property string, value any) error

UpdateValue routes generic property writes to the semantic setters.

<a name="FanDirection"></a>
## type FanDirection

FanDirection is the direction a fan turns.

	type FanDirection = string

<a name="FanDirectionForward"></a>Directions of a fan.

	const (
	    FanDirectionForward FanDirection = "forward"
	    FanDirectionReverse FanDirection = "reverse"
	)

<a name="FanProperty"></a>
## type FanProperty

FanProperty is a property name of a fan.

	type FanProperty = string

<a name="FanPropertyOn"></a>Property names of a fan.

	const (
	    FanPropertyOn          FanProperty = "on"          // Whether the fan runs
	    FanPropertySpeed       FanProperty = "speed"       // Speed, 0 to 100 percent
	    FanPropertyDirection   FanProperty = "direction"   // Direction, a FanDirection
	    FanPropertyOscillating FanProperty = "oscillating" // Whether the fan swings from side to side
	    FanPropertyPreset      FanProperty = "preset"      // Active preset, one of the choices the device offers
	)

<a name="GarageControl"></a>
## type GarageControl

GarageControl is a garage door control sensor. Override SetTargetState \(by embedding GarageControl in your own type and shadowing the method\) to drive hardware and call the embedded GarageControl's SetTargetState once the hardware confirms: the base implementation updates both targetState and currentState.

For long\-running transitions \(Opening/Closing intermediate states\) override SetTargetState and write currentState separately as the door moves.

	type GarageControl struct{ BaseSensor }

<a name="NewGarageControl"></a>
### func NewGarageControl

	func NewGarageControl(name string, opts ...SensorOption) *GarageControl

NewGarageControl creates a garage door control with the given name and options.

<a name="GarageControl.GetCategory"></a>
### func \(\*GarageControl\) GetCategory

	func (s *GarageControl) GetCategory() SensorCategory



<a name="GarageControl.GetCurrentState"></a>
### func \(\*GarageControl\) GetCurrentState

	func (s *GarageControl) GetCurrentState() GarageState

GetCurrentState returns the actual current state of the garage door.

<a name="GarageControl.GetTargetState"></a>
### func \(\*GarageControl\) GetTargetState

	func (s *GarageControl) GetTargetState() GarageState

GetTargetState returns the desired target state \(set by user, transitions to the current state\).

<a name="GarageControl.GetType"></a>
### func \(\*GarageControl\) GetType

	func (s *GarageControl) GetType() SensorType



<a name="GarageControl.IsObstructionDetected"></a>
### func \(\*GarageControl\) IsObstructionDetected

	func (s *GarageControl) IsObstructionDetected() bool

IsObstructionDetected reports whether an obstruction is detected.

<a name="GarageControl.SetCurrentState"></a>
### func \(\*GarageControl\) SetCurrentState

	func (s *GarageControl) SetCurrentState(value GarageState)

SetCurrentState publishes the actual door state. Use this to drive long\-running transitions \(Open, then Closing, then Closed\) independently of the user\-requested target state. Read\-only from cross\-process consumers, UpdateValue ignores it.

Example:

	garage.SetCurrentState(GarageStateClosing)
	

<a name="GarageControl.SetObstructionDetected"></a>
### func \(\*GarageControl\) SetObstructionDetected

	func (s *GarageControl) SetObstructionDetected(detected bool)

SetObstructionDetected publishes the obstruction\-detected state. Read\-only from cross\-process consumers, UpdateValue ignores it.

Example:

	garage.SetObstructionDetected(true)
	

<a name="GarageControl.SetTargetState"></a>
### func \(\*GarageControl\) SetTargetState

	func (s *GarageControl) SetTargetState(value GarageState)

SetTargetState sets the target state. Writes both targetState and currentState.

Example:

	garage.SetTargetState(GarageStateOpen)
	

<a name="GarageControl.ToJSON"></a>
### func \(\*GarageControl\) ToJSON

	func (s *GarageControl) ToJSON() sensorJSON



<a name="GarageControl.UpdateValue"></a>
### func \(\*GarageControl\) UpdateValue

	func (s *GarageControl) UpdateValue(property string, value any) error

UpdateValue routes generic property writes to the semantic setters. Only targetState is externally writable.

<a name="GarageProperty"></a>
## type GarageProperty

GarageProperty is a property name of a garage control.

	type GarageProperty = string

<a name="GaragePropertyCurrentState"></a>Property names of a garage control.

	const (
	    GaragePropertyCurrentState        GarageProperty = "currentState"        // The actual current state of the garage door
	    GaragePropertyTargetState         GarageProperty = "targetState"         // The desired target state (set by user, transitions to currentState)
	    GaragePropertyObstructionDetected GarageProperty = "obstructionDetected" // Whether an obstruction is detected
	)

<a name="GarageState"></a>
## type GarageState

GarageState defines garage door states.

	type GarageState int

<a name="GarageStateOpen"></a>

	const (
	    GarageStateOpen    GarageState = 0 // Door is fully open
	    GarageStateClosed  GarageState = 1 // Door is fully closed
	    GarageStateOpening GarageState = 2 // Door is moving towards open
	    GarageStateClosing GarageState = 3 // Door is moving towards closed
	    GarageStateStopped GarageState = 4 // Door stopped part-way
	)

<a name="GasProperty"></a>
## type GasProperty

GasProperty is a property name of a gas sensor.

	type GasProperty = string

<a name="GasPropertyDetected"></a>Property names of a gas sensor.

	const (
	    GasPropertyDetected GasProperty = "detected" // Whether gas is detected
	)

<a name="GasSensor"></a>
## type GasSensor

GasSensor reports gas detection state.

	type GasSensor struct{ BinarySensor }

<a name="NewGasSensor"></a>
### func NewGasSensor

	func NewGasSensor(name string, opts ...SensorOption) *GasSensor

NewGasSensor creates a gas sensor with the given name and options.

<a name="GlassBreakProperty"></a>
## type GlassBreakProperty

GlassBreakProperty is a property name of a glass break sensor.

	type GlassBreakProperty = string

<a name="GlassBreakPropertyDetected"></a>Property names of a glass break sensor.

	const (
	    GlassBreakPropertyDetected GlassBreakProperty = "detected" // Whether breaking glass is detected
	)

<a name="GlassBreakSensor"></a>
## type GlassBreakSensor

GlassBreakSensor reports glass break detection state.

	type GlassBreakSensor struct{ BinarySensor }

<a name="NewGlassBreakSensor"></a>
### func NewGlassBreakSensor

	func NewGlassBreakSensor(name string, opts ...SensorOption) *GlassBreakSensor

NewGlassBreakSensor creates a glass break sensor with the given name and options.

<a name="HeatProperty"></a>
## type HeatProperty

HeatProperty is a property name of a heat sensor.

	type HeatProperty = string

<a name="HeatPropertyDetected"></a>Property names of a heat sensor.

	const (
	    HeatPropertyDetected HeatProperty = "detected" // Whether abnormal heat is detected
	)

<a name="HeatSensor"></a>
## type HeatSensor

HeatSensor reports abnormal heat detection state.

	type HeatSensor struct{ BinarySensor }

<a name="NewHeatSensor"></a>
### func NewHeatSensor

	func NewHeatSensor(name string, opts ...SensorOption) *HeatSensor

NewHeatSensor creates a heat sensor with the given name and options.

<a name="HumidifierAction"></a>
## type HumidifierAction

HumidifierAction is what a humidifier does right now.

	type HumidifierAction = string

<a name="HumidifierActionOff"></a>Actions of a humidifier.

	const (
	    HumidifierActionOff         HumidifierAction = "off"
	    HumidifierActionIdle        HumidifierAction = "idle"
	    HumidifierActionHumidifying HumidifierAction = "humidifying"
	    HumidifierActionDrying      HumidifierAction = "drying"
	)

<a name="HumidifierControl"></a>
## type HumidifierControl

HumidifierControl is a humidifier or dehumidifier that works toward a target humidity. Override SetOn, SetOff, SetTargetHumidity and SetMode \(by embedding HumidifierControl in your own type and shadowing the methods\) to drive hardware, then call the embedded HumidifierControl's methods to sync the SDK state. Report what the device measures and does with SetCurrentHumidity and SetAction.

SetKind says whether it humidifies or dehumidifies. The modes it offers come as choices: SetPropertySpec\(HumidifierPropertyMode, &PropertySpecOverride\{Choices: ...\}\).

	type HumidifierControl struct{ BaseSensor }

<a name="NewHumidifierControl"></a>
### func NewHumidifierControl

	func NewHumidifierControl(name string, opts ...SensorOption) *HumidifierControl

NewHumidifierControl creates a humidifier with the given name and options.

<a name="HumidifierControl.GetAction"></a>
### func \(\*HumidifierControl\) GetAction

	func (s *HumidifierControl) GetAction() HumidifierAction

GetAction returns what the humidifier does right now, empty before the first report.

<a name="HumidifierControl.GetCategory"></a>
### func \(\*HumidifierControl\) GetCategory

	func (s *HumidifierControl) GetCategory() SensorCategory



<a name="HumidifierControl.GetCurrentHumidity"></a>
### func \(\*HumidifierControl\) GetCurrentHumidity

	func (s *HumidifierControl) GetCurrentHumidity() (float64, bool)

GetCurrentHumidity returns the measured humidity in percent, false before the first reading.

<a name="HumidifierControl.GetKind"></a>
### func \(\*HumidifierControl\) GetKind

	func (s *HumidifierControl) GetKind() HumidifierKind

GetKind returns whether it humidifies or dehumidifies, empty when the plugin did not say.

<a name="HumidifierControl.GetMode"></a>
### func \(\*HumidifierControl\) GetMode

	func (s *HumidifierControl) GetMode() string

GetMode returns the active mode.

<a name="HumidifierControl.GetTargetHumidity"></a>
### func \(\*HumidifierControl\) GetTargetHumidity

	func (s *HumidifierControl) GetTargetHumidity() int

GetTargetHumidity returns the target humidity in percent.

<a name="HumidifierControl.GetType"></a>
### func \(\*HumidifierControl\) GetType

	func (s *HumidifierControl) GetType() SensorType



<a name="HumidifierControl.IsOn"></a>
### func \(\*HumidifierControl\) IsOn

	func (s *HumidifierControl) IsOn() bool

IsOn reports true while the humidifier is on.

<a name="HumidifierControl.SetAction"></a>
### func \(\*HumidifierControl\) SetAction

	func (s *HumidifierControl) SetAction(value HumidifierAction)

SetAction reports what the humidifier does right now: off, idle, humidifying or drying.

Example:

	humidifier.SetAction(HumidifierActionHumidifying)
	

<a name="HumidifierControl.SetCurrentHumidity"></a>
### func \(\*HumidifierControl\) SetCurrentHumidity

	func (s *HumidifierControl) SetCurrentHumidity(value float64)

SetCurrentHumidity reports the humidity the device measures, 0 to 100 percent.

Example:

	humidifier.SetCurrentHumidity(38)
	

<a name="HumidifierControl.SetKind"></a>
### func \(\*HumidifierControl\) SetKind

	func (s *HumidifierControl) SetKind(kind HumidifierKind)

SetKind says whether the device humidifies or dehumidifies. Smart homes show it by its kind, and Home Assistant takes it as the device class.

Example:

	humidifier.SetKind(HumidifierKindDehumidifier)
	

<a name="HumidifierControl.SetMode"></a>
### func \(\*HumidifierControl\) SetMode

	func (s *HumidifierControl) SetMode(value string)

SetMode sets the mode, one of the mode choices.

Example:

	humidifier.SetMode("sleep")
	

<a name="HumidifierControl.SetOff"></a>
### func \(\*HumidifierControl\) SetOff

	func (s *HumidifierControl) SetOff()

SetOff turns the humidifier off.

Example:

	humidifier.SetOff()
	

<a name="HumidifierControl.SetOn"></a>
### func \(\*HumidifierControl\) SetOn

	func (s *HumidifierControl) SetOn()

SetOn turns the humidifier on.

Example:

	humidifier.SetOn()
	

<a name="HumidifierControl.SetTargetHumidity"></a>
### func \(\*HumidifierControl\) SetTargetHumidity

	func (s *HumidifierControl) SetTargetHumidity(value int)

SetTargetHumidity sets the target humidity, 0 to 100 percent.

Example:

	humidifier.SetTargetHumidity(45)
	

<a name="HumidifierControl.ToJSON"></a>
### func \(\*HumidifierControl\) ToJSON

	func (s *HumidifierControl) ToJSON() sensorJSON



<a name="HumidifierControl.UpdateValue"></a>
### func \(\*HumidifierControl\) UpdateValue

	func (s *HumidifierControl) UpdateValue(property string, value any) error

UpdateValue routes generic property writes to the semantic setters.

<a name="HumidifierKind"></a>
## type HumidifierKind

HumidifierKind says whether the device adds or removes moisture, it decides how smart homes show it.

	type HumidifierKind = string

<a name="HumidifierKindHumidifier"></a>Kinds of a humidifier.

	const (
	    HumidifierKindHumidifier   HumidifierKind = "humidifier"
	    HumidifierKindDehumidifier HumidifierKind = "dehumidifier"
	)

<a name="HumidifierProperty"></a>
## type HumidifierProperty

HumidifierProperty is a property name of a humidifier.

	type HumidifierProperty = string

<a name="HumidifierPropertyOn"></a>Property names of a humidifier.

	const (
	    HumidifierPropertyOn              HumidifierProperty = "on"              // True while the humidifier is on, a command when written
	    HumidifierPropertyTargetHumidity  HumidifierProperty = "targetHumidity"  // Target humidity in percent
	    HumidifierPropertyCurrentHumidity HumidifierProperty = "currentHumidity" // Measured humidity in percent
	    HumidifierPropertyAction          HumidifierProperty = "action"          // What the humidifier does right now, a HumidifierAction
	    HumidifierPropertyMode            HumidifierProperty = "mode"            // Active mode, one of the choices the plugin sets
	    HumidifierPropertyKind            HumidifierProperty = "kind"            // Whether it humidifies or dehumidifies, a HumidifierKind
	)

<a name="HumidityInfo"></a>
## type HumidityInfo

HumidityInfo reports current relative humidity \(0\-100%\).

	type HumidityInfo struct{ MeasurementInfo }

<a name="NewHumidityInfo"></a>
### func NewHumidityInfo

	func NewHumidityInfo(name string, opts ...SensorOption) *HumidityInfo

NewHumidityInfo creates a humidity info sensor with the given name and options.

<a name="HumidityProperty"></a>
## type HumidityProperty

HumidityProperty is a property name of a humidity sensor.

	type HumidityProperty = string

<a name="HumidityPropertyCurrent"></a>Property names of a humidity sensor.

	const (
	    HumidityPropertyCurrent HumidityProperty = "current" // Current relative humidity (0-100%)
	)

<a name="IlluminanceInfo"></a>
## type IlluminanceInfo

IlluminanceInfo reports the current light level in lux.

	type IlluminanceInfo struct{ MeasurementInfo }

<a name="NewIlluminanceInfo"></a>
### func NewIlluminanceInfo

	func NewIlluminanceInfo(name string, opts ...SensorOption) *IlluminanceInfo

NewIlluminanceInfo creates an illuminance info sensor with the given name and options.

<a name="IlluminanceProperty"></a>
## type IlluminanceProperty

IlluminanceProperty is a property name of an illuminance sensor.

	type IlluminanceProperty = string

<a name="IlluminancePropertyCurrent"></a>Property names of an illuminance sensor.

	const (
	    IlluminancePropertyCurrent IlluminanceProperty = "current" // Current illuminance in lux
	)

<a name="LawnMowerActivity"></a>
## type LawnMowerActivity

LawnMowerActivity is what a lawn mower does right now.

	type LawnMowerActivity = string

<a name="LawnMowerActivityMowing"></a>Activities of a lawn mower.

	const (
	    LawnMowerActivityMowing    LawnMowerActivity = "mowing"
	    LawnMowerActivityDocked    LawnMowerActivity = "docked"
	    LawnMowerActivityPaused    LawnMowerActivity = "paused"
	    LawnMowerActivityReturning LawnMowerActivity = "returning"
	    LawnMowerActivityError     LawnMowerActivity = "error"
	)

<a name="LawnMowerCommand"></a>
## type LawnMowerCommand

LawnMowerCommand is a command a lawn mower takes.

	type LawnMowerCommand = string

<a name="LawnMowerCommandStart"></a>Commands a lawn mower takes.

	const (
	    LawnMowerCommandStart LawnMowerCommand = "start"
	    LawnMowerCommandPause LawnMowerCommand = "pause"
	    LawnMowerCommandDock  LawnMowerCommand = "dock"
	)

<a name="LawnMowerControl"></a>
## type LawnMowerControl

LawnMowerControl is a robot lawn mower. Override Start, Pause and Dock \(by embedding LawnMowerControl in your own type and shadowing the methods\) to drive hardware, then call the embedded LawnMowerControl's methods after success. Report what the mower does with SetActivity.

Narrow the commands to those the mower takes with SetPropertySpec\(LawnMowerPropertyCommand, &PropertySpecOverride\{Values: ...\}\).

	type LawnMowerControl struct{ RobotControl }

<a name="NewLawnMowerControl"></a>
### func NewLawnMowerControl

	func NewLawnMowerControl(name string, opts ...SensorOption) *LawnMowerControl

NewLawnMowerControl creates a lawn mower with the given name and options.

<a name="LawnMowerControl.Dock"></a>
### func \(\*LawnMowerControl\) Dock

	func (s *LawnMowerControl) Dock()

Dock stops mowing and sends the mower back to its dock.

Example:

	mower.Dock()
	

<a name="LawnMowerControl.Pause"></a>
### func \(\*LawnMowerControl\) Pause

	func (s *LawnMowerControl) Pause()

Pause pauses mowing where the mower is.

Example:

	mower.Pause()
	

<a name="LawnMowerControl.Start"></a>
### func \(\*LawnMowerControl\) Start

	func (s *LawnMowerControl) Start()

Start starts or resumes mowing.

Example:

	mower.Start()
	

<a name="LawnMowerControl.UpdateValue"></a>
### func \(\*LawnMowerControl\) UpdateValue

	func (s *LawnMowerControl) UpdateValue(property string, value any) error

UpdateValue routes generic property writes to the semantic setters.

<a name="LawnMowerProperty"></a>
## type LawnMowerProperty

LawnMowerProperty is a property name of a lawn mower.

	type LawnMowerProperty = string

<a name="LawnMowerPropertyActivity"></a>Property names of a lawn mower.

	const (
	    LawnMowerPropertyActivity LawnMowerProperty = "activity" // What the mower does right now, a LawnMowerActivity
	    LawnMowerPropertyCommand  LawnMowerProperty = "command"  // One-off LawnMowerCommand when written, empty again right after
	)

<a name="LeakProperty"></a>
## type LeakProperty

LeakProperty is a property name of a leak sensor.

	type LeakProperty = string

<a name="LeakPropertyDetected"></a>Property names of a leak sensor.

	const (
	    LeakPropertyDetected LeakProperty = "detected" // Whether a leak is detected
	)

<a name="LeakSensor"></a>
## type LeakSensor

LeakSensor reports water leak detection state.

	type LeakSensor struct{ BinarySensor }

<a name="NewLeakSensor"></a>
### func NewLeakSensor

	func NewLeakSensor(name string, opts ...SensorOption) *LeakSensor

NewLeakSensor creates a leak sensor with the given name and options.

<a name="LicensePlateDetection"></a>
## type LicensePlateDetection

LicensePlateDetection is a license plate detection result, extending Detection with OCR fields. The Attribute field of the embedded Detection is fixed to "license\_plate".

	type LicensePlateDetection struct {
	    Detection
	    PlateText     string  `msgpack:"plateText" json:"plateText"`                             // Recognized plate text (e.g. "ABC 1234")
	    OcrConfidence float64 `msgpack:"ocrConfidence,omitempty" json:"ocrConfidence,omitempty"` // Average text recognition confidence (0-1), separate from the box confidence
	}

<a name="LicensePlateDetector"></a>
## type LicensePlateDetector

LicensePlateDetector is implemented by plugins that perform license plate detection and OCR.

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

<a name="LicensePlateDetectorSensor"></a>
## type LicensePlateDetectorSensor

LicensePlateDetectorSensor is a license plate sensor that consumes video frames from the backend pipeline. Pair with a LicensePlateDetector implementation.

	type LicensePlateDetectorSensor struct {
	    LicensePlateSensor
	}

<a name="NewLicensePlateDetectorSensor"></a>
### func NewLicensePlateDetectorSensor

	func NewLicensePlateDetectorSensor(name string, opts ...SensorOption) *LicensePlateDetectorSensor

NewLicensePlateDetectorSensor creates a license plate detector sensor with the given name and options.

<a name="LicensePlateProperty"></a>
## type LicensePlateProperty

LicensePlateProperty is a property name of a license plate sensor.

	type LicensePlateProperty = string

<a name="LicensePlatePropertyDetected"></a>Property names of a license plate sensor.

	const (
	    LicensePlatePropertyDetected   LicensePlateProperty = "detected"   // Whether any license plate is currently detected
	    LicensePlatePropertyDetections LicensePlateProperty = "detections" // List of detected plates with OCR text. The plugin that owns the sensor does not get the backend's updates of it
	    LicensePlatePropertyPlates     LicensePlateProperty = "plates"     // Plate texts recognized during the active detection phase
	)

<a name="LicensePlateResult"></a>
## type LicensePlateResult

LicensePlateResult is the return value of LicensePlateDetector.DetectLicensePlates.

	type LicensePlateResult struct {
	    Detected   bool                    `msgpack:"detected" json:"detected"`     // Whether any license plate is detected in this frame
	    Detections []LicensePlateDetection `msgpack:"detections" json:"detections"` // Detections emitted for this frame
	}

<a name="LicensePlateSensor"></a>
## type LicensePlateSensor

LicensePlateSensor reports detected license plates and OCR results.

Plugin authors call ReportDetections to push detected plates. The detected flag is auto\-derived from the detection list.

	type LicensePlateSensor struct{ BaseSensor }

<a name="NewLicensePlateSensor"></a>
### func NewLicensePlateSensor

	func NewLicensePlateSensor(name string, opts ...SensorOption) *LicensePlateSensor

NewLicensePlateSensor creates a license plate sensor with the given name and options.

<a name="LicensePlateSensor.ClearDetections"></a>
### func \(\*LicensePlateSensor\) ClearDetections

	func (s *LicensePlateSensor) ClearDetections()

ClearDetections explicitly clears license plate state \(detected = false, detections = \[\]\).

<a name="LicensePlateSensor.GetCategory"></a>
### func \(\*LicensePlateSensor\) GetCategory

	func (s *LicensePlateSensor) GetCategory() SensorCategory



<a name="LicensePlateSensor.GetDetections"></a>
### func \(\*LicensePlateSensor\) GetDetections

	func (s *LicensePlateSensor) GetDetections() []LicensePlateDetection

GetDetections returns the detected plates with OCR text. The plugin that owns the sensor does not get the backend's updates of it.

<a name="LicensePlateSensor.GetPlates"></a>
### func \(\*LicensePlateSensor\) GetPlates

	func (s *LicensePlateSensor) GetPlates() []string

GetPlates returns the plate texts recognized during the active detection phase.

<a name="LicensePlateSensor.GetType"></a>
### func \(\*LicensePlateSensor\) GetType

	func (s *LicensePlateSensor) GetType() SensorType



<a name="LicensePlateSensor.IsDetected"></a>
### func \(\*LicensePlateSensor\) IsDetected

	func (s *LicensePlateSensor) IsDetected() bool

IsDetected reports whether any license plate is currently detected.

<a name="LicensePlateSensor.ReportDetections"></a>
### func \(\*LicensePlateSensor\) ReportDetections

	func (s *LicensePlateSensor) ReportDetections(detected bool, detections []LicensePlateDetection)

ReportDetections reports detected license plates.

- ReportDetections\(true, nil\): plate detected without specifics, the SDK synthesizes a single full\-frame detection with empty plateText.
- ReportDetections\(true, \[...\]\): explicit plate detections with OCR text.
- ReportDetections\(false, nil\): clear.

Example:

	sensor.ReportDetections(true, []LicensePlateDetection{
	    {Detection: Detection{Label: "vehicle", Confidence: 0.93, Box: &BoundingBox{X: 0.2, Y: 0.5, Width: 0.2, Height: 0.08}, Attribute: "license_plate"}, PlateText: "ABC 1234"},
	})
	sensor.ReportDetections(false, nil)
	

<a name="LicensePlateSensor.ToJSON"></a>
### func \(\*LicensePlateSensor\) ToJSON

	func (s *LicensePlateSensor) ToJSON() sensorJSON



<a name="LicensePlateSensor.UpdateValue"></a>
### func \(\*LicensePlateSensor\) UpdateValue

	func (s *LicensePlateSensor) UpdateValue(property string, value any) error

UpdateValue on a read\-only sensor: external writes are ignored.

<a name="LightColor"></a>
## type LightColor

LightColor is the color of a light.

	type LightColor struct {
	    // Hue in degrees (0-360).
	    Hue float64 `msgpack:"hue" json:"hue"`
	    // Saturation in percent (0-100).
	    Saturation float64 `msgpack:"saturation" json:"saturation"`
	}

<a name="LightColorMode"></a>
## type LightColorMode

LightColorMode says which of its two color settings a light shows.

	type LightColorMode = string

<a name="LightColorModeTemperature"></a>Color modes of a light.

	const (
	    LightColorModeTemperature LightColorMode = "temperature" // The white color temperature
	    LightColorModeColor       LightColorMode = "color"       // The color from hue and saturation
	)

<a name="LightControl"></a>
## type LightControl

LightControl is a light on/off and brightness control sensor. Override SetOn / SetOff \(by embedding LightControl in your own type and shadowing the methods\) to drive your hardware, then call the embedded LightControl's methods to sync the SDK state.

Plugins with no hardware\-action use case can leave the methods unoverridden, the base implementation just updates the state.

For hardware\-pushed updates \(someone manually flipped the switch\), call the embedded LightControl's SetOn / SetOff directly from your event handler. That bypasses any plugin override and only syncs state.

A light with LightCapabilityColorTemperature or LightCapabilityColor overrides SetColorTemperature and SetColor the same way. A command switches the color mode to the setting it changed. When the device reports its state, sync both settings and call SetColorMode with the one it shows.

	type LightControl struct{ BaseSensor }

<a name="NewLightControl"></a>
### func NewLightControl

	func NewLightControl(name string, opts ...SensorOption) *LightControl

NewLightControl creates a light control with the given name and options.

<a name="LightControl.GetBrightness"></a>
### func \(\*LightControl\) GetBrightness

	func (s *LightControl) GetBrightness() int

GetBrightness returns the brightness level \(0\-100\).

<a name="LightControl.GetCategory"></a>
### func \(\*LightControl\) GetCategory

	func (s *LightControl) GetCategory() SensorCategory



<a name="LightControl.GetColor"></a>
### func \(\*LightControl\) GetColor

	func (s *LightControl) GetColor() LightColor

GetColor returns the color as hue and saturation.

<a name="LightControl.GetColorMode"></a>
### func \(\*LightControl\) GetColorMode

	func (s *LightControl) GetColorMode() LightColorMode

GetColorMode returns whether the light shows its color temperature or its color.

<a name="LightControl.GetColorTemperature"></a>
### func \(\*LightControl\) GetColorTemperature

	func (s *LightControl) GetColorTemperature() int

GetColorTemperature returns the white color temperature in Kelvin.

<a name="LightControl.GetType"></a>
### func \(\*LightControl\) GetType

	func (s *LightControl) GetType() SensorType



<a name="LightControl.IsOn"></a>
### func \(\*LightControl\) IsOn

	func (s *LightControl) IsOn() bool

IsOn reports whether the light is on.

<a name="LightControl.SetBrightness"></a>
### func \(\*LightControl\) SetBrightness

	func (s *LightControl) SetBrightness(value int)

SetBrightness sets the brightness level \(clamped to \[0, 100\]\). Override \(via embedding\) to drive hardware and call the embedded LightControl's SetBrightness to sync the SDK state.

Example:

	light.SetBrightness(75)
	

<a name="LightControl.SetColor"></a>
### func \(\*LightControl\) SetColor

	func (s *LightControl) SetColor(hue, saturation float64)

SetColor sets the color \(hue clamped to \[0, 360\], saturation to \[0, 100\]\). Override \(via embedding\) to drive hardware and call the embedded LightControl's SetColor to sync the SDK state.

Example:

	light.SetColor(240, 100)
	

<a name="LightControl.SetColorMode"></a>
### func \(\*LightControl\) SetColorMode

	func (s *LightControl) SetColorMode(mode LightColorMode)

SetColorMode reports which of its two color settings the light shows.

Example:

	light.SetColorMode(sdk.LightColorModeColor)
	

<a name="LightControl.SetColorTemperature"></a>
### func \(\*LightControl\) SetColorTemperature

	func (s *LightControl) SetColorTemperature(kelvin int)

SetColorTemperature sets the white color temperature in Kelvin \(clamped to \[1000, 10000\]\). Override \(via embedding\) to drive hardware and call the embedded LightControl's SetColorTemperature to sync the SDK state.

Example:

	light.SetColorTemperature(2700)
	

<a name="LightControl.SetOff"></a>
### func \(\*LightControl\) SetOff

	func (s *LightControl) SetOff()

SetOff turns the light off. Override \(via embedding\) to drive hardware and call the embedded LightControl's SetOff to sync the SDK state.

Example:

	light.SetOff()
	

<a name="LightControl.SetOn"></a>
### func \(\*LightControl\) SetOn

	func (s *LightControl) SetOn()

SetOn turns the light on. Override \(via embedding\) to drive hardware and call the embedded LightControl's SetOn to sync the SDK state.

Example:

	light.SetOn()
	

<a name="LightControl.ToJSON"></a>
### func \(\*LightControl\) ToJSON

	func (s *LightControl) ToJSON() sensorJSON



<a name="LightControl.UpdateValue"></a>
### func \(\*LightControl\) UpdateValue

	func (s *LightControl) UpdateValue(property string, value any) error

UpdateValue routes generic property writes to the semantic setters.

<a name="LightProperty"></a>
## type LightProperty

LightProperty is a property name of a light control.

	type LightProperty = string

<a name="LightPropertyOn"></a>Property names of a light control.

	const (
	    LightPropertyOn               LightProperty = "on"               // Whether the light is on
	    LightPropertyBrightness       LightProperty = "brightness"       // Brightness level (0-100)
	    LightPropertyColorTemperature LightProperty = "colorTemperature" // White color temperature in Kelvin
	    LightPropertyColor            LightProperty = "color"            // Color as hue and saturation, see LightColor
	    LightPropertyColorMode        LightProperty = "colorMode"        // Whether the light shows its color temperature or its color
	)

<a name="LoadedModel"></a>
## type LoadedModel

LoadedModel is one model a sensor has loaded, reported for the metrics view and for debugging.

	type LoadedModel struct {
	    Name      string `msgpack:"name" json:"name"`                               // Resolved model name, after any "default" placeholder
	    Role      string `msgpack:"role,omitempty" json:"role,omitempty"`           // What it does in a sensor that loads several: detect, embed, ocr, text
	    Device    string `msgpack:"device,omitempty" json:"device,omitempty"`       // Where inference runs, resolved to the real device
	    Precision string `msgpack:"precision,omitempty" json:"precision,omitempty"` // Weight precision: fp32, fp16, int8
	    LoadMs    int    `msgpack:"loadMs,omitempty" json:"loadMs,omitempty"`       // How long loading took, in milliseconds
	}

<a name="LockControl"></a>
## type LockControl

LockControl is a lock/unlock control sensor. Override SetTargetState \(by embedding LockControl in your own type and shadowing the method\) to drive hardware and call the embedded LockControl's SetTargetState once the hardware confirms. The base implementation updates both targetState and currentState to the new value.

For asymmetric flows \(long\-running unlock with intermediate state\) override SetTargetState and write currentState separately when transitions complete.

	type LockControl struct{ BaseSensor }

<a name="NewLockControl"></a>
### func NewLockControl

	func NewLockControl(name string, opts ...SensorOption) *LockControl

NewLockControl creates a lock control with the given name and options.

<a name="LockControl.GetCategory"></a>
### func \(\*LockControl\) GetCategory

	func (s *LockControl) GetCategory() SensorCategory



<a name="LockControl.GetCurrentState"></a>
### func \(\*LockControl\) GetCurrentState

	func (s *LockControl) GetCurrentState() LockState

GetCurrentState returns the actual current state of the lock.

<a name="LockControl.GetTargetState"></a>
### func \(\*LockControl\) GetTargetState

	func (s *LockControl) GetTargetState() LockState

GetTargetState returns the desired target state \(set by user, transitions to the current state\).

<a name="LockControl.GetType"></a>
### func \(\*LockControl\) GetType

	func (s *LockControl) GetType() SensorType



<a name="LockControl.SetCurrentState"></a>
### func \(\*LockControl\) SetCurrentState

	func (s *LockControl) SetCurrentState(value LockState)

SetCurrentState publishes the actual lock state. Use it when the physical state diverges from the requested target: motorized locks that take time to rotate \(publish LockStateUnknown while moving\), or hardware reporting an out\-of\-band state change. Read\-only from cross\-process consumers \(UpdateValue ignores it\).

Example:

	lock.SetCurrentState(LockStateUnknown)
	

<a name="LockControl.SetTargetState"></a>
### func \(\*LockControl\) SetTargetState

	func (s *LockControl) SetTargetState(value LockState)

SetTargetState sets the target lock state. Writes both targetState and currentState.

Example:

	lock.SetTargetState(LockStateSecured)
	

<a name="LockControl.ToJSON"></a>
### func \(\*LockControl\) ToJSON

	func (s *LockControl) ToJSON() sensorJSON



<a name="LockControl.UpdateValue"></a>
### func \(\*LockControl\) UpdateValue

	func (s *LockControl) UpdateValue(property string, value any) error

UpdateValue routes generic property writes to the semantic setters. Only targetState is externally writable, currentState is observed\-only.

<a name="LockProperty"></a>
## type LockProperty

LockProperty is a property name of a lock control.

	type LockProperty = string

<a name="LockPropertyCurrentState"></a>Property names of a lock control.

	const (
	    LockPropertyCurrentState LockProperty = "currentState" // The actual current state of the lock
	    LockPropertyTargetState  LockProperty = "targetState"  // The desired target state (set by user, transitions to currentState)
	)

<a name="LockState"></a>
## type LockState

LockState defines lock states.

	type LockState int

<a name="LockStateSecured"></a>

	const (
	    LockStateSecured   LockState = 0 // Locked
	    LockStateUnsecured LockState = 1 // Unlocked
	    LockStateUnknown   LockState = 2 // State cannot be determined, e.g. while a motorized lock is moving
	    LockStateJammed    LockState = 3 // Something blocks the bolt, the lock is neither locked nor unlocked
	)

<a name="MeasurementInfo"></a>
## type MeasurementInfo

MeasurementInfo is the base of the sensors that report one reading, such as a temperature or a CO2 level. The concrete sensor types embed it and set the reading they start with and the range the quantity can have.

	type MeasurementInfo struct {
	    BaseSensor
	    // contains filtered or unexported fields
	}

<a name="MeasurementInfo.GetCategory"></a>
### func \(\*MeasurementInfo\) GetCategory

	func (s *MeasurementInfo) GetCategory() SensorCategory



<a name="MeasurementInfo.GetCurrent"></a>
### func \(\*MeasurementInfo\) GetCurrent

	func (s *MeasurementInfo) GetCurrent() float64

GetCurrent returns the current reading, in the unit of the sensor type.

<a name="MeasurementInfo.GetType"></a>
### func \(\*MeasurementInfo\) GetType

	func (s *MeasurementInfo) GetType() SensorType



<a name="MeasurementInfo.SetCurrent"></a>
### func \(\*MeasurementInfo\) SetCurrent

	func (s *MeasurementInfo) SetCurrent(value float64)

SetCurrent reports a new reading. A value outside the range of the quantity is clamped to it, NaN and infinite values are ignored.

Example:

	temperature.SetCurrent(21.5)
	

<a name="MeasurementInfo.ToJSON"></a>
### func \(\*MeasurementInfo\) ToJSON

	func (s *MeasurementInfo) ToJSON() sensorJSON



<a name="MeasurementInfo.UpdateValue"></a>
### func \(\*MeasurementInfo\) UpdateValue

	func (s *MeasurementInfo) UpdateValue(property string, value any) error

UpdateValue on a read\-only sensor: external writes are ignored.

<a name="MediaPlayerCommand"></a>
## type MediaPlayerCommand

MediaPlayerCommand is a command a media player takes.

	type MediaPlayerCommand = string

<a name="MediaPlayerCommandPlay"></a>Commands a media player takes.

	const (
	    MediaPlayerCommandPlay     MediaPlayerCommand = "play"
	    MediaPlayerCommandPause    MediaPlayerCommand = "pause"
	    MediaPlayerCommandStop     MediaPlayerCommand = "stop"
	    MediaPlayerCommandNext     MediaPlayerCommand = "next"
	    MediaPlayerCommandPrevious MediaPlayerCommand = "previous"
	)

<a name="MediaPlayerControl"></a>
## type MediaPlayerControl

MediaPlayerControl is a TV, speaker, receiver or projector. Override SetOn, SetOff, Play, Pause, Stop, Next, Previous, SetVolume, SetMuted and SetSource \(by embedding MediaPlayerControl in your own type and shadowing the methods\) to drive hardware, then call the embedded MediaPlayerControl's methods after success. Report what the player does with SetState and what plays with SetNowPlaying.

SetKind says what kind of device it is. Narrow the commands to those the player takes with SetPropertySpec\(MediaPlayerPropertyCommand, &PropertySpecOverride\{Values: ...\}\). The inputs come as choices with the source capability: SetPropertySpec\(MediaPlayerPropertySource, &PropertySpecOverride\{Choices: ...\}\).

	type MediaPlayerControl struct{ CommandControl }

<a name="NewMediaPlayerControl"></a>
### func NewMediaPlayerControl

	func NewMediaPlayerControl(name string, opts ...SensorOption) *MediaPlayerControl

NewMediaPlayerControl creates a media player with the given name and options.

<a name="MediaPlayerControl.GetArtist"></a>
### func \(\*MediaPlayerControl\) GetArtist

	func (s *MediaPlayerControl) GetArtist() string

GetArtist returns the artist of what plays.

<a name="MediaPlayerControl.GetKind"></a>
### func \(\*MediaPlayerControl\) GetKind

	func (s *MediaPlayerControl) GetKind() MediaPlayerKind

GetKind returns what kind of device it is, empty when the plugin did not say.

<a name="MediaPlayerControl.GetSource"></a>
### func \(\*MediaPlayerControl\) GetSource

	func (s *MediaPlayerControl) GetSource() string

GetSource returns the selected input or app.

<a name="MediaPlayerControl.GetState"></a>
### func \(\*MediaPlayerControl\) GetState

	func (s *MediaPlayerControl) GetState() MediaPlayerState

GetState returns what the player does right now, empty before the first report.

<a name="MediaPlayerControl.GetTitle"></a>
### func \(\*MediaPlayerControl\) GetTitle

	func (s *MediaPlayerControl) GetTitle() string

GetTitle returns the title of what plays.

<a name="MediaPlayerControl.GetVolume"></a>
### func \(\*MediaPlayerControl\) GetVolume

	func (s *MediaPlayerControl) GetVolume() (int, bool)

GetVolume returns the volume, 0 to 100, false before the first report.

<a name="MediaPlayerControl.IsMuted"></a>
### func \(\*MediaPlayerControl\) IsMuted

	func (s *MediaPlayerControl) IsMuted() bool

IsMuted reports whether the sound is muted.

<a name="MediaPlayerControl.IsOn"></a>
### func \(\*MediaPlayerControl\) IsOn

	func (s *MediaPlayerControl) IsOn() bool

IsOn reports whether the player is on.

<a name="MediaPlayerControl.Next"></a>
### func \(\*MediaPlayerControl\) Next

	func (s *MediaPlayerControl) Next()

Next skips to the next track or channel.

Example:

	player.Next()
	

<a name="MediaPlayerControl.Pause"></a>
### func \(\*MediaPlayerControl\) Pause

	func (s *MediaPlayerControl) Pause()

Pause pauses playback.

Example:

	player.Pause()
	

<a name="MediaPlayerControl.Play"></a>
### func \(\*MediaPlayerControl\) Play

	func (s *MediaPlayerControl) Play()

Play starts or resumes playback.

Example:

	player.Play()
	

<a name="MediaPlayerControl.Previous"></a>
### func \(\*MediaPlayerControl\) Previous

	func (s *MediaPlayerControl) Previous()

Previous goes back to the previous track or channel.

Example:

	player.Previous()
	

<a name="MediaPlayerControl.SetKind"></a>
### func \(\*MediaPlayerControl\) SetKind

	func (s *MediaPlayerControl) SetKind(kind MediaPlayerKind)

SetKind says what kind of device the player is. Smart homes show it by its kind, and Home Assistant takes it as the device class.

Example:

	player.SetKind(MediaPlayerKindSpeaker)
	

<a name="MediaPlayerControl.SetMuted"></a>
### func \(\*MediaPlayerControl\) SetMuted

	func (s *MediaPlayerControl) SetMuted(muted bool)

SetMuted mutes the sound, or unmutes it with false.

Example:

	player.SetMuted(true)
	

<a name="MediaPlayerControl.SetNowPlaying"></a>
### func \(\*MediaPlayerControl\) SetNowPlaying

	func (s *MediaPlayerControl) SetNowPlaying(title, artist string)

SetNowPlaying reports the title and artist of what plays, needs the nowPlaying capability. Pass empty strings when nothing plays.

Example:

	player.SetNowPlaying("So What", "Miles Davis")
	

<a name="MediaPlayerControl.SetOff"></a>
### func \(\*MediaPlayerControl\) SetOff

	func (s *MediaPlayerControl) SetOff()

SetOff turns the player off.

Example:

	player.SetOff()
	

<a name="MediaPlayerControl.SetOn"></a>
### func \(\*MediaPlayerControl\) SetOn

	func (s *MediaPlayerControl) SetOn()

SetOn turns the player on.

Example:

	player.SetOn()
	

<a name="MediaPlayerControl.SetSource"></a>
### func \(\*MediaPlayerControl\) SetSource

	func (s *MediaPlayerControl) SetSource(value string)

SetSource switches to another input or app, one of the source choices.

Example:

	player.SetSource("hdmi1")
	

<a name="MediaPlayerControl.SetState"></a>
### func \(\*MediaPlayerControl\) SetState

	func (s *MediaPlayerControl) SetState(value MediaPlayerState)

SetState reports what the player does right now: off, on, idle, playing, paused or buffering. IsOn follows: everything but off counts as on.

Example:

	player.SetState(MediaPlayerStatePlaying)
	

<a name="MediaPlayerControl.SetVolume"></a>
### func \(\*MediaPlayerControl\) SetVolume

	func (s *MediaPlayerControl) SetVolume(volume float64)

SetVolume sets the volume, 0 to 100, clamped and rounded.

Example:

	player.SetVolume(30)
	

<a name="MediaPlayerControl.Stop"></a>
### func \(\*MediaPlayerControl\) Stop

	func (s *MediaPlayerControl) Stop()

Stop stops playback.

Example:

	player.Stop()
	

<a name="MediaPlayerControl.UpdateValue"></a>
### func \(\*MediaPlayerControl\) UpdateValue

	func (s *MediaPlayerControl) UpdateValue(property string, value any) error

UpdateValue routes generic property writes to the semantic setters.

<a name="MediaPlayerKind"></a>
## type MediaPlayerKind

MediaPlayerKind is what kind of device a media player is.

	type MediaPlayerKind = string

<a name="MediaPlayerKindTv"></a>Kinds of a media player.

	const (
	    MediaPlayerKindTv        MediaPlayerKind = "tv"
	    MediaPlayerKindSpeaker   MediaPlayerKind = "speaker"
	    MediaPlayerKindReceiver  MediaPlayerKind = "receiver"
	    MediaPlayerKindProjector MediaPlayerKind = "projector"
	)

<a name="MediaPlayerProperty"></a>
## type MediaPlayerProperty

MediaPlayerProperty is a property name of a media player.

	type MediaPlayerProperty = string

<a name="MediaPlayerPropertyOn"></a>Property names of a media player.

	const (
	    MediaPlayerPropertyOn      MediaPlayerProperty = "on"      // Whether the player is on, writable with the power capability
	    MediaPlayerPropertyState   MediaPlayerProperty = "state"   // What the player does right now, a MediaPlayerState
	    MediaPlayerPropertyKind    MediaPlayerProperty = "kind"    // What kind of device it is, a MediaPlayerKind
	    MediaPlayerPropertyCommand MediaPlayerProperty = "command" // One-off MediaPlayerCommand when written, empty again right after
	    MediaPlayerPropertyVolume  MediaPlayerProperty = "volume"  // Volume, 0 to 100
	    MediaPlayerPropertyMuted   MediaPlayerProperty = "muted"   // Whether the sound is muted
	    MediaPlayerPropertySource  MediaPlayerProperty = "source"  // Selected input or app, one of the choices the plugin sets
	    MediaPlayerPropertyTitle   MediaPlayerProperty = "title"   // Title of what plays
	    MediaPlayerPropertyArtist  MediaPlayerProperty = "artist"  // Artist of what plays
	)

<a name="MediaPlayerState"></a>
## type MediaPlayerState

MediaPlayerState is what a media player does right now.

	type MediaPlayerState = string

<a name="MediaPlayerStateOff"></a>States of a media player.

	const (
	    MediaPlayerStateOff       MediaPlayerState = "off"
	    MediaPlayerStateOn        MediaPlayerState = "on" // On, without telling what it does
	    MediaPlayerStateIdle      MediaPlayerState = "idle"
	    MediaPlayerStatePlaying   MediaPlayerState = "playing"
	    MediaPlayerStatePaused    MediaPlayerState = "paused"
	    MediaPlayerStateBuffering MediaPlayerState = "buffering"
	)

<a name="ModelRuntime"></a>
## type ModelRuntime

ModelRuntime is what a sensor runs on. Every field is optional: a plugin that reports nothing simply shows nothing.

	type ModelRuntime struct {
	    Runtime string        `msgpack:"runtime,omitempty" json:"runtime,omitempty"` // Inference framework and version
	    Models  []LoadedModel `msgpack:"models,omitempty" json:"models,omitempty"`   // Loaded models, primary one first
	}

<a name="ModelSpec"></a>
## type ModelSpec

ModelSpec describes a detection model with fixed output labels \(face, classifier, license plate\). It declares the input shape the backend should produce and the trigger labels that should activate this detector.

	type ModelSpec struct {
	    ModelRuntime   `msgpack:",inline"`
	    Input          VideoInputSpec `msgpack:"input" json:"input"`                                       // Required input frame dimensions and pixel format
	    TriggerLabels  []string       `msgpack:"triggerLabels" json:"triggerLabels"`                       // Labels emitted by an upstream object detector that activate this detector
	    EmbeddingModel string         `msgpack:"embeddingModel,omitempty" json:"embeddingModel,omitempty"` // Embedding model identifier, required for face recognition and CLIP: embeddings are stored and matched under this id
	}

<a name="MotionDetector"></a>
## type MotionDetector

MotionDetector is implemented by plugins that analyze video frames for motion. The runtime calls DetectMotion at the configured frame interval, zone\-filters the returned detections and applies them to the associated MotionSensor. Detected is re\-derived from the surviving detections, so a result with no detections reports no motion.

	type MotionDetector interface {
	    // DetectMotion analyzes a single video frame and returns the motion result.
	    DetectMotion(frame VideoFrameData) (*MotionResult, error)
	}

<a name="MotionDetectorSensor"></a>
## type MotionDetectorSensor

MotionDetectorSensor is a motion sensor that consumes video frames from the backend pipeline. Pair with a MotionDetector implementation; the backend invokes the detector at the configured frame interval and forwards results to this sensor.

	type MotionDetectorSensor struct {
	    MotionSensor
	}

<a name="NewMotionDetectorSensor"></a>
### func NewMotionDetectorSensor

	func NewMotionDetectorSensor(name string, opts ...SensorOption) *MotionDetectorSensor

NewMotionDetectorSensor creates a motion detector sensor with the given name and options.

<a name="MotionProperty"></a>
## type MotionProperty

MotionProperty is a property name of a motion sensor.

	type MotionProperty = string

<a name="MotionPropertyDetected"></a>Property names of a motion sensor.

	const (
	    MotionPropertyDetected      MotionProperty = "detected"      // Whether motion is currently detected
	    MotionPropertyDetections    MotionProperty = "detections"    // List of detection results with bounding boxes. The plugin that owns the sensor does not get the backend's updates of it
	    MotionPropertyBlocked       MotionProperty = "blocked"       // When true, detection updates are suppressed (set by the backend dwell logic)
	    MotionPropertyLastTriggered MotionProperty = "lastTriggered" // Timestamp in milliseconds of the last detection trigger, set by the backend
	)

<a name="MotionResult"></a>
## type MotionResult

MotionResult is the return value of MotionDetector.DetectMotion.

	type MotionResult struct {
	    Detected   bool        `msgpack:"detected" json:"detected"`     // Whether motion is detected in this frame. Ignored by the backend, which re-derives it from the detections
	    Detections []Detection `msgpack:"detections" json:"detections"` // Detections emitted for this frame
	}

<a name="MotionSensor"></a>
## type MotionSensor

MotionSensor reports motion state and detection results.

Plugin authors call ReportDetections to push detection results. The detected flag is auto\-derived from the detection list. The blocked flag is read\-only and set by the backend dwell logic, ReportDetections is a no\-op while it is set.

	type MotionSensor struct {
	    BaseSensor
	}

<a name="NewMotionSensor"></a>
### func NewMotionSensor

	func NewMotionSensor(name string, opts ...SensorOption) *MotionSensor

NewMotionSensor creates a motion sensor with the given name and options.

<a name="MotionSensor.ClearDetections"></a>
### func \(\*MotionSensor\) ClearDetections

	func (s *MotionSensor) ClearDetections()

ClearDetections explicitly clears motion state \(detected = false, detections = \[\]\).

<a name="MotionSensor.GetCategory"></a>
### func \(\*MotionSensor\) GetCategory

	func (s *MotionSensor) GetCategory() SensorCategory



<a name="MotionSensor.GetDetections"></a>
### func \(\*MotionSensor\) GetDetections

	func (s *MotionSensor) GetDetections() []Detection

GetDetections returns the detection results with bounding boxes. The plugin that owns the sensor does not get the backend's updates of it.

<a name="MotionSensor.GetType"></a>
### func \(\*MotionSensor\) GetType

	func (s *MotionSensor) GetType() SensorType



<a name="MotionSensor.IsBlocked"></a>
### func \(\*MotionSensor\) IsBlocked

	func (s *MotionSensor) IsBlocked() bool

IsBlocked reports whether detection updates are suppressed \(set by the backend dwell logic\).

<a name="MotionSensor.IsDetected"></a>
### func \(\*MotionSensor\) IsDetected

	func (s *MotionSensor) IsDetected() bool

IsDetected reports whether motion is currently detected.

<a name="MotionSensor.ReportDetections"></a>
### func \(\*MotionSensor\) ReportDetections

	func (s *MotionSensor) ReportDetections(detected bool, detections []Detection)

ReportDetections reports a motion detection result.

- ReportDetections\(true, nil\): motion detected without bounding box. The SDK synthesizes a single full\-frame "motion" detection.
- ReportDetections\(true, \[...\]\): motion detected with explicit detections.
- ReportDetections\(false, nil\): no motion \(clears detections\).

No\-op while the sensor is blocked by the backend dwell logic.

Example:

	sensor.ReportDetections(true, []Detection{
	    {Label: "motion", Confidence: 0.85, Box: &BoundingBox{X: 0.1, Y: 0.2, Width: 0.3, Height: 0.4}},
	})
	sensor.ReportDetections(false, nil)
	

<a name="MotionSensor.ToJSON"></a>
### func \(\*MotionSensor\) ToJSON

	func (s *MotionSensor) ToJSON() sensorJSON



<a name="MotionSensor.UpdateValue"></a>
### func \(\*MotionSensor\) UpdateValue

	func (s *MotionSensor) UpdateValue(property string, value any) error

UpdateValue on a read\-only sensor: external writes are ignored.

<a name="ObjectDetector"></a>
## type ObjectDetector

ObjectDetector is implemented by plugins that detect objects in video frames. The runtime scales frames to match ModelSpec before each call.

	type ObjectDetector interface {
	    // ModelSpec declares the expected input dimensions.
	    ModelSpec() ObjectModelSpec
	    // DetectObjects analyzes a single video frame and returns the object result.
	    DetectObjects(frame VideoFrameData) (*ObjectResult, error)
	}

<a name="ObjectDetectorSensor"></a>
## type ObjectDetectorSensor

ObjectDetectorSensor is an object sensor that consumes video frames from the backend pipeline. Pair with an ObjectDetector implementation. Up to three DetectObjects calls can run at once on separate goroutines, so DetectObjects must be safe for concurrent use, or the embedding type declares its own RPCConcurrency returning nil to get one call at a time.

	type ObjectDetectorSensor struct {
	    ObjectSensor
	}

<a name="NewObjectDetectorSensor"></a>
### func NewObjectDetectorSensor

	func NewObjectDetectorSensor(name string, opts ...SensorOption) *ObjectDetectorSensor

NewObjectDetectorSensor creates an object detector sensor with the given name and options.

<a name="ObjectDetectorSensor.RPCConcurrency"></a>
### func \(\*ObjectDetectorSensor\) RPCConcurrency

	func (s *ObjectDetectorSensor) RPCConcurrency() map[string]int

RPCConcurrency returns how many calls per method the backend may run at once, keyed by wire name. A detector overrides it to change the limit.

Example:

	func (d *MyDetector) RPCConcurrency() map[string]int { return nil }

<a name="ObjectMask"></a>
## type ObjectMask

ObjectMask is the outline of one object: a mask laid over its box.

	type ObjectMask struct {
	    Box    BoundingBox `msgpack:"box" json:"box"`       // Box the mask covers, normalized to the image the object was found in
	    Width  int         `msgpack:"width" json:"width"`   // Mask width in pixels
	    Height int         `msgpack:"height" json:"height"` // Mask height in pixels
	    Data   []byte      `msgpack:"data" json:"data"`     // One byte per pixel, row by row from the top left: how likely the pixel belongs to the object (0 - 255). Above 127 counts as the object
	}

<a name="ObjectModelSpec"></a>
## type ObjectModelSpec

ObjectModelSpec describes an object detection model. Only declares input dimensions, the output label set is dynamic and comes from the model itself.

	type ObjectModelSpec struct {
	    ModelRuntime `msgpack:",inline"`
	    Input        VideoInputSpec `msgpack:"input" json:"input"` // Required input frame dimensions and pixel format
	}

<a name="ObjectProperty"></a>
## type ObjectProperty

ObjectProperty is a property name of an object detection sensor.

	type ObjectProperty = string

<a name="ObjectPropertyDetected"></a>Property names of an object detection sensor.

	const (
	    ObjectPropertyDetected         ObjectProperty = "detected"         // Whether any object is currently detected
	    ObjectPropertyDetections       ObjectProperty = "detections"       // List of detected objects with labels and bounding boxes. The plugin that owns the sensor does not get the backend's updates of it
	    ObjectPropertyLabels           ObjectProperty = "labels"           // Unique labels of the current detections (auto-derived when reporting detections)
	    ObjectPropertyStaticDetections ObjectProperty = "staticDetections" // Settled objects hidden from events, kept visible for overlays. Written by the backend. The plugin that owns the sensor does not get the backend's updates of it
	)

<a name="ObjectResult"></a>
## type ObjectResult

ObjectResult is the return value of ObjectDetector.DetectObjects.

	type ObjectResult struct {
	    Detected   bool               `msgpack:"detected" json:"detected"`     // Whether any object is detected in this frame
	    Detections []TrackedDetection `msgpack:"detections" json:"detections"` // Detections emitted for this frame
	}

<a name="ObjectSensor"></a>
## type ObjectSensor

ObjectSensor reports detected objects \(person, vehicle, animal, etc.\).

Plugin authors call ReportDetections to push detection results. The detected flag and the labels are auto\-derived from the detection list.

	type ObjectSensor struct {
	    BaseSensor
	}

<a name="NewObjectSensor"></a>
### func NewObjectSensor

	func NewObjectSensor(name string, opts ...SensorOption) *ObjectSensor

NewObjectSensor creates an object sensor with the given name and options.

<a name="ObjectSensor.ClearDetections"></a>
### func \(\*ObjectSensor\) ClearDetections

	func (s *ObjectSensor) ClearDetections()

ClearDetections explicitly clears detection state \(detected = false, detections = \[\], labels = \[\]\).

<a name="ObjectSensor.GetCategory"></a>
### func \(\*ObjectSensor\) GetCategory

	func (s *ObjectSensor) GetCategory() SensorCategory



<a name="ObjectSensor.GetDetections"></a>
### func \(\*ObjectSensor\) GetDetections

	func (s *ObjectSensor) GetDetections() []TrackedDetection

GetDetections returns the detected objects with labels and bounding boxes. The plugin that owns the sensor does not get the backend's updates of it.

<a name="ObjectSensor.GetLabels"></a>
### func \(\*ObjectSensor\) GetLabels

	func (s *ObjectSensor) GetLabels() []string

GetLabels returns the unique labels of the current detections \(auto\-derived when reporting detections\).

<a name="ObjectSensor.GetType"></a>
### func \(\*ObjectSensor\) GetType

	func (s *ObjectSensor) GetType() SensorType



<a name="ObjectSensor.IsDetected"></a>
### func \(\*ObjectSensor\) IsDetected

	func (s *ObjectSensor) IsDetected() bool

IsDetected reports whether any object is currently detected.

<a name="ObjectSensor.ReportDetections"></a>
### func \(\*ObjectSensor\) ReportDetections

	func (s *ObjectSensor) ReportDetections(detected bool, detections []TrackedDetection)

ReportDetections reports detected objects. The detected flag and the labels are auto\-derived from the detection list.

- ReportDetections\(true, nil\): generic trigger, synthesizes a single full\-frame "motion" detection as a fallback.
- ReportDetections\(true, \[...\]\): explicit detections.
- ReportDetections\(false, nil\): clear.

Example:

	sensor.ReportDetections(true, []TrackedDetection{
	    {Detection: Detection{Label: "person", Confidence: 0.92, Box: &BoundingBox{X: 0.1, Y: 0.2, Width: 0.3, Height: 0.4}}},
	})
	sensor.ReportDetections(false, nil)
	

<a name="ObjectSensor.ToJSON"></a>
### func \(\*ObjectSensor\) ToJSON

	func (s *ObjectSensor) ToJSON() sensorJSON



<a name="ObjectSensor.UpdateValue"></a>
### func \(\*ObjectSensor\) UpdateValue

	func (s *ObjectSensor) UpdateValue(property string, value any) error

UpdateValue on a read\-only sensor: external writes are ignored.

<a name="OccupancyProperty"></a>
## type OccupancyProperty

OccupancyProperty is a property name of an occupancy sensor.

	type OccupancyProperty = string

<a name="OccupancyPropertyDetected"></a>Property names of an occupancy sensor.

	const (
	    OccupancyPropertyDetected OccupancyProperty = "detected" // Whether occupancy is detected (true = occupied)
	)

<a name="OccupancySensor"></a>
## type OccupancySensor

OccupancySensor reports occupancy/presence state.

	type OccupancySensor struct{ BinarySensor }

<a name="NewOccupancySensor"></a>
### func NewOccupancySensor

	func NewOccupancySensor(name string, opts ...SensorOption) *OccupancySensor

NewOccupancySensor creates an occupancy sensor with the given name and options.

<a name="OutletControl"></a>
## type OutletControl

OutletControl is a power outlet or smart plug. Override SetOn / SetOff \(by embedding OutletControl in your own type and shadowing the methods\) to drive hardware, then call the embedded OutletControl's methods to sync the SDK state. For hardware\-pushed updates, call the embedded methods directly from your event handler.

An outlet that measures its load adds OutletCapabilityInUse and reports it with SetInUse.

	type OutletControl struct{ BaseSensor }

<a name="NewOutletControl"></a>
### func NewOutletControl

	func NewOutletControl(name string, opts ...SensorOption) *OutletControl

NewOutletControl creates an outlet with the given name and options.

<a name="OutletControl.GetCategory"></a>
### func \(\*OutletControl\) GetCategory

	func (s *OutletControl) GetCategory() SensorCategory



<a name="OutletControl.GetType"></a>
### func \(\*OutletControl\) GetType

	func (s *OutletControl) GetType() SensorType



<a name="OutletControl.IsInUse"></a>
### func \(\*OutletControl\) IsInUse

	func (s *OutletControl) IsInUse() bool

IsInUse reports whether the device plugged into the outlet draws power.

<a name="OutletControl.IsOn"></a>
### func \(\*OutletControl\) IsOn

	func (s *OutletControl) IsOn() bool

IsOn reports whether the outlet is on.

<a name="OutletControl.SetInUse"></a>
### func \(\*OutletControl\) SetInUse

	func (s *OutletControl) SetInUse(inUse bool)

SetInUse reports whether the device plugged into the outlet draws power.

Example:

	outlet.SetInUse(watts > 1)
	

<a name="OutletControl.SetOff"></a>
### func \(\*OutletControl\) SetOff

	func (s *OutletControl) SetOff()

SetOff turns the outlet off.

Example:

	outlet.SetOff()
	

<a name="OutletControl.SetOn"></a>
### func \(\*OutletControl\) SetOn

	func (s *OutletControl) SetOn()

SetOn turns the outlet on.

Example:

	outlet.SetOn()
	

<a name="OutletControl.ToJSON"></a>
### func \(\*OutletControl\) ToJSON

	func (s *OutletControl) ToJSON() sensorJSON



<a name="OutletControl.UpdateValue"></a>
### func \(\*OutletControl\) UpdateValue

	func (s *OutletControl) UpdateValue(property string, value any) error

UpdateValue routes generic property writes to the semantic setters.

<a name="OutletProperty"></a>
## type OutletProperty

OutletProperty is a property name of an outlet.

	type OutletProperty = string

<a name="OutletPropertyOn"></a>Property names of an outlet.

	const (
	    OutletPropertyOn    OutletProperty = "on"    // Whether the outlet is on
	    OutletPropertyInUse OutletProperty = "inUse" // Whether the device plugged into the outlet draws power
	)

<a name="PTZControl"></a>
## type PTZControl

PTZControl is a pan\-tilt\-zoom camera control sensor. Override SetPosition / SetVelocity / SetTargetPreset \(by embedding PTZControl in your own type and shadowing the methods\) to drive hardware, then call the corresponding embedded method after success to sync the SDK state. For hardware\-pushed state updates \(e.g. PTZ position change events\), call the embedded methods directly from your event handler. That bypasses any plugin override and only syncs state.

Set capabilities to advertise supported axes and features. Use SetPresets to publish the discovered preset list and SetMoving to publish movement state.

	type PTZControl struct{ BaseSensor }

<a name="NewPTZControl"></a>
### func NewPTZControl

	func NewPTZControl(name string, opts ...SensorOption) *PTZControl

NewPTZControl creates a PTZ control with the given name and options.

<a name="PTZControl.GetCategory"></a>
### func \(\*PTZControl\) GetCategory

	func (s *PTZControl) GetCategory() SensorCategory



<a name="PTZControl.GetPosition"></a>
### func \(\*PTZControl\) GetPosition

	func (s *PTZControl) GetPosition() PTZPosition

GetPosition returns the current pan/tilt/zoom position.

<a name="PTZControl.GetPresets"></a>
### func \(\*PTZControl\) GetPresets

	func (s *PTZControl) GetPresets() []string

GetPresets returns the available preset names, empty until SetPresets runs.

<a name="PTZControl.GetTargetPreset"></a>
### func \(\*PTZControl\) GetTargetPreset

	func (s *PTZControl) GetTargetPreset() (string, bool)

GetTargetPreset returns the target preset to move to. ok is false until a preset was requested.

<a name="PTZControl.GetType"></a>
### func \(\*PTZControl\) GetType

	func (s *PTZControl) GetType() SensorType



<a name="PTZControl.GetVelocity"></a>
### func \(\*PTZControl\) GetVelocity

	func (s *PTZControl) GetVelocity() (PTZDirection, bool)

GetVelocity returns the current movement velocity \(continuous move\). ok is false until a continuous move was issued.

<a name="PTZControl.GoHome"></a>
### func \(\*PTZControl\) GoHome

	func (s *PTZControl) GoHome()

GoHome moves the PTZ to the home position \(0, 0, 0\).

Example:

	ptz.GoHome()
	

<a name="PTZControl.IsMoving"></a>
### func \(\*PTZControl\) IsMoving

	func (s *PTZControl) IsMoving() bool

IsMoving reports whether the camera is currently moving.

<a name="PTZControl.SetMoving"></a>
### func \(\*PTZControl\) SetMoving

	func (s *PTZControl) SetMoving(value bool)

SetMoving publishes the movement state.

Example:

	ptz.SetMoving(true)
	

<a name="PTZControl.SetPosition"></a>
### func \(\*PTZControl\) SetPosition

	func (s *PTZControl) SetPosition(value PTZPosition)

SetPosition sets the absolute PTZ position.

Example:

	ptz.SetPosition(PTZPosition{Pan: 0.25, Tilt: -0.1, Zoom: 0.5})
	

<a name="PTZControl.SetPresets"></a>
### func \(\*PTZControl\) SetPresets

	func (s *PTZControl) SetPresets(value []string)

SetPresets publishes the discovered preset list. The preset list stays empty until this runs.

Example:

	ptz.SetPresets([]string{"Home", "Driveway", "Backyard"})
	

<a name="PTZControl.SetRelativeMove"></a>
### func \(\*PTZControl\) SetRelativeMove

	func (s *PTZControl) SetRelativeMove(value PTZRelativeMove)

SetRelativeMove issues a relative displacement move. Shadow this method to drive hardware \(e.g. ONVIF RelativeMove in a translation space\) and call the embedded method after success to sync the SDK state. Advertise PTZCapabilityRelativeMove when the camera supports it.

Example:

	// move the view a third of a frame to the right, a tenth down
	ptz.SetRelativeMove(PTZRelativeMove{PanDelta: 0.33, TiltDelta: -0.1, ZoomDelta: 0})
	

<a name="PTZControl.SetTargetPreset"></a>
### func \(\*PTZControl\) SetTargetPreset

	func (s *PTZControl) SetTargetPreset(value string)

SetTargetPreset sets the target preset ID. The property is unset until this runs.

Example:

	ptz.SetTargetPreset("Driveway")
	

<a name="PTZControl.SetVelocity"></a>
### func \(\*PTZControl\) SetVelocity

	func (s *PTZControl) SetVelocity(value PTZDirection)

SetVelocity sets the continuous\-move velocity. The velocity property is unset until the first continuous move is issued.

Example:

	ptz.SetVelocity(PTZDirection{PanSpeed: 0.5, TiltSpeed: 0, ZoomSpeed: 0})
	ptz.SetVelocity(PTZDirection{}) // stop
	

<a name="PTZControl.ToJSON"></a>
### func \(\*PTZControl\) ToJSON

	func (s *PTZControl) ToJSON() sensorJSON



<a name="PTZControl.UpdateValue"></a>
### func \(\*PTZControl\) UpdateValue

	func (s *PTZControl) UpdateValue(property string, value any) error

UpdateValue routes generic property writes to the semantic setters.

<a name="PTZProperty"></a>
## type PTZProperty

PTZProperty is a property name of a PTZ control.

	type PTZProperty = string

<a name="PTZPropertyPosition"></a>Property names of a PTZ control.

	const (
	    PTZPropertyPosition     PTZProperty = "position"     // Current pan/tilt/zoom position
	    PTZPropertyMoving       PTZProperty = "moving"       // Whether the camera is currently moving
	    PTZPropertyPresets      PTZProperty = "presets"      // List of available preset names. Empty until `setPresets()` runs
	    PTZPropertyVelocity     PTZProperty = "velocity"     // Current movement velocity (continuous move). Undefined until a continuous move was issued
	    PTZPropertyTargetPreset PTZProperty = "targetPreset" // Target preset to move to. Undefined until a preset was requested
	    PTZPropertyRelativeMove PTZProperty = "relativeMove" // Relative displacement move command (write-only)
	    PTZPropertyHome         PTZProperty = "home"         // Move to the home position (write-only command, carries no state)
	)

<a name="PersonEmbedder"></a>
## type PersonEmbedder

PersonEmbedder is implemented by plugins that turn the crop of a person into a vector of their appearance.

	type PersonEmbedder interface {
	    // ModelSpec declares the expected input dimensions and trigger labels.
	    ModelSpec() ModelSpec
	    // EmbedPersons embeds a batch of person crops, each cut tight around the
	    // detected box and stretched to ModelSpec().Input. Must return exactly one
	    // PersonEmbeddingResult per input frame, in the same order; return an
	    // empty Embedding for a crop the model could not use.
	    EmbedPersons(frames []VideoFrameData) ([]PersonEmbeddingResult, error)
	}

<a name="PersonEmbedderSensor"></a>
## type PersonEmbedderSensor

PersonEmbedderSensor is a frame\-only sensor that turns person crops into vectors of their appearance, to find the same person again when no face is visible. Pair with a PersonEmbedder implementation.

The crop is the person's box from the object detector, cut tight from the source frame. A vector describes clothing and build, not identity: it finds the same person on the same day, not after a change of clothes. Vectors from different models are not comparable, which is why every result carries its embedding model.

	type PersonEmbedderSensor struct{ BaseSensor }

<a name="NewPersonEmbedderSensor"></a>
### func NewPersonEmbedderSensor

	func NewPersonEmbedderSensor(name string, opts ...SensorOption) *PersonEmbedderSensor

NewPersonEmbedderSensor creates a person embedder sensor with the given name and options.

<a name="PersonEmbedderSensor.GetCategory"></a>
### func \(\*PersonEmbedderSensor\) GetCategory

	func (s *PersonEmbedderSensor) GetCategory() SensorCategory



<a name="PersonEmbedderSensor.GetType"></a>
### func \(\*PersonEmbedderSensor\) GetType

	func (s *PersonEmbedderSensor) GetType() SensorType



<a name="PersonEmbedderSensor.ToJSON"></a>
### func \(\*PersonEmbedderSensor\) ToJSON

	func (s *PersonEmbedderSensor) ToJSON() sensorJSON



<a name="PersonEmbedderSensor.UpdateValue"></a>
### func \(\*PersonEmbedderSensor\) UpdateValue

	func (s *PersonEmbedderSensor) UpdateValue(property string, value any) error

UpdateValue on a read\-only sensor: external writes are ignored.

<a name="PersonEmbeddingResult"></a>
## type PersonEmbeddingResult

PersonEmbeddingResult is the return value of PersonEmbedder.EmbedPersons.

	type PersonEmbeddingResult struct {
	    Embedding      []float64 `msgpack:"embedding" json:"embedding"`           // Embedding vector for the person in this crop, empty when the crop could not be embedded
	    EmbeddingModel string    `msgpack:"embeddingModel" json:"embeddingModel"` // Identifier of the embedding model that produced the vector
	}

<a name="PowerProperty"></a>
## type PowerProperty

PowerProperty is a property name of a power sensor.

	type PowerProperty = string

<a name="PowerPropertyDetected"></a>Property names of a power sensor.

	const (
	    PowerPropertyDetected PowerProperty = "detected" // Whether power is detected
	)

<a name="PowerSensor"></a>
## type PowerSensor

PowerSensor reports power detection state.

	type PowerSensor struct{ BinarySensor }

<a name="NewPowerSensor"></a>
### func NewPowerSensor

	func NewPowerSensor(name string, opts ...SensorOption) *PowerSensor

NewPowerSensor creates a power sensor with the given name and options.

<a name="PresenceProperty"></a>
## type PresenceProperty

PresenceProperty is a property name of a presence sensor.

	type PresenceProperty = string

<a name="PresencePropertyDetected"></a>Property names of a presence sensor.

	const (
	    PresencePropertyDetected PresenceProperty = "detected" // Whether the person is at home
	    PresencePropertyZone     PresenceProperty = "zone"     // Name of the zone the person is in while away, empty at home or when unknown
	)

<a name="PresenceSensor"></a>
## type PresenceSensor

PresenceSensor reports whether one person is at home, such as from a phone's location or a tracker. Unlike an occupancy sensor it follows a person, not a room.

	type PresenceSensor struct{ BinarySensor }

<a name="NewPresenceSensor"></a>
### func NewPresenceSensor

	func NewPresenceSensor(name string, opts ...SensorOption) *PresenceSensor

NewPresenceSensor creates a presence sensor with the given name and options.

<a name="PresenceSensor.GetZone"></a>
### func \(\*PresenceSensor\) GetZone

	func (s *PresenceSensor) GetZone() string

GetZone returns the name of the zone the person is in while away, empty at home or when unknown.

<a name="PresenceSensor.SetZone"></a>
### func \(\*PresenceSensor\) SetZone

	func (s *PresenceSensor) SetZone(zone string)

SetZone reports the zone the person is in while away, empty when the zone is unknown.

Example:

	presence.SetDetected(false)
	presence.SetZone("Work")

<a name="ProblemProperty"></a>
## type ProblemProperty

ProblemProperty is a property name of a problem sensor.

	type ProblemProperty = string

<a name="ProblemPropertyDetected"></a>Property names of a problem sensor.

	const (
	    ProblemPropertyDetected ProblemProperty = "detected" // Whether a problem is detected
	)

<a name="ProblemSensor"></a>
## type ProblemSensor

ProblemSensor reports the problem state.

	type ProblemSensor struct{ BinarySensor }

<a name="NewProblemSensor"></a>
### func NewProblemSensor

	func NewProblemSensor(name string, opts ...SensorOption) *ProblemSensor

NewProblemSensor creates a problem sensor with the given name and options.

<a name="PropertySpecOverride"></a>
## type PropertySpecOverride

PropertySpecOverride is what a plugin narrows or describes on one property of its sensor, on top of the type's spec: a thermostat's range, a chime's tones, an alarm without night mode. The host rejects a command outside it before it reaches the plugin, readings the plugin reports are not checked.

	type PropertySpecOverride struct {
	    // Min is the lowest accepted value, inside the type's range.
	    Min *float64 `msgpack:"min,omitempty" json:"min,omitempty"`
	    // Max is the highest accepted value, inside the type's range.
	    Max *float64 `msgpack:"max,omitempty" json:"max,omitempty"`
	    // Step is the accepted increment, commands are rounded to it.
	    Step *float64 `msgpack:"step,omitempty" json:"step,omitempty"`
	    // Unit is the display unit, only for a property whose type sets none.
	    Unit string `msgpack:"unit,omitempty" json:"unit,omitempty"`
	    // Values lists the values an enum property supports at the device, a subset of the type's.
	    Values []any `msgpack:"values,omitempty" json:"values,omitempty"`
	    // Choices lists the values the device offers with their names at the device, for a property without a fixed enum.
	    Choices []SensorPropertyChoice `msgpack:"choices,omitempty" json:"choices,omitempty"`
	    // MaxLength is the longest accepted text.
	    MaxLength *int `msgpack:"maxLength,omitempty" json:"maxLength,omitempty"`
	}

<a name="RobotControl"></a>
## type RobotControl

RobotControl is the base of the robots that run on their own and take one\-off commands, such as a vacuum or a lawn mower. The concrete control types embed it.

	type RobotControl struct{ CommandControl }

<a name="RobotControl.GetActivity"></a>
### func \(\*RobotControl\) GetActivity

	func (s *RobotControl) GetActivity() string

GetActivity returns what the robot does right now, empty before the first report.

<a name="RobotControl.SetActivity"></a>
### func \(\*RobotControl\) SetActivity

	func (s *RobotControl) SetActivity(value string)

SetActivity reports what the robot does right now, one of the activities of its type.

Example:

	robot.SetActivity(VacuumActivityDocked)

<a name="SceneControl"></a>
## type SceneControl

SceneControl is a scene or script that runs on command and has no state of its own. Override Activate \(by embedding SceneControl in your own type and shadowing the method\) to run it on the device, then call the embedded method after success, which sets active for a moment \(sceneAutoResetMs\).

	type SceneControl struct {
	    BaseSensor
	    // contains filtered or unexported fields
	}

<a name="NewSceneControl"></a>
### func NewSceneControl

	func NewSceneControl(name string, opts ...SensorOption) *SceneControl

NewSceneControl creates a scene with the given name and options.

<a name="SceneControl.Activate"></a>
### func \(\*SceneControl\) Activate

	func (s *SceneControl) Activate()

Activate runs the scene. The active property reads true for a moment and then false again, so the next command arrives the same way.

Example:

	scene.Activate()
	

<a name="SceneControl.GetCategory"></a>
### func \(\*SceneControl\) GetCategory

	func (s *SceneControl) GetCategory() SensorCategory



<a name="SceneControl.GetType"></a>
### func \(\*SceneControl\) GetType

	func (s *SceneControl) GetType() SensorType



<a name="SceneControl.IsActive"></a>
### func \(\*SceneControl\) IsActive

	func (s *SceneControl) IsActive() bool

IsActive reports true for a moment after the scene ran.

<a name="SceneControl.ToJSON"></a>
### func \(\*SceneControl\) ToJSON

	func (s *SceneControl) ToJSON() sensorJSON



<a name="SceneControl.UpdateValue"></a>
### func \(\*SceneControl\) UpdateValue

	func (s *SceneControl) UpdateValue(property string, value any) error

UpdateValue routes generic property writes to the semantic setters. Writing active=false is ignored, the reset timer owns the off transition.

<a name="SceneProperty"></a>
## type SceneProperty

SceneProperty is a property name of a scene.

	type SceneProperty = string

<a name="ScenePropertyActive"></a>Property names of a scene.

	const (
	    ScenePropertyActive SceneProperty = "active" // True for a moment while the scene runs, a command when written true
	)

<a name="SecuritySystem"></a>
## type SecuritySystem

SecuritySystem is a security system arm/disarm control sensor.

	type SecuritySystem struct{ BaseSensor }

<a name="NewSecuritySystem"></a>
### func NewSecuritySystem

	func NewSecuritySystem(name string, opts ...SensorOption) *SecuritySystem

NewSecuritySystem creates a security system with the given name and options.

<a name="SecuritySystem.GetCategory"></a>
### func \(\*SecuritySystem\) GetCategory

	func (s *SecuritySystem) GetCategory() SensorCategory



<a name="SecuritySystem.GetCurrentState"></a>
### func \(\*SecuritySystem\) GetCurrentState

	func (s *SecuritySystem) GetCurrentState() SecuritySystemState

GetCurrentState returns the actual current state of the security system.

<a name="SecuritySystem.GetTargetState"></a>
### func \(\*SecuritySystem\) GetTargetState

	func (s *SecuritySystem) GetTargetState() SecuritySystemState

GetTargetState returns the desired target state \(set by user, transitions to the current state\), never SecuritySystemStateAlarmTriggered.

<a name="SecuritySystem.GetType"></a>
### func \(\*SecuritySystem\) GetType

	func (s *SecuritySystem) GetType() SensorType



<a name="SecuritySystem.SetCurrentState"></a>
### func \(\*SecuritySystem\) SetCurrentState

	func (s *SecuritySystem) SetCurrentState(value SecuritySystemState)

SetCurrentState publishes the actual security system state. Use this for transitions that diverge from the user\-requested target: AlarmTriggered when an intruder is detected, or arming\-delay intermediate states. Read\-only from cross\-process consumers \(UpdateValue ignores it\).

Example:

	alarm.SetCurrentState(SecuritySystemStateAlarmTriggered)
	

<a name="SecuritySystem.SetTargetState"></a>
### func \(\*SecuritySystem\) SetTargetState

	func (s *SecuritySystem) SetTargetState(value SecuritySystemState)

SetTargetState sets the target state. Writes both targetState and currentState. The target state is never SecuritySystemStateAlarmTriggered, publish that through SetCurrentState.

Example:

	alarm.SetTargetState(SecuritySystemStateAwayArm)
	

<a name="SecuritySystem.ToJSON"></a>
### func \(\*SecuritySystem\) ToJSON

	func (s *SecuritySystem) ToJSON() sensorJSON



<a name="SecuritySystem.UpdateValue"></a>
### func \(\*SecuritySystem\) UpdateValue

	func (s *SecuritySystem) UpdateValue(property string, value any) error

UpdateValue routes generic property writes to the semantic setters.

<a name="SecuritySystemProperty"></a>
## type SecuritySystemProperty

SecuritySystemProperty is a property name of a security system control.

	type SecuritySystemProperty = string

<a name="SecuritySystemPropertyCurrentState"></a>Property names of a security system control.

	const (
	    SecuritySystemPropertyCurrentState SecuritySystemProperty = "currentState" // The actual current state of the security system
	    SecuritySystemPropertyTargetState  SecuritySystemProperty = "targetState"  // The desired target state (set by user, transitions to currentState). Never `AlarmTriggered`
	)

<a name="SecuritySystemState"></a>
## type SecuritySystemState

SecuritySystemState defines security system states.

	type SecuritySystemState int

<a name="SecuritySystemStateStayArm"></a>

	const (
	    SecuritySystemStateStayArm        SecuritySystemState = 0 // Armed, occupants home
	    SecuritySystemStateAwayArm        SecuritySystemState = 1 // Armed, occupants away
	    SecuritySystemStateNightArm       SecuritySystemState = 2 // Armed for night mode
	    SecuritySystemStateDisarmed       SecuritySystemState = 3 // System disarmed
	    SecuritySystemStateAlarmTriggered SecuritySystemState = 4 // Alarm is triggered
	)

<a name="SegmentationFrame"></a>
## type SegmentationFrame

SegmentationFrame is a crop handed to Segmenter.SegmentObjects, with the object it was cut for.

	type SegmentationFrame struct {
	    VideoFrameData `msgpack:",inline"`
	    Box            BoundingBox `msgpack:"box" json:"box"` // Box of the object to outline, normalized to this crop
	}

<a name="SegmentationResult"></a>
## type SegmentationResult

SegmentationResult is the return value of Segmenter.SegmentObjects.

	type SegmentationResult struct {
	    Mask *ObjectMask `msgpack:"mask,omitempty" json:"mask,omitempty"` // The object's outline, nil when the model found no object at the box
	}

<a name="Segmenter"></a>
## type Segmenter

Segmenter is implemented by plugins that outline an object inside a crop.

	type Segmenter interface {
	    // ModelSpec declares the expected input dimensions and trigger labels.
	    ModelSpec() ModelSpec
	    // SegmentObjects outlines objects in batch. Each frame is a region around
	    // one object, scaled to ModelSpec().Input, and carries the object's box.
	    // Must return exactly one SegmentationResult per input frame, in the same
	    // order; leave Mask nil when the model found no object at the box.
	    SegmentObjects(frames []SegmentationFrame) ([]SegmentationResult, error)
	}

<a name="SegmenterSensor"></a>
## type SegmenterSensor

SegmenterSensor is a frame\-only sensor that outlines an object inside a crop. Pair with a Segmenter implementation.

Each crop is a region around an object the object detector found, and the object's box inside it says which object is meant. The mask separates the object from its background, but not from a neighbour the detector saw as part of it: two people in one box come back as one outline.

	type SegmenterSensor struct{ BaseSensor }

<a name="NewSegmenterSensor"></a>
### func NewSegmenterSensor

	func NewSegmenterSensor(name string, opts ...SensorOption) *SegmenterSensor

NewSegmenterSensor creates a segmenter sensor with the given name and options.

<a name="SegmenterSensor.GetCategory"></a>
### func \(\*SegmenterSensor\) GetCategory

	func (s *SegmenterSensor) GetCategory() SensorCategory



<a name="SegmenterSensor.GetType"></a>
### func \(\*SegmenterSensor\) GetType

	func (s *SegmenterSensor) GetType() SensorType



<a name="SegmenterSensor.ToJSON"></a>
### func \(\*SegmenterSensor\) ToJSON

	func (s *SegmenterSensor) ToJSON() sensorJSON



<a name="SegmenterSensor.UpdateValue"></a>
### func \(\*SegmenterSensor\) UpdateValue

	func (s *SegmenterSensor) UpdateValue(property string, value any) error

UpdateValue on a read\-only sensor: external writes are ignored.

<a name="Sensor"></a>
## type Sensor

Sensor is the interface all sensors must implement.

State\-modifying methods \(SetOn, ReportDetections, etc.\) live on the concrete sensor types, not on Sensor. Code that holds a Sensor reference can read state and observe changes, plus invoke UpdateValue for cross\-process generic property writes.

	type Sensor interface {
	    // GetID returns the entity id of the sensor, provisional on a new sensor until registration.
	    GetID() string
	    // GetType returns the type of the sensor, fixed per sensor class.
	    GetType() SensorType
	    // GetName returns the name the plugin gave the sensor.
	    GetName() string
	    // GetDisplayName returns the full name shown to the user: inside a device the device name plus
	    // the short name, otherwise the plugin's name until the user renames the sensor.
	    GetDisplayName() string
	    // GetShortName returns the name inside its device, the same as GetDisplayName for a sensor without a device.
	    GetShortName() string
	    // GetDeviceInfo returns the device the sensor belongs to, nil without one and for a camera's own sensor.
	    GetDeviceInfo() *SensorDevice
	    // Primary reports whether the sensor is the main sensor of its device, called like the device when it stands alone.
	    Primary() bool
	    // GetNativeID returns the durable identity the plugin supplied, e.g. an upstream device id.
	    GetNativeID() string
	    // GetPluginID returns the id of the plugin that owns the sensor, set at registration.
	    GetPluginID() string
	    // GetAssignedCameraIDs returns the ids of the cameras the user assigned the sensor to.
	    GetAssignedCameraIDs() []string
	    // Connected reports whether the sensor is registered and its plugin is connected.
	    Connected() bool
	    // GetCapabilities returns the capabilities the sensor advertises.
	    GetCapabilities() []string
	    // AssignmentLocked reports whether the sensor is bound to the camera it was added to, so the user cannot assign it elsewhere.
	    AssignmentLocked() bool
	    // HasCapability reports whether the sensor advertises a capability.
	    HasCapability(cap string) bool
	    // GetValue returns the current value of a sensor property.
	    GetValue(property string) any
	    // GetValues returns a snapshot copy of all property values.
	    GetValues() map[string]any
	    // UpdateValue is the generic property write coming from a consumer. Concrete
	    // sensor types dispatch known properties to semantic methods (SetOn,
	    // SetTargetState) so plugin-side hardware overrides run. Read-only sensors
	    // implement it as a no-op. Plugin authors call the semantic methods instead.
	    UpdateValue(property string, value any) error
	    // OnPropertyChanged fires on every property change.
	    OnPropertyChanged(callback func(SensorPropertyChange)) *Disposable
	    // OnCapabilitiesChanged fires with the full capability list whenever it changes.
	    OnCapabilitiesChanged(callback func([]string)) *Disposable
	    // OnAssignmentChanged fires with the current camera id list whenever the
	    // user changes this sensor's camera assignments.
	    OnAssignmentChanged(callback func([]string)) *Disposable
	    // OnConnectedChanged fires when the owning plugin's connectivity changes.
	    OnConnectedChanged(callback func(bool)) *Disposable
	    // OnDeviceInfoChanged fires with the device whenever the sensor joins or leaves
	    // one, or its device, names or main-sensor role change.
	    OnDeviceInfoChanged(callback func(*SensorDevice)) *Disposable
	    // GetPropertySpecs returns the specs of the properties the plugin narrowed or described,
	    // resolved against the type's. A property without an entry follows its type's spec.
	    GetPropertySpecs() map[string]SensorPropertySpec
	    // OnPropertySpecsChanged fires with the property specs whenever the plugin changes them.
	    OnPropertySpecsChanged(callback func(map[string]SensorPropertySpec)) *Disposable
	}

<a name="SensorCategory"></a>
## type SensorCategory

SensorCategory categorizes a sensor's role in the system. It determines how the backend treats the sensor, read\-only or controllable.

	type SensorCategory string

<a name="SensorCategorySensor"></a>

	const (
	    SensorCategorySensor  SensorCategory = "sensor"  // Read-only detection sensor (motion, object, audio, etc.)
	    SensorCategoryControl SensorCategory = "control" // Controllable sensor with set methods (light, siren, PTZ, etc.)
	    SensorCategoryTrigger SensorCategory = "trigger" // Event trigger (doorbell ring)
	    SensorCategoryInfo    SensorCategory = "info"    // Informational read-only state (battery level)
	)

<a name="SensorDevice"></a>
## type SensorDevice

SensorDevice is the device a sensor belongs to, as consumers see it.

	type SensorDevice struct {
	    // ID is the id of the device in camera.ui, not the plugin's DeviceInfo.ID.
	    ID  string `msgpack:"id" json:"id"`
	    // Name is the name shown to the user, the source's name until the user renames the device.
	    Name string `msgpack:"name" json:"name"`
	    // Manufacturer is the manufacturer label (optional).
	    Manufacturer string `msgpack:"manufacturer,omitempty" json:"manufacturer,omitempty"`
	    // Model is the model label (optional).
	    Model string `msgpack:"model,omitempty" json:"model,omitempty"`
	    // Firmware is the firmware version (optional).
	    Firmware string `msgpack:"firmware,omitempty" json:"firmware,omitempty"`
	    // SerialNumber is the serial number (optional).
	    SerialNumber string `msgpack:"serialNumber,omitempty" json:"serialNumber,omitempty"`
	}

<a name="SensorOption"></a>
## type SensorOption

SensorOption configures a sensor at construction time.

	type SensorOption func(*sensorOptions)

<a name="WithAddress"></a>
### func WithAddress

	func WithAddress(address string) SensorOption

WithAddress sets the sensor's current address at the source, e.g. a Home Assistant entity id. Display only, may change over time; identity is the native id.

<a name="WithDevice"></a>
### func WithDevice

	func WithDevice(device *DeviceInfo) SensorOption

WithDevice sets the device the sensor belongs to. Sensors of the plugin that report the same DeviceInfo.ID form one device.

<a name="WithNativeID"></a>
### func WithNativeID

	func WithNativeID(nativeID string) SensorOption

WithNativeID sets the plugin\-supplied durable identity \(e.g. an upstream device id\). The host reconciles the sensor across restarts by \(pluginId, nativeId\); without it, identity falls back to \(type, name\) and a rename creates a new sensor.

<a name="WithOrigin"></a>
### func WithOrigin

	func WithOrigin(origin string) SensorOption

WithOrigin marks the source system the sensor was imported from \(e.g. "homeassistant"\). Export bridges targeting that system skip the sensor.

<a name="WithPrimary"></a>
### func WithPrimary

	func WithPrimary() SensorOption

WithPrimary marks the sensor as the main sensor of its device, called like the device when it stands alone.

<a name="WithPropertySpec"></a>
### func WithPropertySpec

	func WithPropertySpec(property string, spec *PropertySpecOverride) SensorOption

WithPropertySpec sets what the device accepts for one property, see BaseSensor.SetPropertySpec.

<a name="SensorPropertyChange"></a>
## type SensorPropertyChange

SensorPropertyChange is emitted when a sensor property value changes.

	type SensorPropertyChange struct {
	    // Property is the property name.
	    Property string
	    // Value is the new property value.
	    Value any
	    // Timestamp is when the value was set (Unix ms).
	    Timestamp int64
	}

<a name="SensorPropertyChoice"></a>
## type SensorPropertyChoice

SensorPropertyChoice is a value a device offers for a property, such as a chime tone or a TV input.

	type SensorPropertyChoice struct {
	    // Value is the value written to the property.
	    Value any `msgpack:"value" json:"value"`
	    // Label is the name of the value at the device, shown as it comes.
	    Label string `msgpack:"label" json:"label"`
	}

<a name="SensorPropertySpec"></a>
## type SensorPropertySpec

SensorPropertySpec describes the values of one property: the type it carries, its enum values or numeric range, and whether it is a command or an internal detail.

	type SensorPropertySpec struct {
	    // Type is the runtime type of the value.
	    Type SensorPropertyValueType `msgpack:"type" json:"type"`
	    // Values maps the value names of an enum property to their wire values. Names double as i18n key stems.
	    Values map[string]any `msgpack:"values,omitempty" json:"values,omitempty"`
	    // Keys lists the scalar member keys of an object property, exposed as value-path variables.
	    Keys []string `msgpack:"keys,omitempty" json:"keys,omitempty"`
	    // Min is the lowest accepted value of a numeric property.
	    Min *float64 `msgpack:"min,omitempty" json:"min,omitempty"`
	    // Max is the highest accepted value of a numeric property.
	    Max *float64 `msgpack:"max,omitempty" json:"max,omitempty"`
	    // Step is the accepted increment of a numeric property, commands are rounded to it.
	    Step *float64 `msgpack:"step,omitempty" json:"step,omitempty"`
	    // Unit is the display unit of the value, e.g. % or °C.
	    Unit string `msgpack:"unit,omitempty" json:"unit,omitempty"`
	    // Choices lists the values the device offers with their names at the device, for a property without a fixed enum.
	    Choices []SensorPropertyChoice `msgpack:"choices,omitempty" json:"choices,omitempty"`
	    // MaxLength is the longest accepted text of a string property.
	    MaxLength *int `msgpack:"maxLength,omitempty" json:"maxLength,omitempty"`
	    // Writable reports whether the property accepts external writes (commands, target states, virtual sensor state).
	    Writable bool `msgpack:"writable,omitempty" json:"writable,omitempty"`
	    // Internal reports that the property is no observable state, hidden from trigger and condition pickers.
	    Internal bool `msgpack:"internal,omitempty" json:"internal,omitempty"`
	}

<a name="SensorPropertyValueType"></a>
## type SensorPropertyValueType

SensorPropertyValueType is the runtime type of a sensor property: boolean, number, string, enum or object.

	type SensorPropertyValueType string

<a name="SensorPropertyValueTypeBoolean"></a>

	const (
	    SensorPropertyValueTypeBoolean SensorPropertyValueType = "boolean"
	    SensorPropertyValueTypeNumber  SensorPropertyValueType = "number"
	    SensorPropertyValueTypeString  SensorPropertyValueType = "string"
	    SensorPropertyValueTypeEnum    SensorPropertyValueType = "enum"
	    SensorPropertyValueTypeObject  SensorPropertyValueType = "object"
	)

<a name="SensorSourceState"></a>
## type SensorSourceState

SensorSourceState is the plugin's view of the source behind an adopted sensor. Unavailable means wait \(source unreachable, entity temporarily unavailable\), Removed means the source reported the entity gone while it was reachable. Neither deletes the sensor: an adopted sensor is deleted by the user only.

	type SensorSourceState string

<a name="SensorSourceStateConnected"></a>

	const (
	    SensorSourceStateConnected   SensorSourceState = "connected"
	    SensorSourceStateUnavailable SensorSourceState = "unavailable"
	    SensorSourceStateRemoved     SensorSourceState = "removed"
	)

<a name="SensorTriggerSettings"></a>
## type SensorTriggerSettings

SensorTriggerSettings is the sensor trigger settings \(contact, doorbell, switch, light, etc.\).

	type SensorTriggerSettings struct {
	    // Timeout is the sensor trigger timeout in seconds.
	    Timeout int `msgpack:"timeout" json:"timeout"`
	    // Triggers are sensor entity ids that also trigger the detection cascade (in addition to motion/audio).
	    Triggers []string `msgpack:"triggers" json:"triggers"`
	}

<a name="SensorType"></a>
## type SensorType

SensorType identifies the kind of sensor. "Sensor" is camera.ui's umbrella term for the smallest smart\-home unit. It covers measuring devices and controllable ones alike.

	type SensorType string

<a name="SensorTypeMotion"></a>

	const (
	    SensorTypeMotion         SensorType = "motion"         // Video-based motion detection
	    SensorTypeObject         SensorType = "object"         // Object detection (person, vehicle, animal, etc.)
	    SensorTypeAudio          SensorType = "audio"          // Audio event detection (glass break, scream, etc.)
	    SensorTypeFace           SensorType = "face"           // Face detection and recognition
	    SensorTypeFaceEmbedder   SensorType = "faceEmbedder"   // Face embedding generation from a face crop, for recognition against enrolled faces
	    SensorTypePersonEmbedder SensorType = "personEmbedder" // Appearance embedding of a person crop, to find the same person again without a face
	    SensorTypeSegmenter      SensorType = "segmenter"      // Outline of an object inside a crop, as a mask over its box
	    SensorTypeLicensePlate   SensorType = "licensePlate"   // License plate detection and OCR
	    SensorTypeClassifier     SensorType = "classifier"     // General-purpose image classifier
	    SensorTypeClip           SensorType = "clip"           // CLIP embedding generation for semantic search
	    SensorTypeObjectAssist   SensorType = "objectAssist"   // Locates objects in a frame so secondary detectors get real crops from camera-side detections
	    SensorTypeContact        SensorType = "contact"        // Contact/open-close sensor (door, window)
	    SensorTypeLight          SensorType = "light"          // Light on/off and brightness control
	    SensorTypeSiren          SensorType = "siren"          // Siren on/off and volume control
	    SensorTypeSwitch         SensorType = "switch"         // Generic on/off switch
	    SensorTypeOutlet         SensorType = "outlet"         // Power outlet or smart plug
	    SensorTypeLock           SensorType = "lock"           // Lock/unlock control
	    SensorTypePTZ            SensorType = "ptz"            // Pan-tilt-zoom camera control
	    SensorTypeSecuritySystem SensorType = "securitySystem" // Security system arm/disarm control
	    SensorTypeDoorbell       SensorType = "doorbell"       // Doorbell ring trigger
	    SensorTypeButton         SensorType = "button"         // Button with single, double and long presses
	    SensorTypeAccess         SensorType = "access"         // Access reader, such as a fingerprint or NFC reader
	    SensorTypeTemperature    SensorType = "temperature"    // Temperature sensor (°C)
	    SensorTypeHumidity       SensorType = "humidity"       // Humidity sensor (0-100%)
	    SensorTypeOccupancy      SensorType = "occupancy"      // Occupancy sensor, whether someone is in a room
	    SensorTypeSmoke          SensorType = "smoke"          // Smoke detector
	    SensorTypeLeak           SensorType = "leak"           // Water leak detector
	    SensorTypeGas            SensorType = "gas"            // Gas detector
	    SensorTypeCarbonMonoxide SensorType = "carbonMonoxide" // Carbon monoxide detector
	    SensorTypeHeat           SensorType = "heat"           // Heat alarm
	    SensorTypeCold           SensorType = "cold"           // Cold alarm
	    SensorTypeVibration      SensorType = "vibration"      // Vibration sensor
	    SensorTypeTamper         SensorType = "tamper"         // Tamper sensor
	    SensorTypeProblem        SensorType = "problem"        // Generic problem/fault sensor
	    SensorTypePower          SensorType = "power"          // Power detection sensor
	    SensorTypeIlluminance    SensorType = "illuminance"    // Illuminance sensor (lx)
	    SensorTypeCarbonDioxide  SensorType = "carbonDioxide"  // Carbon dioxide sensor (ppm)
	    SensorTypeGlassBreak     SensorType = "glassBreak"     // Glass break detector
	    SensorTypeAirQuality     SensorType = "airQuality"     // Air quality level with particle and gas readings
	    SensorTypePresence       SensorType = "presence"       // Whether a person is at home
	    SensorTypeGarage         SensorType = "garage"         // Garage door opener
	    SensorTypeCover          SensorType = "cover"          // Blind, shutter, awning, curtain or other cover
	    SensorTypeThermostat     SensorType = "thermostat"     // Thermostat or air conditioner
	    SensorTypeFan            SensorType = "fan"            // Ceiling, desk or other fan
	    SensorTypeValve          SensorType = "valve"          // Water or gas valve, or an irrigation zone
	    SensorTypeScene          SensorType = "scene"          // Scene or script that runs on command
	    SensorTypeHumidifier     SensorType = "humidifier"     // Humidifier or dehumidifier
	    SensorTypeAirPurifier    SensorType = "airPurifier"    // Air purifier
	    SensorTypeWaterHeater    SensorType = "waterHeater"    // Water heater or boiler
	    SensorTypeVacuum         SensorType = "vacuum"         // Robot vacuum
	    SensorTypeLawnMower      SensorType = "lawnMower"      // Robot lawn mower
	    SensorTypeMediaPlayer    SensorType = "mediaPlayer"    // TV, speaker, receiver or projector
	    SensorTypeChime          SensorType = "chime"          // Chime that plays tones
	    SensorTypeDisplay        SensorType = "display"        // Text display on a device
	    SensorTypeBattery        SensorType = "battery"        // Battery level and charging state
	)

<a name="SirenControl"></a>
## type SirenControl

SirenControl is a siren on/off and volume control sensor. Override SetActive / SetInactive \(by embedding SirenControl in your own type and shadowing the methods\) to drive your hardware, then call the embedded SirenControl's methods to sync the SDK state. For hardware\-pushed updates, call the embedded methods directly from your event handler. That bypasses any plugin override and only syncs state.

	type SirenControl struct{ BaseSensor }

<a name="NewSirenControl"></a>
### func NewSirenControl

	func NewSirenControl(name string, opts ...SensorOption) *SirenControl

NewSirenControl creates a siren control with the given name and options.

<a name="SirenControl.GetCategory"></a>
### func \(\*SirenControl\) GetCategory

	func (s *SirenControl) GetCategory() SensorCategory



<a name="SirenControl.GetType"></a>
### func \(\*SirenControl\) GetType

	func (s *SirenControl) GetType() SensorType



<a name="SirenControl.GetVolume"></a>
### func \(\*SirenControl\) GetVolume

	func (s *SirenControl) GetVolume() int

GetVolume returns the volume level \(0\-100\).

<a name="SirenControl.IsActive"></a>
### func \(\*SirenControl\) IsActive

	func (s *SirenControl) IsActive() bool

IsActive reports whether the siren is currently active.

<a name="SirenControl.SetActive"></a>
### func \(\*SirenControl\) SetActive

	func (s *SirenControl) SetActive()

SetActive activates the siren.

Example:

	siren.SetActive()
	

<a name="SirenControl.SetInactive"></a>
### func \(\*SirenControl\) SetInactive

	func (s *SirenControl) SetInactive()

SetInactive deactivates the siren.

Example:

	siren.SetInactive()
	

<a name="SirenControl.SetVolume"></a>
### func \(\*SirenControl\) SetVolume

	func (s *SirenControl) SetVolume(value int)

SetVolume sets the siren volume \(clamped to \[0,100\]\).

Example:

	siren.SetVolume(80)
	

<a name="SirenControl.ToJSON"></a>
### func \(\*SirenControl\) ToJSON

	func (s *SirenControl) ToJSON() sensorJSON



<a name="SirenControl.UpdateValue"></a>
### func \(\*SirenControl\) UpdateValue

	func (s *SirenControl) UpdateValue(property string, value any) error

UpdateValue routes generic property writes to the semantic setters.

<a name="SirenProperty"></a>
## type SirenProperty

SirenProperty is a property name of a siren control.

	type SirenProperty = string

<a name="SirenPropertyActive"></a>Property names of a siren control.

	const (
	    SirenPropertyActive SirenProperty = "active" // Whether the siren is currently active
	    SirenPropertyVolume SirenProperty = "volume" // Volume level (0-100)
	)

<a name="SmokeProperty"></a>
## type SmokeProperty

SmokeProperty is a property name of a smoke sensor.

	type SmokeProperty = string

<a name="SmokePropertyDetected"></a>Property names of a smoke sensor.

	const (
	    SmokePropertyDetected SmokeProperty = "detected" // Whether smoke is detected
	)

<a name="SmokeSensor"></a>
## type SmokeSensor

SmokeSensor reports smoke detection state.

	type SmokeSensor struct{ BinarySensor }

<a name="NewSmokeSensor"></a>
### func NewSmokeSensor

	func NewSmokeSensor(name string, opts ...SensorOption) *SmokeSensor

NewSmokeSensor creates a smoke sensor with the given name and options.

<a name="SwitchControl"></a>
## type SwitchControl

SwitchControl is a generic on/off switch control sensor. Override SetOn / SetOff \(by embedding SwitchControl in your own type and shadowing the methods\) to drive hardware, then call the embedded SwitchControl's methods to sync the SDK state. For hardware\-pushed updates, call the embedded methods directly from your event handler. That bypasses any plugin override and only syncs state.

	type SwitchControl struct{ BaseSensor }

<a name="NewSwitchControl"></a>
### func NewSwitchControl

	func NewSwitchControl(name string, opts ...SensorOption) *SwitchControl

NewSwitchControl creates a switch control with the given name and options.

<a name="SwitchControl.GetCategory"></a>
### func \(\*SwitchControl\) GetCategory

	func (s *SwitchControl) GetCategory() SensorCategory



<a name="SwitchControl.GetType"></a>
### func \(\*SwitchControl\) GetType

	func (s *SwitchControl) GetType() SensorType



<a name="SwitchControl.IsOn"></a>
### func \(\*SwitchControl\) IsOn

	func (s *SwitchControl) IsOn() bool

IsOn reports whether the switch is on.

<a name="SwitchControl.SetOff"></a>
### func \(\*SwitchControl\) SetOff

	func (s *SwitchControl) SetOff()

SetOff turns the switch off.

Example:

	sw.SetOff()
	

<a name="SwitchControl.SetOn"></a>
### func \(\*SwitchControl\) SetOn

	func (s *SwitchControl) SetOn()

SetOn turns the switch on.

Example:

	sw.SetOn()
	

<a name="SwitchControl.ToJSON"></a>
### func \(\*SwitchControl\) ToJSON

	func (s *SwitchControl) ToJSON() sensorJSON



<a name="SwitchControl.UpdateValue"></a>
### func \(\*SwitchControl\) UpdateValue

	func (s *SwitchControl) UpdateValue(property string, value any) error

UpdateValue routes generic property writes to the semantic setters.

<a name="SwitchProperty"></a>
## type SwitchProperty

SwitchProperty is a property name of a switch control.

	type SwitchProperty = string

<a name="SwitchPropertyOn"></a>Property names of a switch control.

	const (
	    SwitchPropertyOn SwitchProperty = "on" // Whether the switch is on
	)

<a name="TamperProperty"></a>
## type TamperProperty

TamperProperty is a property name of a tamper sensor.

	type TamperProperty = string

<a name="TamperPropertyDetected"></a>Property names of a tamper sensor.

	const (
	    TamperPropertyDetected TamperProperty = "detected" // Whether tampering is detected
	)

<a name="TamperSensor"></a>
## type TamperSensor

TamperSensor reports tampering detection state.

	type TamperSensor struct{ BinarySensor }

<a name="NewTamperSensor"></a>
### func NewTamperSensor

	func NewTamperSensor(name string, opts ...SensorOption) *TamperSensor

NewTamperSensor creates a tamper sensor with the given name and options.

<a name="TemperatureInfo"></a>
## type TemperatureInfo

TemperatureInfo reports the current temperature in degrees Celsius.

	type TemperatureInfo struct{ MeasurementInfo }

<a name="NewTemperatureInfo"></a>
### func NewTemperatureInfo

	func NewTemperatureInfo(name string, opts ...SensorOption) *TemperatureInfo

NewTemperatureInfo creates a temperature info sensor with the given name and options.

<a name="TemperatureProperty"></a>
## type TemperatureProperty

TemperatureProperty is a property name of a temperature sensor.

	type TemperatureProperty = string

<a name="TemperaturePropertyCurrent"></a>Property names of a temperature sensor.

	const (
	    TemperaturePropertyCurrent TemperatureProperty = "current" // Current temperature in degrees Celsius
	)

<a name="ThermostatAction"></a>
## type ThermostatAction

ThermostatAction is what a thermostat does right now.

	type ThermostatAction = string

<a name="ThermostatActionOff"></a>Actions of a thermostat.

	const (
	    ThermostatActionOff        ThermostatAction = "off"
	    ThermostatActionIdle       ThermostatAction = "idle"
	    ThermostatActionHeating    ThermostatAction = "heating"
	    ThermostatActionCooling    ThermostatAction = "cooling"
	    ThermostatActionDrying     ThermostatAction = "drying"
	    ThermostatActionFan        ThermostatAction = "fan"
	    ThermostatActionPreheating ThermostatAction = "preheating"
	    ThermostatActionDefrosting ThermostatAction = "defrosting"
	)

<a name="ThermostatControl"></a>
## type ThermostatControl

ThermostatControl is a thermostat or air conditioner. Temperatures are in °C, a plugin converts from the device's unit. Override SetTargetTemperature, SetMode and the other commands \(by embedding ThermostatControl in your own type and shadowing the methods\) to drive hardware, then call the embedded ThermostatControl's methods to sync the SDK state. Report readings with SetCurrentTemperature, SetAction and SetCurrentHumidity.

Narrow the modes to those the device has with SetPropertySpec\(ThermostatPropertyMode, &PropertySpecOverride\{Values: ...\}\), and its temperature range with Min, Max and Step on the target properties. Presets and fan modes are the device's own, set them as Choices.

	type ThermostatControl struct{ BaseSensor }

<a name="NewThermostatControl"></a>
### func NewThermostatControl

	func NewThermostatControl(name string, opts ...SensorOption) *ThermostatControl

NewThermostatControl creates a thermostat with the given name and options.

<a name="ThermostatControl.GetAction"></a>
### func \(\*ThermostatControl\) GetAction

	func (s *ThermostatControl) GetAction() ThermostatAction

GetAction returns what the thermostat does right now, empty before the first report.

<a name="ThermostatControl.GetCategory"></a>
### func \(\*ThermostatControl\) GetCategory

	func (s *ThermostatControl) GetCategory() SensorCategory



<a name="ThermostatControl.GetCurrentHumidity"></a>
### func \(\*ThermostatControl\) GetCurrentHumidity

	func (s *ThermostatControl) GetCurrentHumidity() (float64, bool)

GetCurrentHumidity returns the current humidity in percent, false before the first reading.

<a name="ThermostatControl.GetCurrentTemperature"></a>
### func \(\*ThermostatControl\) GetCurrentTemperature

	func (s *ThermostatControl) GetCurrentTemperature() (float64, bool)

GetCurrentTemperature returns the current temperature in °C, false before the first reading.

<a name="ThermostatControl.GetFanMode"></a>
### func \(\*ThermostatControl\) GetFanMode

	func (s *ThermostatControl) GetFanMode() string

GetFanMode returns the active fan mode.

<a name="ThermostatControl.GetMode"></a>
### func \(\*ThermostatControl\) GetMode

	func (s *ThermostatControl) GetMode() ThermostatMode

GetMode returns the mode.

<a name="ThermostatControl.GetPreset"></a>
### func \(\*ThermostatControl\) GetPreset

	func (s *ThermostatControl) GetPreset() string

GetPreset returns the active preset.

<a name="ThermostatControl.GetTargetHumidity"></a>
### func \(\*ThermostatControl\) GetTargetHumidity

	func (s *ThermostatControl) GetTargetHumidity() int

GetTargetHumidity returns the target humidity in percent.

<a name="ThermostatControl.GetTargetTemperature"></a>
### func \(\*ThermostatControl\) GetTargetTemperature

	func (s *ThermostatControl) GetTargetTemperature() float64

GetTargetTemperature returns the target temperature in °C.

<a name="ThermostatControl.GetTargetTemperatureHigh"></a>
### func \(\*ThermostatControl\) GetTargetTemperatureHigh

	func (s *ThermostatControl) GetTargetTemperatureHigh() float64

GetTargetTemperatureHigh returns the upper end of the target range in °C.

<a name="ThermostatControl.GetTargetTemperatureLow"></a>
### func \(\*ThermostatControl\) GetTargetTemperatureLow

	func (s *ThermostatControl) GetTargetTemperatureLow() float64

GetTargetTemperatureLow returns the lower end of the target range in °C.

<a name="ThermostatControl.GetType"></a>
### func \(\*ThermostatControl\) GetType

	func (s *ThermostatControl) GetType() SensorType



<a name="ThermostatControl.SetAction"></a>
### func \(\*ThermostatControl\) SetAction

	func (s *ThermostatControl) SetAction(value ThermostatAction)

SetAction reports what the thermostat does right now.

Example:

	thermostat.SetAction(ThermostatActionHeating)
	

<a name="ThermostatControl.SetCurrentHumidity"></a>
### func \(\*ThermostatControl\) SetCurrentHumidity

	func (s *ThermostatControl) SetCurrentHumidity(value float64)

SetCurrentHumidity reports the current humidity in percent.

Example:

	thermostat.SetCurrentHumidity(45)
	

<a name="ThermostatControl.SetCurrentTemperature"></a>
### func \(\*ThermostatControl\) SetCurrentTemperature

	func (s *ThermostatControl) SetCurrentTemperature(value float64)

SetCurrentTemperature reports the current temperature in °C.

Example:

	thermostat.SetCurrentTemperature(20.4)
	

<a name="ThermostatControl.SetFanMode"></a>
### func \(\*ThermostatControl\) SetFanMode

	func (s *ThermostatControl) SetFanMode(value string)

SetFanMode sets the fan mode, one of the fan mode choices.

Example:

	thermostat.SetFanMode("low")
	

<a name="ThermostatControl.SetMode"></a>
### func \(\*ThermostatControl\) SetMode

	func (s *ThermostatControl) SetMode(value ThermostatMode)

SetMode sets the mode.

Example:

	thermostat.SetMode(ThermostatModeHeat)
	

<a name="ThermostatControl.SetPreset"></a>
### func \(\*ThermostatControl\) SetPreset

	func (s *ThermostatControl) SetPreset(value string)

SetPreset sets the preset, one of the preset choices.

Example:

	thermostat.SetPreset("eco")
	

<a name="ThermostatControl.SetTargetHumidity"></a>
### func \(\*ThermostatControl\) SetTargetHumidity

	func (s *ThermostatControl) SetTargetHumidity(value int)

SetTargetHumidity sets the target humidity in percent.

Example:

	thermostat.SetTargetHumidity(45)
	

<a name="ThermostatControl.SetTargetTemperature"></a>
### func \(\*ThermostatControl\) SetTargetTemperature

	func (s *ThermostatControl) SetTargetTemperature(value float64)

SetTargetTemperature sets the target temperature in °C.

Example:

	thermostat.SetTargetTemperature(21.5)
	

<a name="ThermostatControl.SetTargetTemperatureHigh"></a>
### func \(\*ThermostatControl\) SetTargetTemperatureHigh

	func (s *ThermostatControl) SetTargetTemperatureHigh(value float64)

SetTargetTemperatureHigh sets the upper end of the target range in °C.

Example:

	thermostat.SetTargetTemperatureHigh(24)
	

<a name="ThermostatControl.SetTargetTemperatureLow"></a>
### func \(\*ThermostatControl\) SetTargetTemperatureLow

	func (s *ThermostatControl) SetTargetTemperatureLow(value float64)

SetTargetTemperatureLow sets the lower end of the target range in °C.

Example:

	thermostat.SetTargetTemperatureLow(19)
	

<a name="ThermostatControl.ToJSON"></a>
### func \(\*ThermostatControl\) ToJSON

	func (s *ThermostatControl) ToJSON() sensorJSON



<a name="ThermostatControl.UpdateValue"></a>
### func \(\*ThermostatControl\) UpdateValue

	func (s *ThermostatControl) UpdateValue(property string, value any) error

UpdateValue routes generic property writes to the semantic setters.

<a name="ThermostatMode"></a>
## type ThermostatMode

ThermostatMode is what a thermostat is set to do.

	type ThermostatMode = string

<a name="ThermostatModeOff"></a>Modes of a thermostat.

	const (
	    ThermostatModeOff      ThermostatMode = "off"
	    ThermostatModeHeat     ThermostatMode = "heat"
	    ThermostatModeCool     ThermostatMode = "cool"
	    ThermostatModeHeatCool ThermostatMode = "heat_cool" // Heats and cools to stay inside a target range
	    ThermostatModeAuto     ThermostatMode = "auto"      // The device decides by its own schedule or logic
	    ThermostatModeDry      ThermostatMode = "dry"
	    ThermostatModeFanOnly  ThermostatMode = "fan_only"
	)

<a name="ThermostatProperty"></a>
## type ThermostatProperty

ThermostatProperty is a property name of a thermostat. Temperatures are in °C.

	type ThermostatProperty = string

<a name="ThermostatPropertyCurrentTemperature"></a>Property names of a thermostat.

	const (
	    ThermostatPropertyCurrentTemperature    ThermostatProperty = "currentTemperature"    // Current temperature
	    ThermostatPropertyTargetTemperature     ThermostatProperty = "targetTemperature"     // Temperature the thermostat heats or cools to
	    ThermostatPropertyTargetTemperatureLow  ThermostatProperty = "targetTemperatureLow"  // Lower end of the target range
	    ThermostatPropertyTargetTemperatureHigh ThermostatProperty = "targetTemperatureHigh" // Upper end of the target range
	    ThermostatPropertyMode                  ThermostatProperty = "mode"                  // Mode, a ThermostatMode
	    ThermostatPropertyAction                ThermostatProperty = "action"                // What the thermostat does right now, a ThermostatAction
	    ThermostatPropertyCurrentHumidity       ThermostatProperty = "currentHumidity"       // Current humidity in percent
	    ThermostatPropertyPreset                ThermostatProperty = "preset"                // Active preset, one of the choices the device offers
	    ThermostatPropertyFanMode               ThermostatProperty = "fanMode"               // Active fan mode, one of the choices the device offers
	    ThermostatPropertyTargetHumidity        ThermostatProperty = "targetHumidity"        // Humidity in percent the thermostat keeps
	)

<a name="TrackVelocity"></a>
## type TrackVelocity

TrackVelocity is the signed centroid velocity in normalized units per second. Prefer it over deriving velocity from frame\-to\-frame position deltas.

	type TrackVelocity struct {
	    // X is the horizontal velocity, positive moves right.
	    X   float64 `msgpack:"x" json:"x"`
	    // Y is the vertical velocity, positive moves down.
	    Y   float64 `msgpack:"y" json:"y"`
	}

<a name="TrackedDetection"></a>
## type TrackedDetection

TrackedDetection extends Detection with tracking metadata \(stable IDs, velocity\). Tracking fields are omitempty: plugins return plain Detection and the server\-side tracker fills these in.

	type TrackedDetection struct {
	    Detection
	    TrackId         *int           `msgpack:"trackId,omitempty" json:"trackId,omitempty"`                 // Stable sequential ID for this object across frames
	    TrackAge        *int           `msgpack:"trackAge,omitempty" json:"trackAge,omitempty"`               // Number of frames this object has been continuously tracked
	    TrackSpeed      *float64       `msgpack:"trackSpeed,omitempty" json:"trackSpeed,omitempty"`           // Velocity magnitude in normalized units per second
	    TrackVelocity   *TrackVelocity `msgpack:"trackVelocity,omitempty" json:"trackVelocity,omitempty"`     // Signed centroid velocity in normalized units per second
	    TrackLost       *bool          `msgpack:"trackLost,omitempty" json:"trackLost,omitempty"`             // True if the object was not matched in the current frame
	    StationarySince *float64       `msgpack:"stationarySince,omitempty" json:"stationarySince,omitempty"` // Epoch ms since the object has been still; only present while it is settled
	}

<a name="VacuumActivity"></a>
## type VacuumActivity

VacuumActivity is what a vacuum does right now.

	type VacuumActivity = string

<a name="VacuumActivityCleaning"></a>Activities of a vacuum.

	const (
	    VacuumActivityCleaning  VacuumActivity = "cleaning"
	    VacuumActivityDocked    VacuumActivity = "docked"
	    VacuumActivityIdle      VacuumActivity = "idle"
	    VacuumActivityPaused    VacuumActivity = "paused"
	    VacuumActivityReturning VacuumActivity = "returning"
	    VacuumActivityError     VacuumActivity = "error"
	)

<a name="VacuumCommand"></a>
## type VacuumCommand

VacuumCommand is a command a vacuum takes.

	type VacuumCommand = string

<a name="VacuumCommandStart"></a>Commands a vacuum takes.

	const (
	    VacuumCommandStart  VacuumCommand = "start"
	    VacuumCommandPause  VacuumCommand = "pause"
	    VacuumCommandStop   VacuumCommand = "stop"
	    VacuumCommandDock   VacuumCommand = "dock"
	    VacuumCommandLocate VacuumCommand = "locate"
	    VacuumCommandSpot   VacuumCommand = "spot"
	)

<a name="VacuumControl"></a>
## type VacuumControl

VacuumControl is a robot vacuum. Override Start, Pause, Stop, Dock, Locate, Spot and SetFanSpeed \(by embedding VacuumControl in your own type and shadowing the methods\) to drive hardware, then call the embedded VacuumControl's methods after success. Report what the vacuum does with SetActivity.

Narrow the commands to those the vacuum takes with SetPropertySpec\(VacuumPropertyCommand, &PropertySpecOverride\{Values: ...\}\). The suction levels come as choices with the fanSpeed capability: SetPropertySpec\(VacuumPropertyFanSpeed, &PropertySpecOverride\{Choices: ...\}\).

	type VacuumControl struct{ RobotControl }

<a name="NewVacuumControl"></a>
### func NewVacuumControl

	func NewVacuumControl(name string, opts ...SensorOption) *VacuumControl

NewVacuumControl creates a vacuum with the given name and options.

<a name="VacuumControl.Dock"></a>
### func \(\*VacuumControl\) Dock

	func (s *VacuumControl) Dock()

Dock sends the vacuum back to its dock.

Example:

	vacuum.Dock()
	

<a name="VacuumControl.GetFanSpeed"></a>
### func \(\*VacuumControl\) GetFanSpeed

	func (s *VacuumControl) GetFanSpeed() string

GetFanSpeed returns the suction level.

<a name="VacuumControl.Locate"></a>
### func \(\*VacuumControl\) Locate

	func (s *VacuumControl) Locate()

Locate makes the vacuum beep so it can be found.

Example:

	vacuum.Locate()
	

<a name="VacuumControl.Pause"></a>
### func \(\*VacuumControl\) Pause

	func (s *VacuumControl) Pause()

Pause pauses cleaning where the vacuum is.

Example:

	vacuum.Pause()
	

<a name="VacuumControl.SetFanSpeed"></a>
### func \(\*VacuumControl\) SetFanSpeed

	func (s *VacuumControl) SetFanSpeed(value string)

SetFanSpeed sets the suction level, one of the suction level choices.

Example:

	vacuum.SetFanSpeed("turbo")
	

<a name="VacuumControl.Spot"></a>
### func \(\*VacuumControl\) Spot

	func (s *VacuumControl) Spot()

Spot cleans the spot around the vacuum.

Example:

	vacuum.Spot()
	

<a name="VacuumControl.Start"></a>
### func \(\*VacuumControl\) Start

	func (s *VacuumControl) Start()

Start starts or resumes cleaning.

Example:

	vacuum.Start()
	

<a name="VacuumControl.Stop"></a>
### func \(\*VacuumControl\) Stop

	func (s *VacuumControl) Stop()

Stop stops cleaning.

Example:

	vacuum.Stop()
	

<a name="VacuumControl.UpdateValue"></a>
### func \(\*VacuumControl\) UpdateValue

	func (s *VacuumControl) UpdateValue(property string, value any) error

UpdateValue routes generic property writes to the semantic setters.

<a name="VacuumProperty"></a>
## type VacuumProperty

VacuumProperty is a property name of a vacuum.

	type VacuumProperty = string

<a name="VacuumPropertyActivity"></a>Property names of a vacuum.

	const (
	    VacuumPropertyActivity VacuumProperty = "activity" // What the vacuum does right now, a VacuumActivity
	    VacuumPropertyCommand  VacuumProperty = "command"  // One-off VacuumCommand when written, empty again right after
	    VacuumPropertyFanSpeed VacuumProperty = "fanSpeed" // Suction level, one of the choices the plugin sets
	)

<a name="ValveConfig"></a>
## type ValveConfig

ValveConfig describes a valve at construction.

	type ValveConfig struct {
	    // Index is the position of the valve on its device, from 1, e.g. the zone of an irrigation controller.
	    Index int
	}

<a name="ValveControl"></a>
## type ValveControl

ValveControl is a water or gas valve, or an irrigation zone. Override SetTargetState, SetTargetPosition and SetDuration \(by embedding ValveControl in your own type and shadowing the methods\) to drive hardware, then call the embedded ValveControl's methods to sync the SDK state. Report what the hardware does with SetCurrentState, SetCurrentPosition and SetRemaining.

A valve that opens part way adds ValveCapabilityPosition, one that closes by itself after a set time ValveCapabilityDuration. SetKind says what the valve controls, ValveConfig.Index orders the zones of one irrigation controller.

	type ValveControl struct{ BaseSensor }

<a name="NewValveControl"></a>
### func NewValveControl

	func NewValveControl(name string, config ValveConfig, opts ...SensorOption) *ValveControl

NewValveControl creates a valve with the given name, config and options.

<a name="ValveControl.GetCategory"></a>
### func \(\*ValveControl\) GetCategory

	func (s *ValveControl) GetCategory() SensorCategory



<a name="ValveControl.GetCurrentPosition"></a>
### func \(\*ValveControl\) GetCurrentPosition

	func (s *ValveControl) GetCurrentPosition() int

GetCurrentPosition returns the current position, 0 \(closed\) to 100 \(open\).

<a name="ValveControl.GetCurrentState"></a>
### func \(\*ValveControl\) GetCurrentState

	func (s *ValveControl) GetCurrentState() ValveState

GetCurrentState returns the current state.

<a name="ValveControl.GetDuration"></a>
### func \(\*ValveControl\) GetDuration

	func (s *ValveControl) GetDuration() int

GetDuration returns the seconds the valve stays open before it closes by itself.

<a name="ValveControl.GetIndex"></a>
### func \(\*ValveControl\) GetIndex

	func (s *ValveControl) GetIndex() int

GetIndex returns the position of the valve on its device, 0 when not set.

<a name="ValveControl.GetKind"></a>
### func \(\*ValveControl\) GetKind

	func (s *ValveControl) GetKind() ValveKind

GetKind returns what the valve controls, empty when the plugin did not say.

<a name="ValveControl.GetRemaining"></a>
### func \(\*ValveControl\) GetRemaining

	func (s *ValveControl) GetRemaining() int

GetRemaining returns the seconds left until the open valve closes by itself.

<a name="ValveControl.GetTargetPosition"></a>
### func \(\*ValveControl\) GetTargetPosition

	func (s *ValveControl) GetTargetPosition() int

GetTargetPosition returns the target position, 0 \(closed\) to 100 \(open\).

<a name="ValveControl.GetTargetState"></a>
### func \(\*ValveControl\) GetTargetState

	func (s *ValveControl) GetTargetState() ValveState

GetTargetState returns the target state.

<a name="ValveControl.GetType"></a>
### func \(\*ValveControl\) GetType

	func (s *ValveControl) GetType() SensorType



<a name="ValveControl.SetCurrentPosition"></a>
### func \(\*ValveControl\) SetCurrentPosition

	func (s *ValveControl) SetCurrentPosition(position int)

SetCurrentPosition reports the position of the valve, 0 \(closed\) to 100 \(open\).

Example:

	valve.SetCurrentPosition(30)
	

<a name="ValveControl.SetCurrentState"></a>
### func \(\*ValveControl\) SetCurrentState

	func (s *ValveControl) SetCurrentState(value ValveState)

SetCurrentState reports the state of the valve.

Example:

	valve.SetCurrentState(ValveStateOpening)
	

<a name="ValveControl.SetDuration"></a>
### func \(\*ValveControl\) SetDuration

	func (s *ValveControl) SetDuration(seconds int)

SetDuration sets how long the valve stays open, in seconds until it closes by itself.

Example:

	valve.SetDuration(900)
	

<a name="ValveControl.SetKind"></a>
### func \(\*ValveControl\) SetKind

	func (s *ValveControl) SetKind(kind ValveKind)

SetKind says what the valve controls. Smart homes show it by its kind, and Home Assistant takes it as the device class.

Example:

	valve.SetKind(ValveKindGas)
	

<a name="ValveControl.SetRemaining"></a>
### func \(\*ValveControl\) SetRemaining

	func (s *ValveControl) SetRemaining(seconds int)

SetRemaining reports how long the open valve has left, in seconds until it closes by itself, 0 when closed.

Example:

	valve.SetRemaining(420)
	

<a name="ValveControl.SetTargetPosition"></a>
### func \(\*ValveControl\) SetTargetPosition

	func (s *ValveControl) SetTargetPosition(position int)

SetTargetPosition opens the valve to a position, 0 \(closed\) to 100 \(open\). Writes both targetPosition and currentPosition.

Example:

	valve.SetTargetPosition(50)
	

<a name="ValveControl.SetTargetState"></a>
### func \(\*ValveControl\) SetTargetState

	func (s *ValveControl) SetTargetState(value ValveState)

SetTargetState opens or closes the valve. Writes both targetState and currentState.

Example:

	valve.SetTargetState(ValveStateOpen)
	

<a name="ValveControl.ToJSON"></a>
### func \(\*ValveControl\) ToJSON

	func (s *ValveControl) ToJSON() sensorJSON



<a name="ValveControl.UpdateValue"></a>
### func \(\*ValveControl\) UpdateValue

	func (s *ValveControl) UpdateValue(property string, value any) error

UpdateValue routes generic property writes to the semantic setters.

<a name="ValveKind"></a>
## type ValveKind

ValveKind says what a valve controls, it decides how smart homes show it.

	type ValveKind = string

<a name="ValveKindWater"></a>Kinds of a valve.

	const (
	    ValveKindWater      ValveKind = "water"
	    ValveKindGas        ValveKind = "gas"
	    ValveKindIrrigation ValveKind = "irrigation"
	)

<a name="ValveProperty"></a>
## type ValveProperty

ValveProperty is a property name of a valve.

	type ValveProperty = string

<a name="ValvePropertyCurrentState"></a>Property names of a valve.

	const (
	    ValvePropertyCurrentState    ValveProperty = "currentState"    // Current state, a ValveState
	    ValvePropertyTargetState     ValveProperty = "targetState"     // Target state, Open or Closed
	    ValvePropertyCurrentPosition ValveProperty = "currentPosition" // Current position, 0 (closed) to 100 (open)
	    ValvePropertyTargetPosition  ValveProperty = "targetPosition"  // Target position, 0 (closed) to 100 (open)
	    ValvePropertyDuration        ValveProperty = "duration"        // Seconds the valve stays open before it closes by itself
	    ValvePropertyRemaining       ValveProperty = "remaining"       // Seconds left until the open valve closes by itself
	    ValvePropertyKind            ValveProperty = "kind"            // What the valve controls, a ValveKind
	    ValvePropertyIndex           ValveProperty = "index"           // Position of the valve on its device, from 1
	)

<a name="ValveState"></a>
## type ValveState

ValveState is the state of a valve. A target takes Open and Closed.

	type ValveState int

<a name="ValveStateOpen"></a>

	const (
	    ValveStateOpen    ValveState = 0
	    ValveStateClosed  ValveState = 1
	    ValveStateOpening ValveState = 2
	    ValveStateClosing ValveState = 3
	)

<a name="VibrationProperty"></a>
## type VibrationProperty

VibrationProperty is a property name of a vibration sensor.

	type VibrationProperty = string

<a name="VibrationPropertyDetected"></a>Property names of a vibration sensor.

	const (
	    VibrationPropertyDetected VibrationProperty = "detected" // Whether vibration is detected
	)

<a name="VibrationSensor"></a>
## type VibrationSensor

VibrationSensor reports vibration detection state.

	type VibrationSensor struct{ BinarySensor }

<a name="NewVibrationSensor"></a>
### func NewVibrationSensor

	func NewVibrationSensor(name string, opts ...SensorOption) *VibrationSensor

NewVibrationSensor creates a vibration sensor with the given name and options.

<a name="VideoInputSpec"></a>
## type VideoInputSpec

VideoInputSpec describes the expected video input dimensions and pixel format for a detector model.

	type VideoInputSpec struct {
	    Width  int         `msgpack:"width" json:"width"`   // Expected frame width in pixels
	    Height int         `msgpack:"height" json:"height"` // Expected frame height in pixels
	    Format FrameFormat `msgpack:"format" json:"format"` // Pixel format: rgb = 3 bytes/pixel, gray = 1 byte/pixel, nv12 = YUV semi-planar
	}

<a name="WaterHeaterControl"></a>
## type WaterHeaterControl

WaterHeaterControl is a water heater or boiler that keeps its water at a target temperature. Override SetMode, SetTargetTemperature and SetAway \(by embedding WaterHeaterControl in your own type and shadowing the methods\) to drive hardware, then call the embedded WaterHeaterControl's methods to sync the SDK state. Report the water temperature with SetCurrentTemperature.

Narrow the modes to those the device has with SetPropertySpec\(WaterHeaterPropertyMode, &PropertySpecOverride\{Values: ...\}\), and its temperature range with Min, Max and Step on the target temperature. Temperatures are always in °C.

	type WaterHeaterControl struct{ BaseSensor }

<a name="NewWaterHeaterControl"></a>
### func NewWaterHeaterControl

	func NewWaterHeaterControl(name string, opts ...SensorOption) *WaterHeaterControl

NewWaterHeaterControl creates a water heater with the given name and options.

<a name="WaterHeaterControl.GetCategory"></a>
### func \(\*WaterHeaterControl\) GetCategory

	func (s *WaterHeaterControl) GetCategory() SensorCategory



<a name="WaterHeaterControl.GetCurrentTemperature"></a>
### func \(\*WaterHeaterControl\) GetCurrentTemperature

	func (s *WaterHeaterControl) GetCurrentTemperature() (float64, bool)

GetCurrentTemperature returns the current water temperature in °C, false before the first reading.

<a name="WaterHeaterControl.GetMode"></a>
### func \(\*WaterHeaterControl\) GetMode

	func (s *WaterHeaterControl) GetMode() WaterHeaterMode

GetMode returns the operating mode.

<a name="WaterHeaterControl.GetTargetTemperature"></a>
### func \(\*WaterHeaterControl\) GetTargetTemperature

	func (s *WaterHeaterControl) GetTargetTemperature() float64

GetTargetTemperature returns the target water temperature in °C.

<a name="WaterHeaterControl.GetType"></a>
### func \(\*WaterHeaterControl\) GetType

	func (s *WaterHeaterControl) GetType() SensorType



<a name="WaterHeaterControl.IsAway"></a>
### func \(\*WaterHeaterControl\) IsAway

	func (s *WaterHeaterControl) IsAway() bool

IsAway reports true while the away mode is on.

<a name="WaterHeaterControl.SetAway"></a>
### func \(\*WaterHeaterControl\) SetAway

	func (s *WaterHeaterControl) SetAway(away bool)

SetAway switches the away mode on, or off with false.

Example:

	boiler.SetAway(true)
	

<a name="WaterHeaterControl.SetCurrentTemperature"></a>
### func \(\*WaterHeaterControl\) SetCurrentTemperature

	func (s *WaterHeaterControl) SetCurrentTemperature(value float64)

SetCurrentTemperature reports the current water temperature in °C.

Example:

	boiler.SetCurrentTemperature(48.5)
	

<a name="WaterHeaterControl.SetMode"></a>
### func \(\*WaterHeaterControl\) SetMode

	func (s *WaterHeaterControl) SetMode(value WaterHeaterMode)

SetMode sets the operating mode, one of the modes the water heater offers.

Example:

	boiler.SetMode(WaterHeaterModeEco)
	

<a name="WaterHeaterControl.SetTargetTemperature"></a>
### func \(\*WaterHeaterControl\) SetTargetTemperature

	func (s *WaterHeaterControl) SetTargetTemperature(value float64)

SetTargetTemperature sets the target temperature in °C.

Example:

	boiler.SetTargetTemperature(55)
	

<a name="WaterHeaterControl.ToJSON"></a>
### func \(\*WaterHeaterControl\) ToJSON

	func (s *WaterHeaterControl) ToJSON() sensorJSON



<a name="WaterHeaterControl.UpdateValue"></a>
### func \(\*WaterHeaterControl\) UpdateValue

	func (s *WaterHeaterControl) UpdateValue(property string, value any) error

UpdateValue routes generic property writes to the semantic setters.

<a name="WaterHeaterMode"></a>
## type WaterHeaterMode

WaterHeaterMode is the operating mode of a water heater.

	type WaterHeaterMode = string

<a name="WaterHeaterModeOff"></a>Modes of a water heater.

	const (
	    WaterHeaterModeOff         WaterHeaterMode = "off"
	    WaterHeaterModeEco         WaterHeaterMode = "eco"
	    WaterHeaterModeElectric    WaterHeaterMode = "electric"
	    WaterHeaterModeGas         WaterHeaterMode = "gas"
	    WaterHeaterModeHeatPump    WaterHeaterMode = "heat_pump"
	    WaterHeaterModeHighDemand  WaterHeaterMode = "high_demand"
	    WaterHeaterModePerformance WaterHeaterMode = "performance"
	    WaterHeaterModeAuto        WaterHeaterMode = "auto" // The device decides by its own schedule or logic
	    WaterHeaterModeHeat        WaterHeaterMode = "heat"
	    WaterHeaterModeOn          WaterHeaterMode = "on" // Running in a mode without a name of its own
	)

<a name="WaterHeaterProperty"></a>
## type WaterHeaterProperty

WaterHeaterProperty is a property name of a water heater.

	type WaterHeaterProperty = string

<a name="WaterHeaterPropertyCurrentTemperature"></a>Property names of a water heater.

	const (
	    WaterHeaterPropertyCurrentTemperature WaterHeaterProperty = "currentTemperature" // Current water temperature in °C
	    WaterHeaterPropertyTargetTemperature  WaterHeaterProperty = "targetTemperature"  // Target water temperature in °C
	    WaterHeaterPropertyMode               WaterHeaterProperty = "mode"               // Operating mode, a WaterHeaterMode, a command when written
	    WaterHeaterPropertyAway               WaterHeaterProperty = "away"               // True while the away mode is on
	)
