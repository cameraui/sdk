package sdk

import "math"

// MediaPlayerState is what a media player does right now.
type MediaPlayerState = string

// States of a media player.
const (
	MediaPlayerStateOff       MediaPlayerState = "off"
	MediaPlayerStateOn        MediaPlayerState = "on" // On, without telling what it does
	MediaPlayerStateIdle      MediaPlayerState = "idle"
	MediaPlayerStatePlaying   MediaPlayerState = "playing"
	MediaPlayerStatePaused    MediaPlayerState = "paused"
	MediaPlayerStateBuffering MediaPlayerState = "buffering"
)

// MediaPlayerKind is what kind of device a media player is.
type MediaPlayerKind = string

// Kinds of a media player.
const (
	MediaPlayerKindTv        MediaPlayerKind = "tv"
	MediaPlayerKindSpeaker   MediaPlayerKind = "speaker"
	MediaPlayerKindReceiver  MediaPlayerKind = "receiver"
	MediaPlayerKindProjector MediaPlayerKind = "projector"
)

// MediaPlayerCommand is a command a media player takes.
type MediaPlayerCommand = string

// Commands a media player takes.
const (
	MediaPlayerCommandPlay     MediaPlayerCommand = "play"
	MediaPlayerCommandPause    MediaPlayerCommand = "pause"
	MediaPlayerCommandStop     MediaPlayerCommand = "stop"
	MediaPlayerCommandNext     MediaPlayerCommand = "next"
	MediaPlayerCommandPrevious MediaPlayerCommand = "previous"
)

// Optional capabilities of a media player.
const (
	MediaPlayerCapabilityPower      = "power"      // Player turns on and off
	MediaPlayerCapabilityVolume     = "volume"     // Player sets its volume
	MediaPlayerCapabilityMute       = "mute"       // Player mutes
	MediaPlayerCapabilitySource     = "source"     // Player switches between inputs or apps
	MediaPlayerCapabilityNowPlaying = "nowPlaying" // Player reports the title and artist it plays
)

// MediaPlayerProperty is a property name of a media player.
type MediaPlayerProperty = string

// Property names of a media player.
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

type mediaPlayerSetters interface {
	SetOn()
	SetOff()
	Play()
	Pause()
	Stop()
	Next()
	Previous()
	SetVolume(volume float64)
	SetMuted(muted bool)
	SetSource(value string)
}

// MediaPlayerControl is a TV, speaker, receiver or projector. Override SetOn,
// SetOff, Play, Pause, Stop, Next, Previous, SetVolume, SetMuted and SetSource
// (by embedding MediaPlayerControl in your own type and shadowing the methods)
// to drive hardware, then call the embedded MediaPlayerControl's methods after
// success. Report what the player does with SetState and what plays with
// SetNowPlaying.
//
// SetKind says what kind of device it is. Narrow the commands to those the
// player takes with
// SetPropertySpec(MediaPlayerPropertyCommand, &PropertySpecOverride{Values: ...}).
// The inputs come as choices with the source capability:
// SetPropertySpec(MediaPlayerPropertySource, &PropertySpecOverride{Choices: ...}).
type MediaPlayerControl struct{ CommandControl }

// NewMediaPlayerControl creates a media player with the given name and options.
func NewMediaPlayerControl(name string, opts ...SensorOption) *MediaPlayerControl {
	s := &MediaPlayerControl{}
	s.initCommand(SensorTypeMediaPlayer, name, opts)
	s.writeState(map[string]any{
		MediaPlayerPropertyOn:    false,
		MediaPlayerPropertyMuted: false,
	})
	return s
}

// IsOn reports whether the player is on.
func (s *MediaPlayerControl) IsOn() bool {
	v, _ := s.GetValue(MediaPlayerPropertyOn).(bool)
	return v
}

// GetState returns what the player does right now, empty before the first report.
func (s *MediaPlayerControl) GetState() MediaPlayerState {
	v, _ := s.GetValue(MediaPlayerPropertyState).(string)
	return v
}

// GetKind returns what kind of device it is, empty when the plugin did not say.
func (s *MediaPlayerControl) GetKind() MediaPlayerKind {
	v, _ := s.GetValue(MediaPlayerPropertyKind).(string)
	return v
}

// GetVolume returns the volume, 0 to 100, false before the first report.
func (s *MediaPlayerControl) GetVolume() (int, bool) {
	v, ok := s.GetValue(MediaPlayerPropertyVolume).(int)
	return v, ok
}

// IsMuted reports whether the sound is muted.
func (s *MediaPlayerControl) IsMuted() bool {
	v, _ := s.GetValue(MediaPlayerPropertyMuted).(bool)
	return v
}

// GetSource returns the selected input or app.
func (s *MediaPlayerControl) GetSource() string {
	v, _ := s.GetValue(MediaPlayerPropertySource).(string)
	return v
}

// GetTitle returns the title of what plays.
func (s *MediaPlayerControl) GetTitle() string {
	v, _ := s.GetValue(MediaPlayerPropertyTitle).(string)
	return v
}

