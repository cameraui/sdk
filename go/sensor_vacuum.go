package sdk

// VacuumActivity is what a vacuum does right now.
type VacuumActivity = string

// Activities of a vacuum.
const (
	VacuumActivityCleaning  VacuumActivity = "cleaning"
	VacuumActivityDocked    VacuumActivity = "docked"
	VacuumActivityIdle      VacuumActivity = "idle"
	VacuumActivityPaused    VacuumActivity = "paused"
	VacuumActivityReturning VacuumActivity = "returning"
	VacuumActivityError     VacuumActivity = "error"
)

// VacuumCommand is a command a vacuum takes.
type VacuumCommand = string

// Commands a vacuum takes.
const (
	VacuumCommandStart  VacuumCommand = "start"
	VacuumCommandPause  VacuumCommand = "pause"
	VacuumCommandStop   VacuumCommand = "stop"
	VacuumCommandDock   VacuumCommand = "dock"
	VacuumCommandLocate VacuumCommand = "locate"
	VacuumCommandSpot   VacuumCommand = "spot"
)

// Optional capabilities of a vacuum.
const (
	VacuumCapabilityFanSpeed = "fanSpeed" // Vacuum cleans with a choice of suction levels
)

// VacuumProperty is a property name of a vacuum.
type VacuumProperty = string

// Property names of a vacuum.
const (
	VacuumPropertyActivity VacuumProperty = "activity" // What the vacuum does right now, a VacuumActivity
	VacuumPropertyCommand  VacuumProperty = "command"  // One-off VacuumCommand when written, empty again right after
	VacuumPropertyFanSpeed VacuumProperty = "fanSpeed" // Suction level, one of the choices the plugin sets
)

type vacuumSetters interface {
	Start()
	Pause()
	Stop()
	Dock()
	Locate()
	Spot()
	SetFanSpeed(value string)
}

// VacuumControl is a robot vacuum. Override Start, Pause, Stop, Dock, Locate,
// Spot and SetFanSpeed (by embedding VacuumControl in your own type and
// shadowing the methods) to drive hardware, then call the embedded
// VacuumControl's methods after success. Report what the vacuum does with
// SetActivity.
//
// Narrow the commands to those the vacuum takes with
// SetPropertySpec(VacuumPropertyCommand, &PropertySpecOverride{Values: ...}).
// The suction levels come as choices with the fanSpeed capability:
// SetPropertySpec(VacuumPropertyFanSpeed, &PropertySpecOverride{Choices: ...}).
type VacuumControl struct{ RobotControl }

// NewVacuumControl creates a vacuum with the given name and options.
func NewVacuumControl(name string, opts ...SensorOption) *VacuumControl {
	s := &VacuumControl{}
	s.initRobot(SensorTypeVacuum, name, opts)
	return s
}

// GetFanSpeed returns the suction level.
func (s *VacuumControl) GetFanSpeed() string {
	v, _ := s.GetValue(VacuumPropertyFanSpeed).(string)
	return v
}

// Start starts or resumes cleaning.
//
// Example:
//
//	vacuum.Start()
func (s *VacuumControl) Start() {
	s.sent(VacuumCommandStart)
}

// Pause pauses cleaning where the vacuum is.
//
// Example:
//
//	vacuum.Pause()
func (s *VacuumControl) Pause() {
	s.sent(VacuumCommandPause)
}

// Stop stops cleaning.
//
// Example:
//
//	vacuum.Stop()
func (s *VacuumControl) Stop() {
	s.sent(VacuumCommandStop)
}

// Dock sends the vacuum back to its dock.
//
// Example:
//
//	vacuum.Dock()
func (s *VacuumControl) Dock() {
	s.sent(VacuumCommandDock)
}

// Locate makes the vacuum beep so it can be found.
//
// Example:
//
//	vacuum.Locate()
func (s *VacuumControl) Locate() {
	s.sent(VacuumCommandLocate)
}

// Spot cleans the spot around the vacuum.
//
// Example:
//
//	vacuum.Spot()
func (s *VacuumControl) Spot() {
	s.sent(VacuumCommandSpot)
}

// SetFanSpeed sets the suction level, one of the suction level choices.
//
// Example:
//
//	vacuum.SetFanSpeed("turbo")
func (s *VacuumControl) SetFanSpeed(value string) {
	s.writeState(map[string]any{VacuumPropertyFanSpeed: value})
}

// UpdateValue routes generic property writes to the semantic setters.
func (s *VacuumControl) UpdateValue(property string, value any) error {
	setters := outerOr[vacuumSetters](&s.BaseSensor, s)
	switch property {
	case VacuumPropertyFanSpeed:
		if v, ok := value.(string); ok {
			setters.SetFanSpeed(v)
		}
	case VacuumPropertyCommand:
		switch value {
		case VacuumCommandStart:
			setters.Start()
		case VacuumCommandPause:
			setters.Pause()
		case VacuumCommandStop:
			setters.Stop()
		case VacuumCommandDock:
			setters.Dock()
		case VacuumCommandLocate:
			setters.Locate()
		case VacuumCommandSpot:
			setters.Spot()
		}
	}
	return nil
}
