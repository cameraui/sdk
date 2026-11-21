package sdk

import "time"

// AccessProperty is a property name of an access reader.
type AccessProperty = string

// Property names of an access reader.
const (
	AccessPropertyResult AccessProperty = "result" // Result of the attempt in progress, empty between attempts
	AccessPropertyMethod AccessProperty = "method" // How the last attempt was made
	AccessPropertyUser   AccessProperty = "user"   // Who made the last attempt, empty when unknown
)

// AccessResult is the result of an access attempt.
type AccessResult string

const (
	AccessResultGranted AccessResult = "granted" // Access was granted
	AccessResultDenied  AccessResult = "denied"  // Access was denied
)

// AccessMethod is how an access attempt was made.
type AccessMethod string

const (
	AccessMethodFingerprint AccessMethod = "fingerprint" // Fingerprint
	AccessMethodNfc         AccessMethod = "nfc"         // NFC card or tag
	AccessMethodPin         AccessMethod = "pin"         // PIN code
	AccessMethodFace        AccessMethod = "face"        // Face recognition at the device
	AccessMethodApp         AccessMethod = "app"         // App on a phone
)

const accessAutoResetMs = 2000

// AccessAttempt holds the details of an access attempt, as the device reports them.
type AccessAttempt struct {
	// Method is how the attempt was made.
	Method AccessMethod
	// User is who made it, when the device knows.
	User string
}

// AccessTrigger is an access reader, such as a fingerprint or NFC reader on a
// doorbell or a keypad.
//
// Call Report for each attempt: result is set and goes back to empty after
// accessAutoResetMs, method and user stay until the next attempt.
type AccessTrigger struct {
	BaseSensor
	resultResetTimer *time.Timer
}

// NewAccessTrigger creates an access reader with the given name and options.
func NewAccessTrigger(name string, opts ...SensorOption) *AccessTrigger {
	s := &AccessTrigger{BaseSensor: NewBaseSensor(name, opts...)}
	s.writeState(map[string]any{AccessPropertyResult: "", AccessPropertyMethod: "", AccessPropertyUser: ""})
	return s
}

func (s *AccessTrigger) GetType() SensorType         { return SensorTypeAccess }
func (s *AccessTrigger) GetCategory() SensorCategory { return SensorCategoryTrigger }
func (s *AccessTrigger) ToJSON() sensorJSON          { return s.toBaseJSON(s.GetType(), s.GetCategory()) }

// GetResult returns the result of the attempt in progress, empty between attempts.
func (s *AccessTrigger) GetResult() AccessResult {
	v, _ := s.GetValue(AccessPropertyResult).(string)
	return AccessResult(v)
}

// GetMethod returns how the last attempt was made.
func (s *AccessTrigger) GetMethod() AccessMethod {
	v, _ := s.GetValue(AccessPropertyMethod).(string)
	return AccessMethod(v)
}

// GetUser returns who made the last attempt, empty when unknown.
func (s *AccessTrigger) GetUser() string {
	v, _ := s.GetValue(AccessPropertyUser).(string)
	return v
}

// Report reports an access attempt. An attempt while the last result is still
// set counts as a new one.
//
// Example:
//
//	reader.Report(sdk.AccessResultGranted, sdk.AccessAttempt{Method: sdk.AccessMethodFingerprint, User: "Anna"})
func (s *AccessTrigger) Report(result AccessResult, attempt AccessAttempt) {
	s.mu.Lock()
	if s.resultResetTimer != nil {
		s.resultResetTimer.Stop()
		s.resultResetTimer = nil
	}
	s.mu.Unlock()

	if s.GetResult() != "" {
		s.writeState(map[string]any{AccessPropertyResult: ""})
	}
	s.writeState(map[string]any{AccessPropertyMethod: string(attempt.Method), AccessPropertyUser: attempt.User})
	s.writeState(map[string]any{AccessPropertyResult: string(result)})

	timer := time.AfterFunc(time.Duration(accessAutoResetMs)*time.Millisecond, func() {
		s.mu.Lock()
		s.resultResetTimer = nil
		s.mu.Unlock()
		s.writeState(map[string]any{AccessPropertyResult: ""})
	})

	s.mu.Lock()
	s.resultResetTimer = timer
	s.mu.Unlock()
}

// UpdateValue ignores writes, attempts come from the device.
func (s *AccessTrigger) UpdateValue(string, any) error { return nil }

func (s *AccessTrigger) cleanup() {
	s.mu.Lock()
	if s.resultResetTimer != nil {
		s.resultResetTimer.Stop()
		s.resultResetTimer = nil
	}
	s.mu.Unlock()

	s.BaseSensor.cleanup()
}
