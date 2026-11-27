package sdk

import (
	"errors"
	"strings"
	"sync"
	"testing"
	"time"
)

type recordedWrites struct {
	mu  sync.Mutex
	ran []string
}

func (r *recordedWrites) apply(name string, gate <-chan struct{}) func() error {
	return func() error {
		r.mu.Lock()
		r.ran = append(r.ran, name)
		r.mu.Unlock()
		if gate != nil {
			<-gate
		}
		return nil
	}
}

func (r *recordedWrites) list() []string {
	r.mu.Lock()
	defer r.mu.Unlock()
	return append([]string(nil), r.ran...)
}

func queueBehindGate(lane *writeLane, rec *recordedWrites, writes ...func() error) (gate chan struct{}, results []chan error) {
	gate = make(chan struct{})
	results = make([]chan error, 0, len(writes)+1)
	first := make(chan error, 1)
	go func() { first <- lane.write("first", rec.apply("first", gate), true) }()
	waitFor(func() bool { return len(rec.list()) == 1 })
	results = append(results, first)
	for _, write := range writes {
		result := make(chan error, 1)
		go func() { result <- write() }()
		waitFor(func() bool {
			lane.mu.Lock()
			defer lane.mu.Unlock()
			return queuedWaiters(lane) == len(results)+1
		})
		results = append(results, result)
	}
	return gate, results
}

func queuedWaiters(lane *writeLane) int {
	count := 1
	for _, write := range lane.queue {
		count += len(write.waiters)
	}
	return count
}

func waitFor(ready func() bool) {
	for !ready() {
		time.Sleep(time.Millisecond)
	}
}

func collect(t *testing.T, results []chan error) {
	t.Helper()
	for _, result := range results {
		if err := <-result; err != nil {
			t.Fatal(err)
		}
	}
}

func TestWriteLaneRunsInArrivalOrderAndReplacesWaitingValues(t *testing.T) {
	lane := &writeLane{}
	rec := &recordedWrites{}
	gate, results := queueBehindGate(lane, rec,
		func() error { return lane.write("position", rec.apply("position 20", nil), true) },
		func() error { return lane.write("stop", rec.apply("stop", nil), true) },
		func() error { return lane.write("position", rec.apply("position 30", nil), true) },
	)
	close(gate)
	collect(t, results)

	if got := strings.Join(rec.list(), ", "); got != "first, stop, position 30" {
		t.Fatalf("ran %s", got)
	}
}

func TestWriteLaneRunsEveryCommand(t *testing.T) {
	lane := &writeLane{}
	rec := &recordedWrites{}
	gate, results := queueBehindGate(lane, rec,
		func() error { return lane.write("command", rec.apply("next", nil), false) },
		func() error { return lane.write("command", rec.apply("next", nil), false) },
	)
	close(gate)
	collect(t, results)

	if got := strings.Join(rec.list(), ", "); got != "first, next, next" {
		t.Fatalf("ran %s", got)
	}
}

func TestWriteLaneReturnsTheSetterErrorAndGoesOn(t *testing.T) {
	lane := &writeLane{}
	refused := errors.New("offline")
	if err := lane.write("on", func() error { return refused }, true); !errors.Is(err, refused) {
		t.Fatalf("err = %v", err)
	}
	if err := lane.write("mode", func() error { panic("unsupported") }, true); err == nil || !strings.Contains(err.Error(), "unsupported") {
		t.Fatalf("err = %v", err)
	}
	if err := lane.write("level", func() error { return nil }, true); err != nil {
		t.Fatal(err)
	}
}

func TestWriteLaneGivesUpOnAWriteWithoutAnAnswer(t *testing.T) {
	previous := writeTimeout
	writeTimeout = 100 * time.Millisecond
	t.Cleanup(func() { writeTimeout = previous })

	lane := &writeLane{}
	hanging := make(chan struct{})
	t.Cleanup(func() { close(hanging) })
	rec := &recordedWrites{}

	first := make(chan error, 1)
	go func() { first <- lane.write("a", rec.apply("a", hanging), true) }()
	waitFor(func() bool { return len(rec.list()) == 1 })
	// the deadline runs from the queueing, b still has half of it when a gives up
	time.Sleep(writeTimeout / 2)
	next := make(chan error, 1)
	go func() { next <- lane.write("b", rec.apply("b", nil), true) }()

	if err := <-first; err == nil || !strings.HasPrefix(err.Error(), "no answer to a") {
		t.Fatalf("err = %v", err)
	}
	if err := <-next; err != nil {
		t.Fatalf("the lane did not go on: %v", err)
	}
	if got := strings.Join(rec.list(), ", "); got != "a, b" {
		t.Fatalf("ran %s", got)
	}
}

type refusingLight struct {
	*LightControl
}

func (s *refusingLight) SetBrightness(int) error {
	return errors.New("bulb unreachable")
}

func TestUpdateValueReturnsTheSetterError(t *testing.T) {
	light := &refusingLight{LightControl: NewLightControl("Desk")}
	if err := light.setOuter(light); err != nil {
		t.Fatal(err)
	}

	if err := light.UpdateValue(LightPropertyBrightness, 40); err == nil || err.Error() != "bulb unreachable" {
		t.Fatalf("err = %v", err)
	}
	if got := light.GetBrightness(); got == 40 {
		t.Fatal("a refused brightness reached the state")
	}
}

type outdatedLight struct {
	*LightControl
}

func (s *outdatedLight) SetOn() {}

func TestRegistrationRefusesASetterWithAnOutdatedSignature(t *testing.T) {
	light := &outdatedLight{LightControl: NewLightControl("Desk")}

	err := light.setOuter(light)
	if err == nil || !strings.Contains(err.Error(), "SetOn is func(), the SDK calls it as func() error") {
		t.Fatalf("err = %v", err)
	}
}

func TestUpdateValueRefusesWhileTheSourceIsUnavailable(t *testing.T) {
	light := NewLightControl("Desk")
	if err := light.setOuter(light); err != nil {
		t.Fatal(err)
	}
	light.SetSourceState(SensorSourceStateUnavailable)

	if err := light.UpdateValue(LightPropertyBrightness, 40); err == nil || err.Error() != "Desk is not reachable" {
		t.Fatalf("err = %v", err)
	}
	light.SetSourceState(SensorSourceStateConnected)
	if err := light.UpdateValue(LightPropertyBrightness, 50); err != nil {
		t.Fatal(err)
	}
	if got := light.GetBrightness(); got != 50 {
		t.Fatalf("brightness = %d", got)
	}
}
