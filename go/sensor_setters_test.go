package sdk

import "testing"

type shadowPTZ struct {
	*PTZControl
	velocities []PTZDirection
	positions  []PTZPosition
}

func (s *shadowPTZ) SetVelocity(value PTZDirection) {
	s.velocities = append(s.velocities, value)
	s.PTZControl.SetVelocity(value)
}

func (s *shadowPTZ) SetPosition(value PTZPosition) {
	s.positions = append(s.positions, value)
	s.PTZControl.SetPosition(value)
}

type shadowSiren struct {
	*SirenControl
	activated int
}

func (s *shadowSiren) SetActive() {
	s.activated++
	s.SirenControl.SetActive()
}

func TestUpdateValueReachesShadowedSetters(t *testing.T) {
	ptz := &shadowPTZ{PTZControl: NewPTZControl("ptz")}
	ptz.setOuter(ptz)

	// a full-speed 1 from the browser arrives as int8
	if err := ptz.UpdateValue("velocity", map[string]any{"panSpeed": int8(-1), "tiltSpeed": 0.45, "zoomSpeed": int8(0)}); err != nil {
		t.Fatal(err)
	}
	if err := ptz.UpdateValue("home", nil); err != nil {
		t.Fatal(err)
	}
	if want := (PTZDirection{PanSpeed: -1, TiltSpeed: 0.45}); len(ptz.velocities) != 1 || ptz.velocities[0] != want {
		t.Fatalf("velocities = %v, want [%v]", ptz.velocities, want)
	}
	if len(ptz.positions) != 1 || ptz.positions[0] != (PTZPosition{}) {
		t.Fatalf("home did not reach the shadowed SetPosition: %v", ptz.positions)
	}

	siren := &shadowSiren{SirenControl: NewSirenControl("siren")}
	siren.setOuter(siren)
	if err := siren.UpdateValue("active", true); err != nil {
		t.Fatal(err)
	}
	if siren.activated != 1 || siren.GetValue("active") != true {
		t.Fatalf("activated = %d, active = %v", siren.activated, siren.GetValue("active"))
	}
}

func TestUpdateValueWithoutOuterSyncsState(t *testing.T) {
	ptz := NewPTZControl("ptz")
	if err := ptz.UpdateValue("velocity", map[string]any{"panSpeed": int8(1), "tiltSpeed": int8(0), "zoomSpeed": int8(0)}); err != nil {
		t.Fatal(err)
	}
	if got := ptz.GetValue("velocity"); got != (PTZDirection{PanSpeed: 1}) {
		t.Fatalf("velocity = %v", got)
	}
}
