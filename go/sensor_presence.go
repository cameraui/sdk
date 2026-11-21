package sdk

// PresenceProperty is a property name of a presence sensor.
type PresenceProperty = string

// Property names of a presence sensor.
const (
	PresencePropertyDetected PresenceProperty = "detected" // Whether the person is at home
	PresencePropertyZone     PresenceProperty = "zone"     // Name of the zone the person is in while away, empty at home or when unknown
)

// PresenceSensor reports whether one person is at home, such as from a phone's
// location or a tracker. Unlike an occupancy sensor it follows a person, not a
// room.
type PresenceSensor struct{ BinarySensor }

// NewPresenceSensor creates a presence sensor with the given name and options.
func NewPresenceSensor(name string, opts ...SensorOption) *PresenceSensor {
	s := &PresenceSensor{}
	s.initBinary(SensorTypePresence, name, opts)
	s.writeState(map[string]any{PresencePropertyZone: ""})
	return s
}

// GetZone returns the name of the zone the person is in while away, empty at
// home or when unknown.
func (s *PresenceSensor) GetZone() string {
	v, _ := s.GetValue(PresencePropertyZone).(string)
	return v
}

// SetZone reports the zone the person is in while away, empty when the zone is
// unknown.
//
// Example:
//
//	presence.SetDetected(false)
//	presence.SetZone("Work")
func (s *PresenceSensor) SetZone(zone string) {
	s.writeState(map[string]any{PresencePropertyZone: zone})
}
