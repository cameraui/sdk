package sdk

import (
	"strings"
	"testing"

	rpc "github.com/cameraui/rpc/go"
)

func float(v float64) *float64 { return &v }

func intPtr(v int) *int { return &v }

func TestSetPropertySpecSendsOnlyChanges(t *testing.T) {
	noNight := &PropertySpecOverride{Values: []any{SecuritySystemStateAwayArm, SecuritySystemStateStayArm, SecuritySystemStateDisarmed}}
	alarm := NewSecuritySystem("Alarm", WithPropertySpec(SecuritySystemPropertyTargetState, noNight))

	specs := alarm.ToJSON().PropertySpecs
	if len(specs) != 1 || len(specs[SecuritySystemPropertyTargetState].Values) != 3 {
		t.Fatalf("registration specs = %+v", specs)
	}

	var patches []sensorSourcePatch
	alarm.initSourceUpdateFn(func(patch sensorSourcePatch) { patches = append(patches, patch) })

	alarm.SetPropertySpec(SecuritySystemPropertyTargetState, &PropertySpecOverride{Values: []any{SecuritySystemStateAwayArm, SecuritySystemStateStayArm, SecuritySystemStateDisarmed}})
	if len(patches) != 0 {
		t.Fatalf("an unchanged spec was sent: %+v", patches)
	}

	alarm.SetPropertySpec(SecuritySystemPropertyTargetState, nil)
	alarm.SetPropertySpec(SecuritySystemPropertyTargetState, nil)
	if len(patches) != 1 {
		t.Fatalf("patches = %+v", patches)
	}

	// clearing must reach the host as an empty map, nil would keep the host's map
	encoded, err := rpc.Encode(patches[0])
	if err != nil {
		t.Fatal(err)
	}
	var wire map[string]any
	if err := rpc.Decode(encoded, &wire); err != nil {
		t.Fatal(err)
	}
	if cleared, ok := wire["propertySpecs"].(map[string]any); !ok || len(cleared) != 0 {
		t.Fatalf("clear patch on the wire = %v", wire)
	}
}

func TestRegistersAnEmptySpecMap(t *testing.T) {
	encoded, err := rpc.Encode(NewSecuritySystem("Alarm").ToJSON())
	if err != nil {
		t.Fatal(err)
	}
	var wire map[string]any
	if err := rpc.Decode(encoded, &wire); err != nil {
		t.Fatal(err)
	}
	if specs, ok := wire["propertySpecs"].(map[string]any); !ok || len(specs) != 0 {
		t.Fatalf("registration propertySpecs on the wire = %v", wire["propertySpecs"])
	}
}

func TestApplyPropertySpecsEmitsOncePerChange(t *testing.T) {
	alarm := NewSecuritySystem("Alarm")
	var events []map[string]SensorPropertySpec
	alarm.OnPropertySpecsChanged(func(specs map[string]SensorPropertySpec) { events = append(events, specs) })

	resolved := func() map[string]SensorPropertySpec {
		return map[string]SensorPropertySpec{"targetState": {Type: SensorPropertyValueTypeEnum, Values: map[string]any{"away_arm": 1, "disarmed": 3}, Writable: true}}
	}
	alarm.applyPropertySpecs(resolved())
	alarm.applyPropertySpecs(resolved())
	if len(events) != 1 {
		t.Fatalf("events = %+v", events)
	}
	if got := alarm.GetPropertySpecs()["targetState"].Values["disarmed"]; got != 3 {
		t.Errorf("resolved disarmed = %v", got)
	}
}

func TestCheckPropertyWrite(t *testing.T) {
	specs := map[string]SensorPropertySpec{
		"target":      {Type: SensorPropertyValueTypeNumber, Min: float(10), Max: float(30), Step: float(0.5)},
		"targetState": {Type: SensorPropertyValueTypeEnum, Values: map[string]any{"away_arm": int8(1), "disarmed": int8(3)}},
		"tone":        {Type: SensorPropertyValueTypeString, Choices: []SensorPropertyChoice{{Value: "ding", Label: "Ding Dong"}}},
		"text":        {Type: SensorPropertyValueTypeString, MaxLength: intPtr(4)},
		"coarse":      {Type: SensorPropertyValueTypeNumber, Min: float(0), Max: float(10), Step: float(4)},
	}

	passes := []struct {
		property string
		value    any
		want     any
	}{
		{"on", true, true},
		{"target", 21.3, 21.5},
		{"target", 21.2, 21.0},
		{"target", 21.25, 21.5},
		{"coarse", 10, 10.0},
		{"targetState", SecuritySystemStateAwayArm, SecuritySystemStateAwayArm},
		{"tone", "ding", "ding"},
		{"text", "Hall", "Hall"},
	}
	for _, tc := range passes {
		got, err := checkPropertyWrite(specs, tc.property, tc.value)
		if err != nil || got != tc.want {
			t.Errorf("%s %v = %v, %v; want %v", tc.property, tc.value, got, err, tc.want)
		}
	}

	rejects := []struct {
		property string
		value    any
		message  string
	}{
		{"target", 9.9, "at least 10"},
		{"target", 30.1, "at most 30"},
		{"targetState", 2, "does not support 2"},
		{"tone", "xmas", "no choice xmas"},
		{"text", "Hallway", "longer than 4"},
	}
	for _, tc := range rejects {
		if _, err := checkPropertyWrite(specs, tc.property, tc.value); err == nil || !strings.Contains(err.Error(), tc.message) {
			t.Errorf("%s %v err = %v, want %q", tc.property, tc.value, err, tc.message)
		}
	}
}
