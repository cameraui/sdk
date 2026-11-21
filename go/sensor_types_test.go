package sdk

import (
	"math"
	"reflect"
	"testing"
)

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
