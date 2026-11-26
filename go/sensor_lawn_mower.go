package sdk

// LawnMowerActivity is what a lawn mower does right now.
type LawnMowerActivity = string

// Activities of a lawn mower.
const (
	LawnMowerActivityMowing    LawnMowerActivity = "mowing"
	LawnMowerActivityDocked    LawnMowerActivity = "docked"
	LawnMowerActivityPaused    LawnMowerActivity = "paused"
	LawnMowerActivityReturning LawnMowerActivity = "returning"
	LawnMowerActivityError     LawnMowerActivity = "error"
)

// LawnMowerCommand is a command a lawn mower takes.
type LawnMowerCommand = string

// Commands a lawn mower takes.
const (
	LawnMowerCommandStart LawnMowerCommand = "start"
	LawnMowerCommandPause LawnMowerCommand = "pause"
	LawnMowerCommandDock  LawnMowerCommand = "dock"
)

// LawnMowerProperty is a property name of a lawn mower.
type LawnMowerProperty = string

// Property names of a lawn mower.
const (
	LawnMowerPropertyActivity LawnMowerProperty = "activity" // What the mower does right now, a LawnMowerActivity
	LawnMowerPropertyCommand  LawnMowerProperty = "command"  // One-off LawnMowerCommand when written, empty again right after
)

type lawnMowerSetters interface {
	Start() error
	Pause() error
	Dock() error
}

// LawnMowerControl is a robot lawn mower. Override Start, Pause and Dock (by
// embedding LawnMowerControl in your own type and shadowing the methods) to
// drive hardware, then call the embedded LawnMowerControl's methods after
// success. Report what the mower does with SetActivity.
//
// Narrow the commands to those the mower takes with
// SetPropertySpec(LawnMowerPropertyCommand, &PropertySpecOverride{Values: ...}).
//
// When the device refuses a command, return an error from the override instead of
// calling the embedded method: the write fails for whoever sent it and the state
// stays as it was.
type LawnMowerControl struct{ RobotControl }

// NewLawnMowerControl creates a lawn mower with the given name and options.
func NewLawnMowerControl(name string, opts ...SensorOption) *LawnMowerControl {
	s := &LawnMowerControl{}
	s.initCommand(SensorTypeLawnMower, name, opts)
	s.handleWrites(s)
	return s
}

// Start starts or resumes mowing.
//
// Example:
//
//	mower.Start()
func (s *LawnMowerControl) Start() error {
	s.sent(LawnMowerCommandStart)
	return nil
}

// Pause pauses mowing where the mower is.
//
// Example:
//
//	mower.Pause()
func (s *LawnMowerControl) Pause() error {
	s.sent(LawnMowerCommandPause)
	return nil
}

// Dock stops mowing and sends the mower back to its dock.
//
// Example:
//
//	mower.Dock()
func (s *LawnMowerControl) Dock() error {
	s.sent(LawnMowerCommandDock)
	return nil
}

func (s *LawnMowerControl) isCommand(property string) bool {
	return property == LawnMowerPropertyCommand
}

func (s *LawnMowerControl) applyValue(property string, value any) error {
	if property != LawnMowerPropertyCommand {
		return nil
	}
	setters := outerOr[lawnMowerSetters](&s.BaseSensor, s)
	switch value {
	case LawnMowerCommandStart:
		if err := setters.Start(); err != nil {
			return err
		}
	case LawnMowerCommandPause:
		if err := setters.Pause(); err != nil {
			return err
		}
	case LawnMowerCommandDock:
		if err := setters.Dock(); err != nil {
			return err
		}
	}
	return nil
}
