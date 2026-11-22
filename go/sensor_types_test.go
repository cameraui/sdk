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

func (s *shadowVacuum) Dock() {
	s.docked++
	s.VacuumControl.Dock()
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
	vacuum.setOuter(vacuum)
	defer vacuum.cleanup()

	for range 2 {
		if err := vacuum.UpdateValue(VacuumPropertyCommand, VacuumCommandDock); err != nil {
			t.Fatal(err)
		}
	}
	if vacuum.docked != 2 || vacuum.GetValue(VacuumPropertyCommand) != VacuumCommandDock {
		t.Fatalf("docked = %d, command = %v", vacuum.docked, vacuum.GetValue(VacuumPropertyCommand))
	}

	// fire the reset now instead of waiting commandAutoResetMs
	vacuum.mu.Lock()
	vacuum.commandResetTimer.Reset(0)
	vacuum.mu.Unlock()
	for deadline := time.Now().Add(2 * time.Second); vacuum.GetValue(VacuumPropertyCommand) != "" && time.Now().Before(deadline); {
		time.Sleep(time.Millisecond)
	}
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
