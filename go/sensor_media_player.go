package sdk

import "math"

// MediaPlayerState is what a media player does right now.
type MediaPlayerState = string

// States of a media player.
const (
	MediaPlayerStateOff       MediaPlayerState = "off"       // Player is off or in standby
	MediaPlayerStateOn        MediaPlayerState = "on"        // On, without telling what it does
	MediaPlayerStateIdle      MediaPlayerState = "idle"      // Player is on and plays nothing
	MediaPlayerStatePlaying   MediaPlayerState = "playing"   // Player is playing
	MediaPlayerStatePaused    MediaPlayerState = "paused"    // Playback is paused
	MediaPlayerStateBuffering MediaPlayerState = "buffering" // Player is loading and about to play
)

// MediaPlayerKind is what kind of device a media player is.
type MediaPlayerKind = string

// Kinds of a media player.
const (
	MediaPlayerKindTv        MediaPlayerKind = "tv"        // A TV
	MediaPlayerKindSpeaker   MediaPlayerKind = "speaker"   // A speaker
	MediaPlayerKindReceiver  MediaPlayerKind = "receiver"  // An AV receiver
	MediaPlayerKindProjector MediaPlayerKind = "projector" // A projector
)

// MediaPlayerCommand is a command a media player takes.
type MediaPlayerCommand = string

// Commands a media player takes.
const (
	MediaPlayerCommandPlay     MediaPlayerCommand = "play"     // Start or resume playback
	MediaPlayerCommandPause    MediaPlayerCommand = "pause"    // Pause playback
	MediaPlayerCommandStop     MediaPlayerCommand = "stop"     // Stop playback
	MediaPlayerCommandNext     MediaPlayerCommand = "next"     // Skip to the next track or channel
	MediaPlayerCommandPrevious MediaPlayerCommand = "previous" // Go back to the previous track or channel
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
	SetOn() error
	SetOff() error
	Play() error
	Pause() error
	Stop() error
	Next() error
	Previous() error
	SetVolume(volume float64) error
	SetMuted(muted bool) error
	SetSource(value string) error
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
//
// When the device refuses a command, return an error from the override instead of
// calling the embedded method: the write fails for whoever sent it and the state
// stays as it was.
type MediaPlayerControl struct{ CommandControl }

// NewMediaPlayerControl creates a media player with the given name and options.
func NewMediaPlayerControl(name string, opts ...SensorOption) *MediaPlayerControl {
	s := &MediaPlayerControl{}
	s.initCommand(SensorTypeMediaPlayer, name, opts)
	s.writeState(map[string]any{
		MediaPlayerPropertyOn:    false,
		MediaPlayerPropertyMuted: false,
	})
	s.handleWrites(s)
	return s
}

// IsOn reports whether the player is on, writable with the power capability.
func (s *MediaPlayerControl) IsOn() bool {
	v, _ := s.GetValue(MediaPlayerPropertyOn).(bool)
	return v
}

// GetState returns what the player does right now, a MediaPlayerState, empty before the first report.
func (s *MediaPlayerControl) GetState() MediaPlayerState {
	v, _ := s.GetValue(MediaPlayerPropertyState).(string)
	return v
}

// GetKind returns what kind of device it is, a MediaPlayerKind, empty when the plugin did not say.
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

// GetSource returns the selected input or app, one of the choices the plugin sets.
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
func (s *MediaPlayerControl) SetOn() error {
	s.writeState(map[string]any{MediaPlayerPropertyOn: true})
	return nil
}

// SetOff turns the player off.
//
// Example:
//
//	player.SetOff()
func (s *MediaPlayerControl) SetOff() error {
	s.writeState(map[string]any{MediaPlayerPropertyOn: false})
	return nil
}

// Play starts or resumes playback.
//
// Example:
//
//	player.Play()
func (s *MediaPlayerControl) Play() error {
	s.sent(MediaPlayerCommandPlay)
	return nil
}

// Pause pauses playback.
//
// Example:
//
//	player.Pause()
func (s *MediaPlayerControl) Pause() error {
	s.sent(MediaPlayerCommandPause)
	return nil
}

// Stop stops playback.
//
// Example:
//
//	player.Stop()
func (s *MediaPlayerControl) Stop() error {
	s.sent(MediaPlayerCommandStop)
	return nil
}

// Next skips to the next track or channel.
//
// Example:
//
//	player.Next()
func (s *MediaPlayerControl) Next() error {
	s.sent(MediaPlayerCommandNext)
	return nil
}

// Previous goes back to the previous track or channel.
//
// Example:
//
//	player.Previous()
func (s *MediaPlayerControl) Previous() error {
	s.sent(MediaPlayerCommandPrevious)
	return nil
}

// SetVolume sets the volume, 0 to 100, clamped and rounded.
//
// Example:
//
//	player.SetVolume(30)
func (s *MediaPlayerControl) SetVolume(volume float64) error {
	if math.IsNaN(volume) || math.IsInf(volume, 0) {
		return nil
	}
	s.writeState(map[string]any{MediaPlayerPropertyVolume: int(math.Round(max(0, min(100, volume))))})
	return nil
}

// SetMuted mutes the sound, or unmutes it with false.
//
// Example:
//
//	player.SetMuted(true)
func (s *MediaPlayerControl) SetMuted(muted bool) error {
	s.writeState(map[string]any{MediaPlayerPropertyMuted: muted})
	return nil
}

// SetSource switches to another input or app, one of the source choices.
//
// Example:
//
//	player.SetSource("hdmi1")
func (s *MediaPlayerControl) SetSource(value string) error {
	s.writeState(map[string]any{MediaPlayerPropertySource: value})
	return nil
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

func (s *MediaPlayerControl) isCommand(property string) bool {
	return property == MediaPlayerPropertyCommand
}

func (s *MediaPlayerControl) applyValue(property string, value any) error {
	setters := outerOr[mediaPlayerSetters](&s.BaseSensor, s)
	switch property {
	case MediaPlayerPropertyOn:
		if isTruthy(value) {
			if err := setters.SetOn(); err != nil {
				return err
			}
		} else {
			if err := setters.SetOff(); err != nil {
				return err
			}
		}
	case MediaPlayerPropertyVolume:
		if v, ok := toFloat64(value); ok {
			if err := setters.SetVolume(v); err != nil {
				return err
			}
		}
	case MediaPlayerPropertyMuted:
		if err := setters.SetMuted(isTruthy(value)); err != nil {
			return err
		}
	case MediaPlayerPropertySource:
		if v, ok := value.(string); ok {
			if err := setters.SetSource(v); err != nil {
				return err
			}
		}
	case MediaPlayerPropertyCommand:
		switch value {
		case MediaPlayerCommandPlay:
			if err := setters.Play(); err != nil {
				return err
			}
		case MediaPlayerCommandPause:
			if err := setters.Pause(); err != nil {
				return err
			}
		case MediaPlayerCommandStop:
			if err := setters.Stop(); err != nil {
				return err
			}
		case MediaPlayerCommandNext:
			if err := setters.Next(); err != nil {
				return err
			}
		case MediaPlayerCommandPrevious:
			if err := setters.Previous(); err != nil {
				return err
			}
		}
	}
	return nil
}
