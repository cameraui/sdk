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
	Start()
	Pause()
	Dock()
}

// LawnMowerControl is a robot lawn mower. Override Start, Pause and Dock (by
// embedding LawnMowerControl in your own type and shadowing the methods) to
// drive hardware, then call the embedded LawnMowerControl's methods after
// success. Report what the mower does with SetActivity.
//
// Narrow the commands to those the mower takes with
// SetPropertySpec(LawnMowerPropertyCommand, &PropertySpecOverride{Values: ...}).
type LawnMowerControl struct{ RobotControl }

// NewLawnMowerControl creates a lawn mower with the given name and options.
func NewLawnMowerControl(name string, opts ...SensorOption) *LawnMowerControl {
	s := &LawnMowerControl{}
	s.initCommand(SensorTypeLawnMower, name, opts)
	return s
}

// Start starts or resumes mowing.
//
// Example:
//
//	mower.Start()
func (s *LawnMowerControl) Start() {
	s.sent(LawnMowerCommandStart)
}

// Pause pauses mowing where the mower is.
//
// Example:
//
//	mower.Pause()
func (s *LawnMowerControl) Pause() {
	s.sent(LawnMowerCommandPause)
}

// Dock stops mowing and sends the mower back to its dock.
//
// Example:
//
//	mower.Dock()
func (s *LawnMowerControl) Dock() {
	s.sent(LawnMowerCommandDock)
}

// UpdateValue routes generic property writes to the semantic setters.
func (s *LawnMowerControl) UpdateValue(property string, value any) error {
	if property != LawnMowerPropertyCommand {
		return nil
	}
	setters := outerOr[lawnMowerSetters](&s.BaseSensor, s)
	switch value {
	case LawnMowerCommandStart:
		setters.Start()
	case LawnMowerCommandPause:
		setters.Pause()
	case LawnMowerCommandDock:
		setters.Dock()
	}
	return nil
}
