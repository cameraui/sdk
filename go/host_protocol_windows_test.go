package sdk

import (
	"bufio"
	"fmt"
	"io"
	"os"
	"os/exec"
	"strings"
	"testing"
	"time"
)

const stopWatcherChildEnv = "CAMERAUI_TEST_STOP_WATCHER_CHILD"

func TestStopWatcherLeavesThePipeFreeAndTakesTheStopLine(t *testing.T) {
	if os.Getenv(stopWatcherChildEnv) == "1" {
		runStopWatcherChild()
		return
	}
	stdin, out := startStopWatcherChild(t, "TestStopWatcherLeavesThePipeFreeAndTakesTheStopLine")
	if _, err := io.WriteString(stdin, `{"stop":{"budgetMs":1000}}`+"\n"); err != nil {
		t.Fatal(err)
	}
	expectLine(t, out, "stop 1s")
}

func TestStopWatcherStopsWhenTheHostClosesStdin(t *testing.T) {
	if os.Getenv(stopWatcherChildEnv) == "1" {
		runStopWatcherChild()
		return
	}
	stdin, out := startStopWatcherChild(t, "TestStopWatcherStopsWhenTheHostClosesStdin")
	if err := stdin.Close(); err != nil {
		t.Fatal(err)
	}
	expectLine(t, out, "stop 0s")
}

func startStopWatcherChild(t *testing.T, test string) (io.WriteCloser, *bufio.Reader) {
	t.Helper()
	cmd := exec.Command(os.Args[0], "-test.run=^"+test+"$")
	cmd.Env = append(os.Environ(), stopWatcherChildEnv+"=1", hostProtocolEnv+"=2")
	stdin, err := cmd.StdinPipe()
	if err != nil {
		t.Fatal(err)
	}
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		t.Fatal(err)
	}
	if err := cmd.Start(); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		_ = cmd.Process.Kill()
		_ = cmd.Wait()
	})
	out := bufio.NewReader(stdout)
	expectLine(t, out, "ready")
	return stdin, out
}

func expectLine(t *testing.T, out *bufio.Reader, want string) {
	t.Helper()
	line := make(chan string, 1)
	go func() {
		text, _ := out.ReadString('\n')
		line <- strings.TrimSpace(text)
	}()
	select {
	case got := <-line:
		if got != want {
			t.Fatalf("child said %q, want %q", got, want)
		}
	case <-time.After(10 * time.Second):
		t.Fatalf("child said nothing, want %q", want)
	}
}

func runStopWatcherChild() {
	watchHostStop(func(budget time.Duration) {
		fmt.Printf("stop %v\n", budget)
		os.Exit(0)
	})
	time.Sleep(300 * time.Millisecond)

	// a dll's c runtime peeks stdin like this while it loads
	probed := make(chan struct{})
	go func() {
		stdinAvailable()
		close(probed)
	}()
	select {
	case <-probed:
		fmt.Println("ready")
	case <-time.After(3 * time.Second):
		fmt.Println("stdin blocked")
		os.Exit(1)
	}
	time.Sleep(30 * time.Second)
}
