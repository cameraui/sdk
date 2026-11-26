package sdk

import (
	"fmt"
	"math"
	"reflect"
	"strconv"
	"strings"
)

// SensorPropertyValueType is the runtime type of a sensor property: boolean,
// number, string, enum or object.
type SensorPropertyValueType string

const (
	SensorPropertyValueTypeBoolean SensorPropertyValueType = "boolean"
	SensorPropertyValueTypeNumber  SensorPropertyValueType = "number"
	SensorPropertyValueTypeString  SensorPropertyValueType = "string"
	SensorPropertyValueTypeEnum    SensorPropertyValueType = "enum"
	SensorPropertyValueTypeObject  SensorPropertyValueType = "object"
)

// SensorPropertyChoice is a value a device offers for a property, such as a
// chime tone or a TV input.
type SensorPropertyChoice struct {
	// Value is the value written to the property.
	Value any `msgpack:"value" json:"value"`
	// Label is the name of the value at the device, shown as it comes.
	Label string `msgpack:"label" json:"label"`
}

// SensorPropertySpec describes the values of one property: the type it
// carries, its enum values or numeric range, and whether it is a command or an
// internal detail.
type SensorPropertySpec struct {
	// Type is the runtime type of the value.
	Type SensorPropertyValueType `msgpack:"type" json:"type"`
	// Values maps the value names of an enum property to their wire values. Names double as i18n key stems.
	Values map[string]any `msgpack:"values,omitempty" json:"values,omitempty"`
	// Keys lists the scalar member keys of an object property, exposed as value-path variables.
	Keys []string `msgpack:"keys,omitempty" json:"keys,omitempty"`
	// Min is the lowest accepted value of a numeric property.
	Min *float64 `msgpack:"min,omitempty" json:"min,omitempty"`
	// Max is the highest accepted value of a numeric property.
	Max *float64 `msgpack:"max,omitempty" json:"max,omitempty"`
	// Step is the accepted increment of a numeric property, commands are rounded to it.
	Step *float64 `msgpack:"step,omitempty" json:"step,omitempty"`
	// Unit is the display unit of the value, e.g. % or °C.
	Unit string `msgpack:"unit,omitempty" json:"unit,omitempty"`
	// Choices lists the values the device offers with their names at the device, for a property without a fixed enum.
	Choices []SensorPropertyChoice `msgpack:"choices,omitempty" json:"choices,omitempty"`
	// MaxLength is the longest accepted text of a string property.
	MaxLength *int `msgpack:"maxLength,omitempty" json:"maxLength,omitempty"`
	// Writable reports whether the property accepts external writes (commands, target states, virtual sensor state).
	Writable bool `msgpack:"writable,omitempty" json:"writable,omitempty"`
	// Command reports that each write is an action of its own: writes run in order and none replaces another.
	Command bool `msgpack:"command,omitempty" json:"command,omitempty"`
	// Internal reports that the property is no observable state, hidden from trigger and condition pickers.
	Internal bool `msgpack:"internal,omitempty" json:"internal,omitempty"`
}

// PropertySpecOverride is what a plugin narrows or describes on one property of
// its sensor, on top of the type's spec: a thermostat's range, a chime's tones,
// an alarm without night mode. The host rejects a command outside it before it
// reaches the plugin, readings the plugin reports are not checked.
type PropertySpecOverride struct {
	// Min is the lowest accepted value, inside the type's range.
	Min *float64 `msgpack:"min,omitempty" json:"min,omitempty"`
	// Max is the highest accepted value, inside the type's range.
	Max *float64 `msgpack:"max,omitempty" json:"max,omitempty"`
	// Step is the accepted increment, commands are rounded to it.
	Step *float64 `msgpack:"step,omitempty" json:"step,omitempty"`
	// Unit is the display unit, only for a property whose type sets none.
	Unit string `msgpack:"unit,omitempty" json:"unit,omitempty"`
	// Values lists the values an enum property supports at the device, a subset of the type's.
	Values []any `msgpack:"values,omitempty" json:"values,omitempty"`
	// Choices lists the values the device offers with their names at the device, for a property without a fixed enum.
	Choices []SensorPropertyChoice `msgpack:"choices,omitempty" json:"choices,omitempty"`
	// MaxLength is the longest accepted text.
	MaxLength *int `msgpack:"maxLength,omitempty" json:"maxLength,omitempty"`
}

func checkPropertyWrite(specs map[string]SensorPropertySpec, property string, value any) (any, error) {
	spec, ok := specs[property]
	if !ok {
		return value, nil
	}

	if number, ok := numberOf(value); ok {
		if spec.Min != nil && number < *spec.Min {
			return nil, fmt.Errorf("%s must be at least %v, got %v", property, *spec.Min, number)
		}
		if spec.Max != nil && number > *spec.Max {
			return nil, fmt.Errorf("%s must be at most %v, got %v", property, *spec.Max, number)
		}
		if spec.Step != nil && *spec.Step > 0 {
			value = roundToStep(number, &spec)
		}
	}
	if spec.Values != nil && !containsValue(spec.Values, value) {
		return nil, fmt.Errorf("%s does not support %v", property, value)
	}
	if spec.Choices != nil && !hasChoice(spec.Choices, value) {
		return nil, fmt.Errorf("%s has no choice %v", property, value)
	}
	if text, ok := value.(string); ok && spec.MaxLength != nil && len([]rune(text)) > *spec.MaxLength {
		return nil, fmt.Errorf("%s is longer than %d characters", property, *spec.MaxLength)
	}
	return value, nil
}

func roundToStep(value float64, spec *SensorPropertySpec) float64 {
	step := *spec.Step
	base := 0.0
	if spec.Min != nil {
		base = *spec.Min
	}
	_, decimals, _ := strings.Cut(strconv.FormatFloat(step, 'f', -1, 64), ".")
	scale := math.Pow(10, float64(len(decimals)))
	rounded := math.Round((base+math.Floor((value-base)/step+0.5)*step)*scale) / scale
	if spec.Min != nil {
		rounded = math.Max(rounded, *spec.Min)
	}
	if spec.Max != nil {
		rounded = math.Min(rounded, *spec.Max)
	}
	return rounded
}

func containsValue(values map[string]any, value any) bool {
	for _, candidate := range values {
		if sameWireValue(candidate, value) {
			return true
		}
	}
	return false
}

func hasChoice(choices []SensorPropertyChoice, value any) bool {
	for _, choice := range choices {
		if sameWireValue(choice.Value, value) {
			return true
		}
	}
	return false
}

func sameWireValue(a, b any) bool {
	if an, ok := numberOf(a); ok {
		bn, ok := numberOf(b)
		return ok && an == bn
	}
	va, vb := reflect.ValueOf(a), reflect.ValueOf(b)
	if va.Kind() == reflect.String && vb.Kind() == reflect.String {
		return va.String() == vb.String()
	}
	return false
}

func numberOf(v any) (float64, bool) {
	rv := reflect.ValueOf(v)
	switch rv.Kind() {
	case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64:
		return float64(rv.Int()), true
	case reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64:
		return float64(rv.Uint()), true
	case reflect.Float32, reflect.Float64:
		return rv.Float(), true
	}
	return 0, false
}
