package sdk

import (
	"fmt"
	"reflect"
	"sync"
	"time"

	rpc "github.com/cameraui/rpc/go"
)

var writeTimeout = 10 * time.Second

// writes a sensor accepts at once, the lane needs the next one to arrive while one runs
const writeConcurrency = 16

// a caller waits a little longer than the lane, so the lane's own answer arrives first
const writeCallMargin = 2 * time.Second

type valueWriter interface {
	applyValue(property string, value any) error
	isCommand(property string) bool
}

type laneWrite struct {
	property string
	apply    func() error
	deadline time.Time
	waiters  []chan error
}

type writeLane struct {
	mu      sync.Mutex
	queue   []*laneWrite
	running bool
}

func concurrentWrites() rpc.HandlerOption {
	return rpc.WithMethodConcurrency(map[string]int{"updateValue": writeConcurrency})
}

func (l *writeLane) write(property string, apply func() error, replaces bool) error {
	done := make(chan error, 1)
	write := &laneWrite{property: property, apply: apply, deadline: time.Now().Add(writeTimeout), waiters: []chan error{done}}

	l.mu.Lock()
	if replaces {
		for i, queued := range l.queue {
			if queued.property == property {
				// the replaced caller learns how the newer value went
				write.waiters = append(queued.waiters, write.waiters...)
				l.queue = append(l.queue[:i], l.queue[i+1:]...)
				break
			}
		}
	}
	l.queue = append(l.queue, write)
	start := !l.running
	l.running = true
	l.mu.Unlock()

	if start {
		go l.run()
	}
	return <-done
}

func (l *writeLane) run() {
	for {
		l.mu.Lock()
		if len(l.queue) == 0 {
			l.running = false
			l.mu.Unlock()
			return
		}
		write := l.queue[0]
		l.queue = l.queue[1:]
		l.mu.Unlock()

		err := applyWithin(write)
		for _, waiter := range write.waiters {
			waiter <- err
		}
	}
}

func applyWithin(write *laneWrite) error {
	left := time.Until(write.deadline)
	if left <= 0 {
		return noAnswer(write.property)
	}
	result := make(chan error, 1)
	// a device call that hangs keeps its goroutine, the lane goes on without it
	go func() {
		defer func() {
			if r := recover(); r != nil {
				result <- fmt.Errorf("%s: %v", write.property, r)
			}
		}()
		result <- write.apply()
	}()
	timer := time.NewTimer(left)
	defer timer.Stop()
	select {
	case err := <-result:
		return err
	case <-timer.C:
		return noAnswer(write.property)
	}
}

// a setter shadowed with another signature compiles, but no write ever reaches it
func checkShadowedSetters(outer Sensor, own valueWriter) error {
	if own == nil {
		return nil
	}
	ownType, outerType := reflect.TypeOf(own), reflect.TypeOf(outer)
	for i := range ownType.NumMethod() {
		method := ownType.Method(i)
		shadow, ok := outerType.MethodByName(method.Name)
		if ok && signature(method.Type) != signature(shadow.Type) {
			return fmt.Errorf("%s.%s is %s, the SDK calls it as %s", outerType, method.Name, signature(shadow.Type), signature(method.Type))
		}
	}
	return nil
}

// the method type without its receiver
func signature(method reflect.Type) string {
	in := make([]reflect.Type, 0, method.NumIn()-1)
	for i := 1; i < method.NumIn(); i++ {
		in = append(in, method.In(i))
	}
	out := make([]reflect.Type, 0, method.NumOut())
	for i := range method.NumOut() {
		out = append(out, method.Out(i))
	}
	return reflect.FuncOf(in, out, method.IsVariadic()).String()
}

func sourceReachable(state SensorSourceState) bool {
	return state != SensorSourceStateUnavailable && state != SensorSourceStateRemoved
}

func noAnswer(property string) error {
	return fmt.Errorf("no answer to %s within %d s", property, int(writeTimeout/time.Second))
}
