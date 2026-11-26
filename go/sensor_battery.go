package sdk

// ChargingState defines battery charging states.
type ChargingState string

const (
	ChargingStateNotCharging   ChargingState = "NOT_CHARGING"   // Battery is not charging
	ChargingStateNotChargeable ChargingState = "NOT_CHARGEABLE" // Device has no rechargeable battery
	ChargingStateCharging      ChargingState = "CHARGING"       // Battery is currently charging
	ChargingStateFull          ChargingState = "FULL"           // Battery is fully charged
)

// Optional capabilities of a battery info sensor.
const (
	BatteryCapabilityLowBattery = "lowBattery" // Sensor reports low-battery alerts
	BatteryCapabilityCharging   = "charging"   // Sensor reports charging state
)

// BatteryProperty is a property name of a battery info sensor.
type BatteryProperty = string

// Property names of a battery info sensor.
const (
	BatteryPropertyLevel    BatteryProperty = "level"    // Battery level percentage (0-100)
	BatteryPropertyCharging BatteryProperty = "charging" // Current charging state
	BatteryPropertyLow      BatteryProperty = "low"      // Whether the battery is critically low
)

// BatteryInfo reports battery level, charging state, and low-battery alerts.
//
// Plugin authors call SetLevel, SetCharging, and SetLow to push updates from
// the device.
type BatteryInfo struct{ BaseSensor }

// NewBatteryInfo creates a battery info sensor with the given name and options.
func NewBatteryInfo(name string, opts ...SensorOption) *BatteryInfo {
	s := &BatteryInfo{BaseSensor: NewBaseSensor(name, opts...)}
	s.writeState(map[string]any{
		BatteryPropertyLevel:    100,
		BatteryPropertyCharging: string(ChargingStateNotCharging),
		BatteryPropertyLow:      false,
	})
	return s
}

func (s *BatteryInfo) GetType() SensorType         { return SensorTypeBattery }
func (s *BatteryInfo) GetCategory() SensorCategory { return SensorCategoryInfo }
func (s *BatteryInfo) ToJSON() sensorJSON          { return s.toBaseJSON(s.GetType(), s.GetCategory()) }

// GetLevel returns the battery level percentage (0-100).
func (s *BatteryInfo) GetLevel() int {
	if v, ok := s.GetValue(BatteryPropertyLevel).(int); ok {
		return v
	}
	return 0
}

// GetCharging returns the current charging state.
func (s *BatteryInfo) GetCharging() ChargingState {
	if v, ok := s.GetValue(BatteryPropertyCharging).(string); ok {
		return ChargingState(v)
	}
	return ChargingStateNotCharging
}

// IsLow reports whether the battery is critically low.
func (s *BatteryInfo) IsLow() bool {
	v, _ := s.GetValue(BatteryPropertyLow).(bool)
	return v
}

// SetLevel reports a new battery level percentage, clamped to [0,100].
//
// Example:
//
//	battery.SetLevel(87)
func (s *BatteryInfo) SetLevel(value int) {
	if value < 0 {
		value = 0
	}
	if value > 100 {
		value = 100
	}
	s.writeState(map[string]any{BatteryPropertyLevel: value})
}

// SetCharging sets the charging state.
//
// Example:
//
//	battery.SetCharging(ChargingStateCharging)
func (s *BatteryInfo) SetCharging(value ChargingState) {
	s.writeState(map[string]any{BatteryPropertyCharging: string(value)})
}

// SetLow sets the low-battery alert flag.
//
// Example:
//
//	battery.SetLow(true)
func (s *BatteryInfo) SetLow(value bool) {
	s.writeState(map[string]any{BatteryPropertyLow: value})
}
