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
	Start() error
	Pause() error
	Stop() error
	Dock() error
	Locate() error
	Spot() error
	SetFanSpeed(value string) error
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
//
// When the device refuses a command, return an error from the override instead of
// calling the embedded method: the write fails for whoever sent it and the state
// stays as it was.
type VacuumControl struct{ RobotControl }

// NewVacuumControl creates a vacuum with the given name and options.
func NewVacuumControl(name string, opts ...SensorOption) *VacuumControl {
	s := &VacuumControl{}
	s.initCommand(SensorTypeVacuum, name, opts)
	s.handleWrites(s)
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
func (s *VacuumControl) Start() error {
	s.sent(VacuumCommandStart)
	return nil
}

// Pause pauses cleaning where the vacuum is.
//
// Example:
//
//	vacuum.Pause()
func (s *VacuumControl) Pause() error {
	s.sent(VacuumCommandPause)
	return nil
}

// Stop stops cleaning.
//
// Example:
//
//	vacuum.Stop()
func (s *VacuumControl) Stop() error {
	s.sent(VacuumCommandStop)
	return nil
}

// Dock sends the vacuum back to its dock.
//
// Example:
//
//	vacuum.Dock()
func (s *VacuumControl) Dock() error {
	s.sent(VacuumCommandDock)
	return nil
}

// Locate makes the vacuum beep so it can be found.
//
// Example:
//
//	vacuum.Locate()
func (s *VacuumControl) Locate() error {
	s.sent(VacuumCommandLocate)
	return nil
}

// Spot cleans the spot around the vacuum.
//
// Example:
//
//	vacuum.Spot()
func (s *VacuumControl) Spot() error {
	s.sent(VacuumCommandSpot)
	return nil
}

// SetFanSpeed sets the suction level, one of the suction level choices.
//
// Example:
//
//	vacuum.SetFanSpeed("turbo")
func (s *VacuumControl) SetFanSpeed(value string) error {
	s.writeState(map[string]any{VacuumPropertyFanSpeed: value})
	return nil
}

func (s *VacuumControl) isCommand(property string) bool {
	return property == VacuumPropertyCommand
}

func (s *VacuumControl) applyValue(property string, value any) error {
	setters := outerOr[vacuumSetters](&s.BaseSensor, s)
	switch property {
	case VacuumPropertyFanSpeed:
		if v, ok := value.(string); ok {
			if err := setters.SetFanSpeed(v); err != nil {
				return err
			}
		}
	case VacuumPropertyCommand:
		switch value {
		case VacuumCommandStart:
			if err := setters.Start(); err != nil {
				return err
			}
		case VacuumCommandPause:
			if err := setters.Pause(); err != nil {
				return err
			}
		case VacuumCommandStop:
			if err := setters.Stop(); err != nil {
				return err
			}
		case VacuumCommandDock:
			if err := setters.Dock(); err != nil {
				return err
			}
		case VacuumCommandLocate:
			if err := setters.Locate(); err != nil {
				return err
			}
		case VacuumCommandSpot:
			if err := setters.Spot(); err != nil {
				return err
			}
		}
	}
	return nil
}
