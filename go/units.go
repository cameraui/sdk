package sdk

import "math"

// UnitSystem is the set of units the admin picked for the installation under
// Settings, System.
type UnitSystem string

const (
	UnitSystemMetric   UnitSystem = "metric"   // Metric units, such as °C, km and kg
	UnitSystemImperial UnitSystem = "imperial" // Imperial units as used in the US, such as °F, mi and lb
)

type unitConversion struct {
	unit   string
	to     string
	factor float64
	offset float64
}

// the first metric unit for an imperial one wins on the way back, so mm comes before cm
var toImperial = []unitConversion{
	{"°C", "°F", 9.0 / 5, 32},
	{"km", "mi", 0.621371, 0},
	{"m", "ft", 3.28084, 0},
	{"mm", "in", 0.0393701, 0},
	{"cm", "in", 0.393701, 0},
	{"km/h", "mph", 0.621371, 0},
	{"m/s", "mph", 2.23694, 0},
	{"mm/h", "in/h", 0.0393701, 0},
	{"mm/d", "in/d", 0.0393701, 0},
	{"L", "gal", 0.264172, 0},
	{"mL", "fl. oz.", 0.033814, 0},
	{"m³", "ft³", 35.3147, 0},
	{"L/min", "gal/min", 0.264172, 0},
	{"L/h", "gal/h", 0.264172, 0},
	{"kg", "lb", 2.20462, 0},
	{"g", "oz", 0.035274, 0},
	{"hPa", "inHg", 0.02953, 0},
	{"mbar", "inHg", 0.02953, 0},
	{"kPa", "psi", 0.145038, 0},
	{"bar", "psi", 14.5038, 0},
}

var (
	imperialByUnit = map[string]unitConversion{}
	metricByUnit   = map[string]unitConversion{}
)

func init() {
	for _, c := range toImperial {
		imperialByUnit[c.unit] = c
		if _, ok := metricByUnit[c.to]; !ok {
			metricByUnit[c.to] = unitConversion{unit: c.to, to: c.unit, factor: 1 / c.factor, offset: -c.offset / c.factor}
		}
	}
}

// ToUnitSystem converts a reading to the unit the installation shows for its
// quantity, such as °C to °F for UnitSystemImperial, rounded to two decimals. A
// reading already in that unit system, or in a unit without a counterpart,
// comes back unchanged.
//
// Example:
//
//	system, _ := api.CoreManager.GetUnitSystem()
//	value, unit := sdk.ToUnitSystem(21.5, "°C", system) // 70.7, "°F" for imperial
func ToUnitSystem(value float64, unit string, system UnitSystem) (shown float64, shownUnit string) {
	c, ok := conversionFor(unit, system)
	if !ok {
		return value, unit
	}
	return roundUnit(value*c.factor + c.offset), c.to
}

// FromUnitSystem converts a value entered in the shown unit back to the unit it
// is stored in, rounded to two decimals, the reverse of ToUnitSystem.
//
// Example:
//
//	stored := sdk.FromUnitSystem(70.7, "°C", sdk.UnitSystemImperial) // 21.5
func FromUnitSystem(value float64, unit string, system UnitSystem) float64 {
	c, ok := conversionFor(unit, system)
	if !ok {
		return value
	}
	return roundUnit((value - c.offset) / c.factor)
}

func conversionFor(unit string, system UnitSystem) (unitConversion, bool) {
	if system == UnitSystemImperial {
		c, ok := imperialByUnit[unit]
		return c, ok
	}
	c, ok := metricByUnit[unit]
	return c, ok
}

func roundUnit(value float64) float64 {
	return math.Round(value*100) / 100
}
