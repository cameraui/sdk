package sdk

import (
	"bytes"
	"context"
	"crypto/rand"
	"errors"
	"io"
	"sync/atomic"
	"testing"
	"time"
)

func testPipes() *pipeServer {
	return &pipeServer{pipes: map[string]*pipe{}, lease: pipeLease}
}

func pull(t *testing.T, ps *pipeServer, ctx context.Context, source PipeDownloadSource) <-chan any {
	t.Helper()
	id, err := ps.add(source, time.Minute)
	if err != nil {
		t.Fatal(err)
	}
	out, err := ps.PullPipe(ctx, id)
	if err != nil {
		t.Fatal(err)
	}
	return out
}

func drain(t *testing.T, out <-chan any) (data []byte, sizes []int, failure string) {
	t.Helper()
	for value := range out {
		switch v := value.(type) {
		case []byte:
			data = append(data, v...)
			sizes = append(sizes, len(v))
		case pipeFailure:
			failure = v.Error
		default:
			t.Fatalf("unexpected value %T", value)
		}
	}
	return data, sizes, failure
}

func TestPipeDeliversTheBytesInOrder(t *testing.T) {
	want := make([]byte, 3*pipeChunkSize+12345)
	_, _ = rand.Read(want)

	out := pull(t, testPipes(), context.Background(), func(_ context.Context, w io.Writer) error {
		rest := want
		for size := 1; len(rest) > 0; size = size*3 + 7 {
			n := min(size, len(rest))
			if _, err := w.Write(rest[:n]); err != nil {
				return err
			}
			rest = rest[n:]
		}
		return nil
	})

	got, sizes, failure := drain(t, out)
	if failure != "" {
		t.Fatalf("failure %q", failure)
	}
	if !bytes.Equal(got, want) {
		t.Fatalf("got %d bytes, want %d, or the order differs", len(got), len(want))
	}
	for _, size := range sizes {
		if size > pipeChunkSize || size == 0 {
			t.Fatalf("chunk of %d bytes", size)
		}
	}
}

func TestPipeFillsWholeChunksForASlowReader(t *testing.T) {
	total := 8 * pipeChunkSize
	out := pull(t, testPipes(), context.Background(), func(_ context.Context, w io.Writer) error {
		block := make([]byte, 32*1024)
		for written := 0; written < total; written += len(block) {
			if _, err := w.Write(block); err != nil {
				return err
			}
		}
		return nil
	})

	// slower than the flush timer for the first chunks, faster for the rest
	var sizes []int
	for value := range out {
		sizes = append(sizes, len(value.([]byte)))
		if len(sizes) <= 3 {
			time.Sleep(pipeFlushDelay + 20*time.Millisecond)
		} else {
			time.Sleep(2 * time.Millisecond)
		}
	}
	if len(sizes) != 8 {
		t.Fatalf("%d chunks %v, want 8 full ones", len(sizes), sizes)
	}
}

func TestPipeSendsASlowSourceBeforeAChunkIsFull(t *testing.T) {
	release := make(chan struct{})
	defer close(release)
	out := pull(t, testPipes(), context.Background(), func(_ context.Context, w io.Writer) error {
		if _, err := w.Write([]byte("header")); err != nil {
			return err
		}
		<-release
		return nil
	})

	select {
	case value := <-out:
		if string(value.([]byte)) != "header" {
			t.Fatalf("got %q", value)
		}
	case <-time.After(20 * pipeFlushDelay):
		t.Fatal("the first bytes waited for a full chunk")
	}
}

func TestPipeHoldsTheSourceWhileNobodyReads(t *testing.T) {
	var accepted atomic.Int64
	ctx, cancel := context.WithCancel(context.Background())
	out := pull(t, testPipes(), ctx, func(_ context.Context, w io.Writer) error {
		block := make([]byte, 64*1024)
		for {
			n, err := w.Write(block)
			accepted.Add(int64(n))
			if err != nil {
				return err
			}
		}
	})

	time.Sleep(300 * time.Millisecond)
	if got := accepted.Load(); got > pipeChunkSize {
		t.Fatalf("the source wrote %d bytes without a reader, the chunk holds %d", got, pipeChunkSize)
	}
	cancel()
	drain(t, out)
}

