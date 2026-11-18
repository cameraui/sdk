//go:build !windows

package sdk

import (
	"io"
	"os"
)

func hostStopInput() io.Reader {
	return os.Stdin
}
