package sdk

import (
	"fmt"
	"slices"
	"time"
)

// ButtonProperty is a property name of a button.
type ButtonProperty = string

// Property names of a button.
const (
	ButtonPropertyPress ButtonProperty = "press" // Kind of the press in progress, empty between presses
	ButtonPropertyIndex ButtonProperty = "index" // Position of the button on its device, from 1. 0 leaves the order to the creation order
)

// ButtonPress is how a button was pressed.
type ButtonPress string

const (
	ButtonPressSingle ButtonPress = "single" // One short press
	ButtonPressDouble ButtonPress = "double" // Two short presses in a row
	ButtonPressLong   ButtonPress = "long"   // A press held down
)

const pressAutoResetMs = 2000

// ButtonConfig describes a button at construction.
type ButtonConfig struct {
	// Index is the position of the button on its device, from 1, e.g. for HomeKit's button order.
	Index int
	// Presses lists the kinds of press the button reports besides a single press.
	Presses []ButtonPress
}

// ButtonTrigger is a physical button, such as one on a remote or a wall switch.
//
// Call Press when the device reports a press: press is set to its kind and
// goes back to empty after pressAutoResetMs. A single press is always offered,
// double and long presses only when listed in ButtonConfig.Presses.
type ButtonTrigger struct {
	BaseSensor
	presses         []ButtonPress
	pressResetTimer *time.Timer
}

// NewButtonTrigger creates a button with the given name, config and options.
func NewButtonTrigger(name string, config ButtonConfig, opts ...SensorOption) *ButtonTrigger {
	presses := []ButtonPress{ButtonPressSingle}
	for _, kind := range config.Presses {
		if !slices.Contains(presses, kind) {
			presses = append(presses, kind)
		}
	}
	values := make([]any, len(presses))
	for i, kind := range presses {
		values[i] = string(kind)
	}

	s := &ButtonTrigger{BaseSensor: NewBaseSensor(name, opts...), presses: presses}
	s.SetPropertySpec(ButtonPropertyPress, &PropertySpecOverride{Values: values})
	s.writeState(map[string]any{ButtonPropertyPress: "", ButtonPropertyIndex: config.Index})
	return s
}

func (s *ButtonTrigger) GetType() SensorType         { return SensorTypeButton }
func (s *ButtonTrigger) GetCategory() SensorCategory { return SensorCategoryTrigger }
func (s *ButtonTrigger) ToJSON() sensorJSON          { return s.toBaseJSON(s.GetType(), s.GetCategory()) }

// GetPress returns the kind of the press in progress, empty between presses.
func (s *ButtonTrigger) GetPress() ButtonPress {
	v, _ := s.GetValue(ButtonPropertyPress).(string)
	return ButtonPress(v)
}

// GetIndex returns the position of the button on its device, from 1. 0 leaves the order to the creation order.
func (s *ButtonTrigger) GetIndex() int {
	if v, ok := toInt64(s.GetValue(ButtonPropertyIndex)); ok {
		return int(v)
	}
	return 0
}

// Press reports a press. A press while the last one is still set counts as a
// new one. It fails when the button does not offer this kind of press.
//
// Example:
//
//	err := button.Press(sdk.ButtonPressDouble)
func (s *ButtonTrigger) Press(kind ButtonPress) error {
	if !slices.Contains(s.presses, kind) {
		return fmt.Errorf("button %q does not offer a %s press", s.name, kind)
	}

	s.mu.Lock()
	if s.pressResetTimer != nil {
		s.pressResetTimer.Stop()
		s.pressResetTimer = nil
	}
	s.mu.Unlock()

	if s.GetPress() != "" {
		s.writeState(map[string]any{ButtonPropertyPress: ""})
	}
	s.writeState(map[string]any{ButtonPropertyPress: string(kind)})

	timer := time.AfterFunc(time.Duration(pressAutoResetMs)*time.Millisecond, func() {
		s.mu.Lock()
		s.pressResetTimer = nil
		s.mu.Unlock()
		s.writeState(map[string]any{ButtonPropertyPress: ""})
	})

	s.mu.Lock()
	s.pressResetTimer = timer
	s.mu.Unlock()
	return nil
}

func (s *ButtonTrigger) cleanup() {
	s.mu.Lock()
	if s.pressResetTimer != nil {
		s.pressResetTimer.Stop()
		s.pressResetTimer = nil
	}
	s.mu.Unlock()

	s.BaseSensor.cleanup()
}
