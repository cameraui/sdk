# Types

Shared utility types: the `Logger` interface every plugin and camera exposes, the unit system and its conversions (`UnitSystem`, `ToUnitSystem`, `FromUnitSystem`), and pointer-helper functions (`Bool`, `Int`, `Float64`) used by JSON schemas with optional numeric / boolean fields.

!!! note
    The reference below is auto-generated from Go doc comments via [`gomarkdoc`](https://github.com/princjef/gomarkdoc). Re-run `scripts/gen-api-docs.sh` to refresh it.

## Constants

<a name="AirPurifierCapabilityState"></a>Optional capabilities of an air purifier.

	const (
	    AirPurifierCapabilityState     = "state"     // Purifier reports whether it is purifying or idle while it is on
	    AirPurifierCapabilitySpeed     = "speed"     // Purifier runs at a set speed
	    AirPurifierCapabilityAuto      = "auto"      // Purifier has an automatic mode
	    AirPurifierCapabilityPreset    = "preset"    // Purifier offers presets such as sleep or turbo
	    AirPurifierCapabilityChildLock = "childLock" // Purifier locks its buttons against children
	    AirPurifierCapabilityFilter    = "filter"    // Purifier reports the state of its filter
	)

<a name="AirQualityCapabilityAqi"></a>Readings an air quality sensor can offer besides its overall level.

	const (
	    AirQualityCapabilityAqi  = "aqi"  // Air quality index
	    AirQualityCapabilityPm25 = "pm25" // Fine particles up to 2.5 μm
	    AirQualityCapabilityPm10 = "pm10" // Particles up to 10 μm
	    AirQualityCapabilityVoc  = "voc"  // Volatile organic compounds
	    AirQualityCapabilityNo2  = "no2"  // Nitrogen dioxide
	)

<a name="BatteryCapabilityLowBattery"></a>Optional capabilities of a battery info sensor.

	const (
	    BatteryCapabilityLowBattery = "lowBattery" // Sensor reports low-battery alerts
	    BatteryCapabilityCharging   = "charging"   // Sensor reports charging state
	)

<a name="ChimeCapabilityVolume"></a>Optional capabilities of a chime.

	const (
	    ChimeCapabilityVolume = "volume" // Chime supports volume adjustment (0-100)
	    ChimeCapabilityRepeat = "repeat" // Chime can play its tone several times in a row
	)

<a name="CoverCapabilityPosition"></a>Optional capabilities of a cover.

	const (
	    CoverCapabilityPosition = "position" // Cover moves to a position between closed and open
	    CoverCapabilityTilt     = "tilt"     // Cover tilts its slats
	    CoverCapabilityStop     = "stop"     // Cover stops while it moves
	)

<a name="DisplayCapabilityPresets"></a>Optional capabilities of a display.

	const (
	    DisplayCapabilityPresets  = "presets"  // Display offers preset messages, listed as choices of DisplayPropertyPreset
	    DisplayCapabilityDuration = "duration" // Display shows a message for a set time
	)

<a name="FanCapabilitySpeed"></a>Optional capabilities of a fan.

	const (
	    FanCapabilitySpeed       = "speed"       // Fan runs at a speed between 0 and 100 percent
	    FanCapabilityDirection   = "direction"   // Fan turns forward or in reverse
	    FanCapabilityOscillation = "oscillation" // Fan swings from side to side
	    FanCapabilityPreset      = "preset"      // Fan has presets, such as sleep or breeze
	)

<a name="HumidifierCapabilityHumidity"></a>Optional capabilities of a humidifier.

	const (
	    HumidifierCapabilityHumidity = "humidity" // Humidifier reports the humidity it measures
	    HumidifierCapabilityAction   = "action"   // Humidifier reports whether it is working or idle
	    HumidifierCapabilityMode     = "mode"     // Humidifier offers modes such as eco or sleep
	)

<a name="LightCapabilityBrightness"></a>Optional capabilities of a light control.

	const (
	    LightCapabilityBrightness       = "brightness"       // Light supports brightness adjustment (0-100)
	    LightCapabilityColorTemperature = "colorTemperature" // Light supports a white color temperature, in Kelvin
	    LightCapabilityColor            = "color"            // Light supports a color, as hue and saturation
	)

<a name="MediaPlayerCapabilityPower"></a>Optional capabilities of a media player.

	const (
	    MediaPlayerCapabilityPower      = "power"      // Player turns on and off
	    MediaPlayerCapabilityVolume     = "volume"     // Player sets its volume
	    MediaPlayerCapabilityMute       = "mute"       // Player mutes
	    MediaPlayerCapabilitySource     = "source"     // Player switches between inputs or apps
	    MediaPlayerCapabilityNowPlaying = "nowPlaying" // Player reports the title and artist it plays
	)

<a name="ThermostatCapabilityRange"></a>Optional capabilities of a thermostat.

	const (
	    ThermostatCapabilityRange          = "range"          // Thermostat keeps the temperature inside a range, in heat_cool mode
	    ThermostatCapabilityAction         = "action"         // Thermostat reports what it does right now
	    ThermostatCapabilityHumidity       = "humidity"       // Thermostat reports the humidity
	    ThermostatCapabilityPreset         = "preset"         // Thermostat has presets, such as eco or away
	    ThermostatCapabilityFanMode        = "fanMode"        // Thermostat has fan modes
	    ThermostatCapabilityTargetHumidity = "targetHumidity" // Thermostat keeps the humidity at a target
	)

<a name="ValveCapabilityPosition"></a>Optional capabilities of a valve.

	const (
	    ValveCapabilityPosition = "position" // Valve opens to a position between closed and open
	    ValveCapabilityDuration = "duration" // Valve closes by itself after a set time
	)

<a name="OutletCapabilityInUse"></a>Optional capabilities of an outlet.

	const (
	    OutletCapabilityInUse = "inUse" // Outlet reports whether the device plugged into it draws power
	)

<a name="ProtocolLevel"></a>ProtocolLevel is the compatibility level of the plugin surface: the plugin\-facing API and the plugin wire protocol. Bumped only on breaking changes, never for additive features. The CLI stamps the level a plugin was built against into its bundle \(\`cameraui.protocolLevel\` in the bundle package.json\); the server compares that stamp with its own level and refuses to start plugins outside its supported range.

	const ProtocolLevel = 2

<a name="SirenCapabilityVolume"></a>Optional capabilities of a siren control.

	const (
	    SirenCapabilityVolume = "volume" // Siren supports volume adjustment (0-100)
	)

<a name="VacuumCapabilityFanSpeed"></a>Optional capabilities of a vacuum.

	const (
	    VacuumCapabilityFanSpeed = "fanSpeed" // Vacuum cleans with a choice of suction levels
	)

<a name="WaterHeaterCapabilityAway"></a>Optional capabilities of a water heater.

	const (
	    WaterHeaterCapabilityAway = "away" // Water heater has an away mode that saves energy while nobody is home
	)

## Variables

<a name="BaseAudioLabels"></a>BaseAudioLabels lists the built\-in audio label types recognized across the system.

	var BaseAudioLabels = []string{
	    "doorbell", "glass_break", "siren", "speaking",
	    "gunshot", "dog_bark", "baby_cry", "alarm",
	    "scream", "cat", "car_alarm", "smoke_alarm",
	}

<a name="DetectionAttributes"></a>DetectionAttributes lists the built\-in detection attribute types.

	var DetectionAttributes = []string{"face", "license_plate"}

<a name="DetectionLabels"></a>DetectionLabels lists the built\-in detection label types recognized across the system.

	var DetectionLabels = append(append([]string{"motion"}, ObjectDetectionLabels...), "audio")

<a name="ErrNoValue"></a>ErrNoValue is returned by FirstValueFrom when the source completes before it emits a value.

	var ErrNoValue = errors.New("observable completed without emitting a value")

<a name="EventTriggerTypes"></a>EventTriggerTypes lists every event trigger type.

	var EventTriggerTypes = []EventTriggerType{
	    EventTriggerMotion, EventTriggerAudio, EventTriggerContact, EventTriggerDoorbell,
	    EventTriggerSwitch, EventTriggerLight, EventTriggerSiren, EventTriggerSecuritySystem,
	    EventTriggerLineCrossing, EventTriggerOccupancy, EventTriggerSmoke, EventTriggerLeak,
	    EventTriggerGas, EventTriggerCarbonMonoxide, EventTriggerHeat, EventTriggerCold,
	    EventTriggerVibration, EventTriggerTamper, EventTriggerProblem, EventTriggerPower,
	    EventTriggerLock, EventTriggerGarage, EventTriggerGlassBreak, EventTriggerAccess,
	    EventTriggerPresence, EventTriggerCover, EventTriggerValve, EventTriggerFan,
	    EventTriggerHumidifier, EventTriggerAirPurifier, EventTriggerThermostat, EventTriggerWaterHeater,
	    EventTriggerVacuum, EventTriggerLawnMower, EventTriggerMediaPlayer, EventTriggerScene,
	    EventTriggerChime, EventTriggerButton, EventTriggerBattery, EventTriggerAirQuality,
	}

<a name="KnownEventTypes"></a>KnownEventTypes is the set of standard event types \(detection labels \+ attributes \+ trigger types\). Used to identify "other" \(classifier\-produced\) types that fall outside this set.

	var KnownEventTypes = func() map[string]struct{} {
	    m := make(map[string]struct{})
	    for _, l := range DetectionLabels {
	        m[l] = struct{}{}
	    }
	    for _, a := range DetectionAttributes {
	        m[a] = struct{}{}
	    }
	    for _, t := range EventTriggerTypes {
	        m[t] = struct{}{}
	    }
	    return m
	}()

<a name="ObjectDetectionLabels"></a>ObjectDetectionLabels lists the object\-detection labels the detector groups its classes into.

	var ObjectDetectionLabels = []string{"person", "vehicle", "animal"}

<a name="Bool"></a>
## func Bool

	func Bool(v bool) *bool

Bool returns a pointer to v, for the optional pointer fields of JsonSchema \(e.g. Store: sdk.Bool\(true\)\).

<a name="Float64"></a>
## func Float64

	func Float64(v float64) *float64

Float64 returns a pointer to v, for the optional pointer fields of JsonSchema \(e.g. Minimum: sdk.Float64\(0.5\)\).

<a name="FromUnitSystem"></a>
## func FromUnitSystem

	func FromUnitSystem(value float64, unit string, system UnitSystem) float64

FromUnitSystem converts a value entered in the shown unit back to the unit it is stored in, rounded to two decimals, the reverse of ToUnitSystem.

Example:

	stored := sdk.FromUnitSystem(70.7, "°C", sdk.UnitSystemImperial) // 21.5

<a name="Int"></a>
## func Int

	func Int(v int) *int

Int returns a pointer to v, for the optional pointer fields of JsonSchema \(e.g. MinLength: sdk.Int\(5\)\).

<a name="ToUnitSystem"></a>
## func ToUnitSystem

	func ToUnitSystem(value float64, unit string, system UnitSystem) (shown float64, shownUnit string)

ToUnitSystem converts a reading to the unit the installation shows for its quantity, such as °C to °F for UnitSystemImperial, rounded to two decimals. A reading already in that unit system, or in a unit without a counterpart, comes back unchanged.

Example:

	system, _ := api.CoreManager.GetUnitSystem()
	value, unit := sdk.ToUnitSystem(21.5, "°C", system) // 70.7, "°F" for imperial

<a name="Logger"></a>
## type Logger

Logger writes structured log entries to stdout, where the host picks them up and routes them to its own sinks. Debug and Trace are dropped unless the matching level is enabled for the plugin.

Accessed via the embedded BasePlugin.Logger from within a plugin.

	type Logger struct {
	    // contains filtered or unexported fields
	}

<a name="Logger.Attention"></a>
### func \(\*Logger\) Attention

	func (l *Logger) Attention(args ...any)

Attention writes a highlighted entry that stands out in the log stream.

<a name="Logger.CreateLogger"></a>
### func \(\*Logger\) CreateLogger

	func (l *Logger) CreateLogger(opts *loggerOptions) *Logger

CreateLogger derives a child logger for a specific target \(camera, sensor\). Prefix, plugin id and the debug/trace levels are inherited.

<a name="Logger.Debug"></a>
### func \(\*Logger\) Debug

	func (l *Logger) Debug(args ...any)

Debug writes a diagnostic entry, dropped unless debug logging is enabled.

<a name="Logger.Error"></a>
### func \(\*Logger\) Error

	func (l *Logger) Error(args ...any)

Error writes an entry for a failure or unexpected condition.

<a name="Logger.Log"></a>
### func \(\*Logger\) Log

	func (l *Logger) Log(args ...any)

Log writes an informational entry. Arguments are formatted and joined with spaces.

Example:

	p.Logger.Log("connected to", host)
	

<a name="Logger.Success"></a>
### func \(\*Logger\) Success

	func (l *Logger) Success(args ...any)

Success writes an entry confirming a completed operation.

<a name="Logger.Trace"></a>
### func \(\*Logger\) Trace

	func (l *Logger) Trace(args ...any)

Trace writes a fine\-grained diagnostic entry, dropped unless trace logging is enabled.

<a name="Logger.Warn"></a>
### func \(\*Logger\) Warn

	func (l *Logger) Warn(args ...any)

Warn writes an entry for a problem that does not stop execution.

<a name="UnitSystem"></a>
## type UnitSystem

UnitSystem is the set of units the admin picked for the installation under Settings, System.

	type UnitSystem string

<a name="UnitSystemMetric"></a>

	const (
	    UnitSystemMetric   UnitSystem = "metric"   // Metric units, such as °C, km and kg
	    UnitSystemImperial UnitSystem = "imperial" // Imperial units as used in the US, such as °F, mi and lb
	)
