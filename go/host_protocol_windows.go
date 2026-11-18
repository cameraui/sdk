package sdk

import (
	"io"
	"os"
	"syscall"
	"time"
	"unsafe"
)

const stdinPollInterval = 200 * time.Millisecond

var peekNamedPipe = syscall.NewLazyDLL("kernel32.dll").NewProc("PeekNamedPipe")

type peekingStdin struct{}

func (peekingStdin) Read(p []byte) (int, error) {
	// a read waiting on the synchronous pipe blocks every other call on it, a dll peeking stdin while it loads hangs
	for {
		available, ok := stdinAvailable()
		if !ok {
			return 0, io.EOF
		}
		if available > 0 {
			return os.Stdin.Read(p[:min(len(p), available)])
		}
		time.Sleep(stdinPollInterval)
	}
}

func hostStopInput() io.Reader {
	return peekingStdin{}
}

func stdinAvailable() (int, bool) {
	var available uint32
	ok, _, _ := peekNamedPipe.Call(os.Stdin.Fd(), 0, 0, 0, uintptr(unsafe.Pointer(&available)), 0)
	return int(available), ok != 0
}
