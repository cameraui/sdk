package sdk

import (
	"context"
	"fmt"
	"io"
	"os"
	"time"

	rpc "github.com/cameraui/rpc/go"
)

type createDownloadWire struct {
	CreateDownloadOptions
	RemotePluginID string `msgpack:"remotePluginId,omitempty" json:"remotePluginId,omitempty"`
}

type createStreamDownloadWire struct {
	CreateStreamDownloadOptions
	RemotePluginID string `msgpack:"remotePluginId,omitempty" json:"remotePluginId,omitempty"`
}

type createPipeDownloadWire struct {
	CreatePipeDownloadOptions
	PluginID string `msgpack:"pluginId" json:"pluginId"`
	PipeID   string `msgpack:"pipeId" json:"pipeId"`
}

// PipeDownloadSource writes the bytes of a pipe download to w, as fast as the
// client reads them. ctx ends when the client is gone, a returned error fails
// the download.
type PipeDownloadSource func(ctx context.Context, w io.Writer) error

// DownloadManager provides token-based file downloads.
//
// Plugins register a file and get back a token URL. No JWT is involved, the
// token itself is the auth.
//
// Accessed via api.DownloadManager from within a plugin.
//
// Example:
//
//	tok, err := api.DownloadManager.CreateDownload(sdk.CreateDownloadOptions{
//	    FilePath: filepath.Join(api.StoragePath, "export.mp4"),
//	    Filename: "recording.mp4",
//	    MimeType: "video/mp4",
//	    TTLMs:    600000,
//	    Cleanup:  sdk.DownloadCleanupOnDownload,
//	})
type DownloadManager struct {
	proxy *rpc.Proxy
	pipes *pipeServer
}

func newDownloadManager(client *rpc.Client, pipes *pipeServer) *DownloadManager {
	ns := getDownloadManagerNamespaces()
	return &DownloadManager{
		proxy: client.CreateProxy(ns.DownloadManagerRPC),
		pipes: pipes,
	}
}

// CreateDownload registers a file for HTTP download and returns a
// token-based URL.
func (dm *DownloadManager) CreateDownload(options CreateDownloadOptions) (DownloadToken, error) {
	payload := createDownloadWire{CreateDownloadOptions: options, RemotePluginID: remotePluginID()}

	ctx := context.Background()
	result, err := dm.proxy.Invoke(ctx, "createDownload", payload)
	if err != nil {
		return DownloadToken{}, fmt.Errorf("createDownload: %w", err)
	}

	m, ok := result.(map[string]any)
	if !ok {
		return DownloadToken{}, fmt.Errorf("createDownload: unexpected result type %T", result)
	}

	return decodeDownloadToken(m), nil
}

// CreateStreamDownload registers a streaming file for progressive HTTP
// download. The file is tailed during writing; the marker file signals
// completion.
func (dm *DownloadManager) CreateStreamDownload(options *CreateStreamDownloadOptions) (DownloadToken, error) {
	payload := createStreamDownloadWire{CreateStreamDownloadOptions: *options, RemotePluginID: remotePluginID()}

	ctx := context.Background()
	result, err := dm.proxy.Invoke(ctx, "createStreamDownload", &payload)
	if err != nil {
		return DownloadToken{}, fmt.Errorf("createStreamDownload: %w", err)
	}

	m, ok := result.(map[string]any)
	if !ok {
		return DownloadToken{}, fmt.Errorf("createStreamDownload: unexpected result type %T", result)
	}

	return decodeDownloadToken(m), nil
}

// CreatePipeDownload registers a download whose bytes the plugin writes
// while the client receives them. Nothing is written to disk and one request
// gets the bytes: source runs once, when the client fetches the download.
//
// Example:
//
//	tok, err := api.DownloadManager.CreatePipeDownload(&sdk.CreatePipeDownloadOptions{
//	    Filename: "events.csv",
//	    MimeType: "text/csv",
//	}, func(ctx context.Context, w io.Writer) error {
//	    return writeRows(ctx, w)
//	})
func (dm *DownloadManager) CreatePipeDownload(options *CreatePipeDownloadOptions, source PipeDownloadSource) (DownloadToken, error) {
	ttl := defaultPipeTTL
	if options.TTLMs > 0 {
		ttl = time.Duration(options.TTLMs) * time.Millisecond
	}
	pipeID, err := dm.pipes.add(source, ttl)
	if err != nil {
		return DownloadToken{}, fmt.Errorf("createPipeDownload: %w", err)
	}

	payload := createPipeDownloadWire{CreatePipeDownloadOptions: *options, PluginID: os.Getenv("PLUGIN_ID"), PipeID: pipeID}

	ctx := context.Background()
	result, err := dm.proxy.Invoke(ctx, "createPipeDownload", &payload)
	if err != nil {
		dm.pipes.drop(pipeID)
		return DownloadToken{}, fmt.Errorf("createPipeDownload: %w", err)
	}

	m, ok := result.(map[string]any)
	if !ok {
		dm.pipes.drop(pipeID)
		return DownloadToken{}, fmt.Errorf("createPipeDownload: unexpected result type %T", result)
	}

	return decodeDownloadToken(m), nil
}

// DeleteDownload removes a download token and optionally deletes the
// underlying file.
func (dm *DownloadManager) DeleteDownload(token string) error {
	ctx := context.Background()
	_, err := dm.proxy.Invoke(ctx, "deleteDownload", token)
	if err != nil {
		return fmt.Errorf("deleteDownload: %w", err)
	}
	return nil
}

func remotePluginID() string {
	if os.Getenv("PLUGIN_REMOTE_MODE") == "" {
		return ""
	}
	return os.Getenv("PLUGIN_ID")
}

func decodeDownloadToken(m map[string]any) DownloadToken {
	token, _ := m["token"].(string)
	url, _ := m["url"].(string)
	publicURL, _ := m["publicUrl"].(string)
	expiresAtRaw, _ := m["expiresAt"].(int64)
	if expiresAtRaw == 0 {
		if f, ok := m["expiresAt"].(float64); ok {
			expiresAtRaw = int64(f)
		}
		if u, ok := m["expiresAt"].(uint64); ok {
			expiresAtRaw = int64(u)
		}
	}
	return DownloadToken{
		Token:     token,
		URL:       url,
		PublicURL: publicURL,
		ExpiresAt: expiresAtRaw,
	}
}
