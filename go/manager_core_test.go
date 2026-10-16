package sdk

import (
	"testing"
	"time"

	rpc "github.com/cameraui/rpc/go"
)

func TestPluginInfoRunning(t *testing.T) {
	var running PluginInfo
	if err := decodePluginInfo(map[string]any{"id": "a", "name": "clip", "contract": map[string]any{}, "running": true}, &running); err != nil {
		t.Fatal(err)
	}
	if !running.Running || running.Name != "clip" {
		t.Fatalf("host payload with running: %+v", running)
	}

	var older PluginInfo
	if err := decodePluginInfo(map[string]any{"id": "a", "name": "clip", "contract": map[string]any{}}, &older); err != nil {
		t.Fatal(err)
	}
	if older.Running {
		t.Fatal("a payload without the key must read as not running")
	}

	encoded, err := rpc.Encode(PluginInfo{ID: "a", Name: "clip"})
	if err != nil {
		t.Fatal(err)
	}
	var wire map[string]any
	if err := rpc.Decode(encoded, &wire); err != nil {
		t.Fatal(err)
	}
	if _, ok := wire["running"]; ok {
		t.Fatalf("a stopped plugin must encode as before: %v", keysOf(wire))
	}
}

func TestPluginProxyWithOptions(t *testing.T) {
	var client *rpc.Client
	pp := &pluginProxy{proxy: client.CreateProxy("plugin.x.child.rpc")}

	probe := pp.WithOptions(PluginCallOptions{NoRetry: true, Timeout: time.Second})
	if probe == pp || probe.proxy == pp.proxy {
		t.Fatal("WithOptions must leave the cached proxy alone")
	}
	if probe.proxy.String() != pp.proxy.String() {
		t.Fatalf("probe = %s, want %s", probe.proxy, pp.proxy)
	}

	request := requestOptions(PluginCallOptions{NoRetry: true, Timeout: time.Second})
	if request.Timeout != time.Second {
		t.Fatalf("request = %+v", request)
	}
	if retry := request.NoResponderRetry; retry == nil || retry.MaxRetries >= 0 {
		t.Fatalf("NoRetry must turn the no-responder retry off: %+v", retry)
	}

	if retry := requestOptions(PluginCallOptions{Timeout: time.Second}).NoResponderRetry; retry != nil {
		t.Fatalf("without NoRetry the client retry stays: %+v", retry)
	}
}