// GetArtist returns the artist of what plays.
func (s *MediaPlayerControl) GetArtist() string {
	v, _ := s.GetValue(MediaPlayerPropertyArtist).(string)
	return v
}

// SetOn turns the player on.
//
// Example:
//
//	player.SetOn()
func (s *MediaPlayerControl) SetOn() {
	s.writeState(map[string]any{MediaPlayerPropertyOn: true})
}

// SetOff turns the player off.
//
// Example:
//
//	player.SetOff()
func (s *MediaPlayerControl) SetOff() {
	s.writeState(map[string]any{MediaPlayerPropertyOn: false})
}

// Play starts or resumes playback.
//
// Example:
//
//	player.Play()
func (s *MediaPlayerControl) Play() {
	s.sent(MediaPlayerCommandPlay)
}

// Pause pauses playback.
//
// Example:
//
//	player.Pause()
func (s *MediaPlayerControl) Pause() {
	s.sent(MediaPlayerCommandPause)
}

// Stop stops playback.
//
// Example:
//
//	player.Stop()
func (s *MediaPlayerControl) Stop() {
	s.sent(MediaPlayerCommandStop)
}

// Next skips to the next track or channel.
//
// Example:
//
//	player.Next()
func (s *MediaPlayerControl) Next() {
	s.sent(MediaPlayerCommandNext)
}

// Previous goes back to the previous track or channel.
//
// Example:
//
//	player.Previous()
func (s *MediaPlayerControl) Previous() {
	s.sent(MediaPlayerCommandPrevious)
}

// SetVolume sets the volume, 0 to 100, clamped and rounded.
//
// Example:
//
//	player.SetVolume(30)
func (s *MediaPlayerControl) SetVolume(volume float64) {
	if math.IsNaN(volume) || math.IsInf(volume, 0) {
		return
	}
	s.writeState(map[string]any{MediaPlayerPropertyVolume: int(math.Round(max(0, min(100, volume))))})
}

// SetMuted mutes the sound, or unmutes it with false.
//
// Example:
//
//	player.SetMuted(true)
func (s *MediaPlayerControl) SetMuted(muted bool) {
	s.writeState(map[string]any{MediaPlayerPropertyMuted: muted})
}

// SetSource switches to another input or app, one of the source choices.
//
// Example:
//
//	player.SetSource("hdmi1")
func (s *MediaPlayerControl) SetSource(value string) {
	s.writeState(map[string]any{MediaPlayerPropertySource: value})
}

// SetState reports what the player does right now: off, on, idle, playing,
// paused or buffering. IsOn follows: everything but off counts as on.
//
// Example:
//
//	player.SetState(MediaPlayerStatePlaying)
func (s *MediaPlayerControl) SetState(value MediaPlayerState) {
	s.writeState(map[string]any{
		MediaPlayerPropertyState: value,
		MediaPlayerPropertyOn:    value != MediaPlayerStateOff,
	})
}

// SetKind says what kind of device the player is. Smart homes show it by its
// kind, and Home Assistant takes it as the device class.
//
// Example:
//
//	player.SetKind(MediaPlayerKindSpeaker)
func (s *MediaPlayerControl) SetKind(kind MediaPlayerKind) {
	s.writeState(map[string]any{MediaPlayerPropertyKind: kind})
	s.SetPropertySpec(MediaPlayerPropertyKind, &PropertySpecOverride{Values: []any{kind}})
}

// SetNowPlaying reports the title and artist of what plays, needs the
// nowPlaying capability. Pass empty strings when nothing plays.
//
// Example:
//
//	player.SetNowPlaying("So What", "Miles Davis")
func (s *MediaPlayerControl) SetNowPlaying(title, artist string) {
	s.writeState(map[string]any{
		MediaPlayerPropertyTitle:  title,
		MediaPlayerPropertyArtist: artist,
	})
}

// UpdateValue routes generic property writes to the semantic setters.
func (s *MediaPlayerControl) UpdateValue(property string, value any) error {
	setters := outerOr[mediaPlayerSetters](&s.BaseSensor, s)
	switch property {
	case MediaPlayerPropertyOn:
		if isTruthy(value) {
			setters.SetOn()
		} else {
			setters.SetOff()
		}
	case MediaPlayerPropertyVolume:
		if v, ok := toFloat64(value); ok {
			setters.SetVolume(v)
		}
	case MediaPlayerPropertyMuted:
		setters.SetMuted(isTruthy(value))
	case MediaPlayerPropertySource:
		if v, ok := value.(string); ok {
			setters.SetSource(v)
		}
	case MediaPlayerPropertyCommand:
		switch value {
		case MediaPlayerCommandPlay:
			setters.Play()
		case MediaPlayerCommandPause:
			setters.Pause()
		case MediaPlayerCommandStop:
			setters.Stop()
		case MediaPlayerCommandNext:
			setters.Next()
		case MediaPlayerCommandPrevious:
			setters.Previous()
		}
	}
	return nil
}
