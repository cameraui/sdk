package sdk

import (
	"math"
	"reflect"
	"testing"
	"time"
)

type shadowVacuum struct {
	*VacuumControl
	docked int
}

func (s *shadowVacuum) Dock() error {
	s.docked++
	return s.VacuumControl.Dock()
}

func fireCommandReset(s *CommandControl) {
	s.mu.Lock()
	s.commandResetTimer.Reset(0)
	s.mu.Unlock()
	for deadline := time.Now().Add(2 * time.Second); s.GetValue(commandPropertyCommand) != "" && time.Now().Before(deadline); {
		time.Sleep(time.Millisecond)
	}
}

func TestButtonOffersOnlyItsPresses(t *testing.T) {
	button := NewButtonTrigger("Remote", ButtonConfig{Index: 2, Presses: []ButtonPress{ButtonPressLong, ButtonPressSingle}})
	defer button.cleanup()

	if got := button.ToJSON().PropertySpecs[ButtonPropertyPress].Values; !reflect.DeepEqual(got, []any{"single", "long"}) {
		t.Fatalf("press values = %v", got)
	}
	if err := button.Press(ButtonPressDouble); err == nil {
		t.Fatal("a double press was accepted")
	}
	if err := button.Press(ButtonPressLong); err != nil || button.GetPress() != ButtonPressLong || button.GetIndex() != 2 {
		t.Fatalf("press = %q, index = %d, err = %v", button.GetPress(), button.GetIndex(), err)
	}
}

func TestAirQualityLevelFollowsTheReadings(t *testing.T) {
	sensor := NewAirQualityInfo("Air")
	sensor.SetCapabilities([]string{AirQualityCapabilityAqi, AirQualityCapabilityPm25})
	sensor.SetReading(AirQualityPropertyPm25, 80)
	sensor.SetReading(AirQualityPropertyAqi, 42)
	if sensor.GetLevel() != AirQualityLevelExcellent {
		t.Fatalf("level with index = %q", sensor.GetLevel())
	}

	sensor.SetCapabilities([]string{AirQualityCapabilityPm25})
	sensor.SetReading(AirQualityPropertyPm25, 35.5)
	if sensor.GetLevel() != AirQualityLevelFair {
		t.Fatalf("level from pm2.5 = %q", sensor.GetLevel())
	}

	sensor.SetLevel(AirQualityLevelInferior)
	sensor.SetReading(AirQualityPropertyPm25, 2)
	sensor.SetReading(AirQualityPropertyPm10, math.NaN())
	if sensor.GetLevel() != AirQualityLevelInferior || sensor.GetReading(AirQualityPropertyPm10) != 0 {
		t.Fatalf("level = %q, pm10 = %v", sensor.GetLevel(), sensor.GetReading(AirQualityPropertyPm10))
	}
}

func TestRobotRunsTheWrittenCommandAndReadsEmptyAgain(t *testing.T) {
	vacuum := &shadowVacuum{VacuumControl: NewVacuumControl("Vacuum")}
	if err := vacuum.setOuter(vacuum); err != nil {
		t.Fatal(err)
	}
	defer vacuum.cleanup()

	for range 2 {
		if err := vacuum.UpdateValue(VacuumPropertyCommand, VacuumCommandDock); err != nil {
			t.Fatal(err)
		}
	}
	if vacuum.docked != 2 || vacuum.GetValue(VacuumPropertyCommand) != VacuumCommandDock {
		t.Fatalf("docked = %d, command = %v", vacuum.docked, vacuum.GetValue(VacuumPropertyCommand))
	}

	fireCommandReset(&vacuum.CommandControl)
	if got := vacuum.GetValue(VacuumPropertyCommand); got != "" {
		t.Fatalf("command after the reset = %v", got)
	}
}

func TestRobotKeepsTheActivityAndTheFanSpeed(t *testing.T) {
	vacuum := NewVacuumControl("Vacuum")
	defer vacuum.cleanup()

	if vacuum.GetActivity() != "" || vacuum.GetType() != SensorTypeVacuum || vacuum.GetCategory() != SensorCategoryControl {
		t.Fatalf("activity = %q, type = %q, category = %q", vacuum.GetActivity(), vacuum.GetType(), vacuum.GetCategory())
	}
	if err := vacuum.UpdateValue(VacuumPropertyFanSpeed, "turbo"); err != nil {
		t.Fatal(err)
	}
	vacuum.SetActivity(VacuumActivityCleaning)
	if vacuum.GetActivity() != VacuumActivityCleaning || vacuum.GetFanSpeed() != "turbo" {
		t.Fatalf("activity = %q, fan speed = %q", vacuum.GetActivity(), vacuum.GetFanSpeed())
	}

	mower := NewLawnMowerControl("Mower")
	defer mower.cleanup()
	if err := mower.UpdateValue(LawnMowerPropertyCommand, LawnMowerCommandStart); err != nil {
		t.Fatal(err)
	}
	if got := mower.GetValue(LawnMowerPropertyCommand); got != LawnMowerCommandStart || mower.GetType() != SensorTypeLawnMower {
		t.Fatalf("command = %v, type = %q", got, mower.GetType())
	}
}

func TestMediaPlayerTakesCommandsPowerAndSoundAndReadsOnFromTheState(t *testing.T) {
	player := NewMediaPlayerControl("Media Player")
	defer player.cleanup()

	if err := player.UpdateValue(MediaPlayerPropertyCommand, MediaPlayerCommandNext); err != nil {
		t.Fatal(err)
	}
	if got := player.GetValue(MediaPlayerPropertyCommand); got != MediaPlayerCommandNext {
		t.Fatalf("command = %v", got)
	}
	fireCommandReset(&player.CommandControl)
	if got := player.GetValue(MediaPlayerPropertyCommand); got != "" {
		t.Fatalf("command after the reset = %v", got)
	}

	for _, write := range []struct {
		property string
		value    any
	}{{MediaPlayerPropertyOn, true}, {MediaPlayerPropertyVolume, 130}, {MediaPlayerPropertyMuted, true}} {
		if err := player.UpdateValue(write.property, write.value); err != nil {
			t.Fatal(err)
		}
	}
	if volume, _ := player.GetVolume(); !player.IsOn() || volume != 100 || !player.IsMuted() {
		t.Fatalf("on = %v, volume = %d, muted = %v", player.IsOn(), volume, player.IsMuted())
	}

	player.SetState(MediaPlayerStateOff)
	if player.IsOn() {
		t.Fatal("on after the off state")
	}
	player.SetState(MediaPlayerStatePlaying)
	player.SetNowPlaying("So What", "Miles Davis")
	if !player.IsOn() || player.GetTitle() != "So What" || player.GetArtist() != "Miles Davis" {
		t.Fatalf("on = %v, title = %q, artist = %q", player.IsOn(), player.GetTitle(), player.GetArtist())
	}
}

func TestMediaPlayerNarrowsTheKindToTheOneItIs(t *testing.T) {
	player := NewMediaPlayerControl("Media Player")
	defer player.cleanup()

	player.SetKind(MediaPlayerKindTv)
	if got := player.ToJSON().PropertySpecs[MediaPlayerPropertyKind].Values; player.GetKind() != MediaPlayerKindTv || !reflect.DeepEqual(got, []any{MediaPlayerKindTv}) {
		t.Fatalf("kind = %q, kind values = %v", player.GetKind(), got)
	}
	if player.GetType() != SensorTypeMediaPlayer || player.GetCategory() != SensorCategoryControl {
		t.Fatalf("type = %q, category = %q", player.GetType(), player.GetCategory())
	}
}