func TestPipeEndsTheSourceWhenTheClientLeaves(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	ended := make(chan error, 1)
	out := pull(t, testPipes(), ctx, func(ctx context.Context, w io.Writer) error {
		block := make([]byte, pipeChunkSize)
		for {
			if _, err := w.Write(block); err != nil {
				ended <- err
				return err
			}
		}
	})

	<-out
	cancel()

	select {
	case err := <-ended:
		if !errors.Is(err, context.Canceled) {
			t.Fatalf("write ended with %v", err)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("the source kept writing after the client left")
	}
	if _, _, failure := drain(t, out); failure != "" {
		t.Fatalf("a client that left is no failure, got %q", failure)
	}
}

func TestPipeReportsAFailedSource(t *testing.T) {
	out := pull(t, testPipes(), context.Background(), func(_ context.Context, w io.Writer) error {
		_, _ = w.Write([]byte("partial"))
		return errors.New("disk gone")
	})

	// the bytes it had not sent yet stay behind, a download that failed right away is no short file
	data, _, failure := drain(t, out)
	if len(data) != 0 {
		t.Fatalf("got %q before the failure", data)
	}
	if failure != "disk gone" {
		t.Fatalf("failure %q", failure)
	}
}

func TestPipeIsFetchedOnce(t *testing.T) {
	ps := testPipes()
	release := make(chan struct{})
	id, err := ps.add(func(_ context.Context, w io.Writer) error {
		<-release
		_, err := w.Write([]byte("x"))
		return err
	}, time.Minute)
	if err != nil {
		t.Fatal(err)
	}
	if ps.PipeState(id) == pipeGone {
		t.Fatal("a registered download is unknown")
	}

	out, err := ps.PullPipe(context.Background(), id)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := ps.PullPipe(context.Background(), id); err == nil {
		t.Fatal("a second fetch started the source again")
	}
	if ps.PipeState(id) == pipeGone {
		t.Fatal("a running download is unknown")
	}

	close(release)
	drain(t, out)
	if ps.PipeState(id) != pipeGone {
		t.Fatal("a finished download is still known")
	}
}

func TestPipeTellsWhetherItWaitsForThePull(t *testing.T) {
	ps := testPipes()
	write := make(chan int)
	id, err := ps.add(func(_ context.Context, w io.Writer) error {
		for size := range write {
			if _, err := w.Write(make([]byte, size)); err != nil {
				return err
			}
		}
		return errors.New("the source broke")
	}, time.Minute)
	if err != nil {
		t.Fatal(err)
	}
	state := func(want string) {
		t.Helper()
		deadline := time.Now().Add(2 * time.Second)
		for ps.PipeState(id) != want {
			if time.Now().After(deadline) {
				t.Fatalf("the download says %q, want %q", ps.PipeState(id), want)
			}
			time.Sleep(time.Millisecond)
		}
	}

	state(pipeWriting)
	out, err := ps.PullPipe(context.Background(), id)
	if err != nil {
		t.Fatal(err)
	}
	time.Sleep(2 * pipeFlushDelay)
	state(pipeWriting)

	// a full chunk and one the flush timer sends both wait for the pull
	for _, size := range []int{pipeChunkSize, 10} {
		write <- size
		state(pipeWaiting)
		if chunk := (<-out).([]byte); len(chunk) != size {
			t.Fatalf("pulled %d bytes, want %d", len(chunk), size)
		}
		state(pipeWriting)
	}

	close(write)
	state(pipeWaiting)
	if failure, ok := (<-out).(pipeFailure); !ok || failure.Error != "the source broke" {
		t.Fatalf("pulled %v, want the failure", failure)
	}
	state(pipeGone)
}

func TestPipeEndsASourceTheHostStoppedAskingAbout(t *testing.T) {
	ps := testPipes()
	ps.lease = 200 * time.Millisecond
	ended := make(chan error, 1)
	id, err := ps.add(func(_ context.Context, w io.Writer) error {
		var err error
		for err == nil {
			_, err = w.Write(make([]byte, pipeChunkSize))
		}
		ended <- err
		return err
	}, time.Minute)
	if err != nil {
		t.Fatal(err)
	}
	out, err := ps.PullPipe(context.Background(), id)
	if err != nil {
		t.Fatal(err)
	}

	// pulls and questions both keep it
	for range 4 {
		time.Sleep(ps.lease / 2)
		<-out
	}
	for range 4 {
		time.Sleep(ps.lease / 2)
		if got := ps.PipeState(id); got != pipeWaiting {
			t.Fatalf("a download the host asks about says %q", got)
		}
	}
	select {
	case err := <-ended:
		t.Fatalf("the source ended with %v while the host still asked", err)
	default:
	}

	select {
	case err := <-ended:
		if !errors.Is(err, errPipeAbandoned) {
			t.Fatalf("the source ended with %v", err)
		}
	case <-time.After(5 * ps.lease):
		t.Fatal("the source still waits for a host that is gone")
	}
	// the stream ends without waiting for another pull, nobody would send it
	deadline := time.Now().Add(2 * time.Second)
	for ps.PipeState(id) != pipeGone {
		if time.Now().After(deadline) {
			t.Fatal("the abandoned download is still known")
		}
		time.Sleep(time.Millisecond)
	}
}

func TestPipeExpiresUnfetched(t *testing.T) {
	ps := testPipes()
	id, err := ps.add(func(context.Context, io.Writer) error { return nil }, 20*time.Millisecond)
	if err != nil {
		t.Fatal(err)
	}

	deadline := time.Now().Add(2 * time.Second)
	for ps.PipeState(id) != pipeGone {
		if time.Now().After(deadline) {
			t.Fatal("an unfetched download stayed past its lifetime")
		}
		time.Sleep(5 * time.Millisecond)
	}
	if _, err := ps.PullPipe(context.Background(), id); err == nil {
		t.Fatal("an expired download could be fetched")
	}
}

func TestPipeKeepsARunningDownloadPastItsLifetime(t *testing.T) {
	ps := testPipes()
	release := make(chan struct{})
	id, err := ps.add(func(context.Context, io.Writer) error {
		<-release
		return nil
	}, 20*time.Millisecond)
	if err != nil {
		t.Fatal(err)
	}
	out, err := ps.PullPipe(context.Background(), id)
	if err != nil {
		t.Fatal(err)
	}

	time.Sleep(100 * time.Millisecond)
	if ps.PipeState(id) == pipeGone {
		t.Fatal("the lifetime ended a download that is being fetched")
	}
	close(release)
	drain(t, out)
}

func TestPipeRefusesWritesAfterTheSourceReturned(t *testing.T) {
	var leaked io.Writer
	out := pull(t, testPipes(), context.Background(), func(_ context.Context, w io.Writer) error {
		leaked = w
		return nil
	})
	drain(t, out)

	if _, err := leaked.Write([]byte("late")); !errors.Is(err, io.ErrClosedPipe) {
		t.Fatalf("a late write gave %v", err)
	}
}
