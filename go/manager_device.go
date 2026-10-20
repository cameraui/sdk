package sdk

import (
	"context"
	"fmt"
	"maps"
	"slices"
	"sync"

	rpc "github.com/cameraui/rpc/go"
)

// DiscoveredCamera is a camera found during discovery by a discovery provider plugin.
type DiscoveredCamera struct {
	// ID is the unique, stable identifier for this discovered camera (used for
	// deduplication).
	ID string `msgpack:"id" json:"id"`
	// Name is the display name shown in the UI adoption list.
	Name string `msgpack:"name" json:"name"`
	// Manufacturer is the camera manufacturer label (optional).
	Manufacturer string `msgpack:"manufacturer,omitempty" json:"manufacturer,omitempty"`
	// Model is the camera model label (optional).
	Model string `msgpack:"model,omitempty" json:"model,omitempty"`
	// Address is the network address (IP or hostname) shown in the UI to disambiguate same-model cameras.
	Address string `msgpack:"address,omitempty" json:"address,omitempty"`
}

// DeviceManager provides camera operations: push discovered cameras and get
// camera devices.
//
// Use GetCamera to retrieve a camera by ID or name, and PushDiscoveredCameras
// to surface cameras found during async discovery (e.g. after a cloud login).
//
// Accessed via api.DeviceManager from within a plugin.
type DeviceManager struct {
	client            *rpc.Client
	proxy             *rpc.Proxy
	api               *PluginAPI
	storageController *StorageController
	pluginInfo        PluginInfo
	logger            *Logger
	plugin            Plugin

	mu           sync.RWMutex
	devices      map[string]*CameraDevice
	configured   map[string]bool
	closeRequest func()
	eventMu      sync.Mutex
}

func newDeviceManager(client *rpc.Client, pluginInfo *PluginInfo, logger *Logger) *DeviceManager {
	ns := getDeviceManagerNamespaces()
	return &DeviceManager{
		client:     client,
		proxy:      client.CreateProxy(ns.DeviceManagerRPC),
		pluginInfo: *pluginInfo,
		logger:     logger,
		devices:    make(map[string]*CameraDevice),
		configured: make(map[string]bool),
	}
}

// GetCamera retrieves a camera by ID or name. Returns nil if no matching
// camera exists.
func (dm *DeviceManager) GetCamera(cameraIDOrName string) (*CameraDevice, error) {
	dm.mu.RLock()
	for _, dev := range dm.devices {
		if dev.ID() == cameraIDOrName || dev.Name() == cameraIDOrName {
			dm.mu.RUnlock()
			return dev, nil
		}
	}
	dm.mu.RUnlock()

	ctx := context.Background()
	result, err := dm.proxy.Invoke(ctx, "getCamera", cameraIDOrName, dm.pluginInfo.ID)
	if err != nil {
		return nil, fmt.Errorf("getCamera: %w", err)
	}

	if result == nil {
		return nil, nil
	}

	encoded, err := rpc.Encode(result)
	if err != nil {
		return nil, fmt.Errorf("getCamera encode: %w", err)
	}

	var cam Camera
	if err := rpc.Decode(encoded, &cam); err != nil {
		return nil, fmt.Errorf("getCamera decode: %w", err)
	}

	camLogger := dm.logger.CreateLogger(&loggerOptions{
		Suffix:     cam.Name,
		TargetID:   cam.ID,
		TargetType: "camera",
	})
	cameraDevice := newCameraDeviceProxy(dm.client, dm.api, dm.storageController, &cam, &dm.pluginInfo, camLogger)
	if err := cameraDevice.init(); err != nil {
		return nil, fmt.Errorf("init camera device: %w", err)
	}

	dm.mu.Lock()
	dm.devices[cam.ID] = cameraDevice
	dm.mu.Unlock()

	return cameraDevice, nil
}

// PushDiscoveredCameras pushes discovered cameras to the backend so the user
// can pick them in the UI without waiting for the next discovery poll. Use it
// when cameras are discovered asynchronously (e.g. after a cloud login or mDNS
// event). Only available for CameraController and CameraAndSensorProvider
// plugins.
func (dm *DeviceManager) PushDiscoveredCameras(cameras []DiscoveredCamera) error {
	ns := getDiscoveryManagerNamespaces()
	discoveryProxy := dm.client.CreateProxy(ns.DiscoveryManagerRPC)
	ctx := context.Background()
	_, err := discoveryProxy.Invoke(ctx, "pushDiscoveredCameras", dm.pluginInfo.ID, cameras)
	if err != nil {
		return fmt.Errorf("pushDiscoveredCameras: %w", err)
	}
	return nil
}

func (dm *DeviceManager) setAPI(api *PluginAPI, storageCtrl *StorageController) {
	dm.api = api
	dm.storageController = storageCtrl
}

func (dm *DeviceManager) setPlugin(plugin Plugin) {
	dm.plugin = plugin
}

func (dm *DeviceManager) configureCameras(cameras []*CameraDevice) {
	dm.mu.Lock()
	defer dm.mu.Unlock()
	for _, cam := range cameras {
		dm.devices[cam.ID()] = cam
		dm.configured[cam.ID()] = true
	}
}

func (dm *DeviceManager) reattach(cameras []Camera) error {
	dm.mu.RLock()
	devices := slices.Collect(maps.Values(dm.devices))
	dm.mu.RUnlock()
	for _, device := range devices {
		if err := device.reattach(); err != nil {
			return err
		}
	}

	dm.eventMu.Lock()
	defer dm.eventMu.Unlock()

	wanted := make(map[string]*Camera, len(cameras))
	for i := range cameras {
		wanted[cameras[i].ID] = &cameras[i]
	}
	dm.mu.RLock()
	var released []string
	for cameraID := range dm.configured {
		if wanted[cameraID] == nil {
			released = append(released, cameraID)
		}
	}
	var added []*Camera
	for cameraID, cam := range wanted {
		if !dm.configured[cameraID] {
			added = append(added, cam)
		}
	}
	dm.mu.RUnlock()

	for _, cameraID := range released {
		dm.releaseCamera(cameraID)
	}
	for _, cam := range added {
		dm.addCamera(cam)
	}
	return nil
}

func (dm *DeviceManager) init() error {
	ns := getPluginNamespaces(dm.pluginInfo.ID)

	cleanup, err := dm.client.OnRequest(ns.PluginDeviceManagerSubject, func(data []byte) (any, error) {
		var msg deviceManagerEventMessage
		// may be a CUIB frame when the host request carried large binaries
		if err := rpc.DecodeMessageInto(data, &msg); err != nil {
			return nil, err
		}

		dm.eventMu.Lock()
		defer dm.eventMu.Unlock()
		switch msg.Type {
		case "cameraAdded":
			dm.handleCameraAdded(msg)
		case "cameraReleased":
			dm.handleCameraReleased(msg)
		}

		return nil, nil
	})
	if err != nil {
		return err
	}
	dm.closeRequest = cleanup
	return nil
}

func (dm *DeviceManager) close() {
	if dm.closeRequest != nil {
		dm.closeRequest()
		dm.closeRequest = nil
	}

	// a device cleanup must never run while the manager mutex is held
	dm.mu.Lock()
	cleanups := make([]func(), 0, len(dm.devices))
	for _, device := range dm.devices {
		cleanups = append(cleanups, device.cleanup)
	}
	dm.devices = make(map[string]*CameraDevice)
	dm.configured = make(map[string]bool)
	dm.mu.Unlock()

	runTogether(cleanups)
}

func (dm *DeviceManager) handleCameraAdded(msg deviceManagerEventMessage) {
	if dm.plugin == nil {
		return
	}

	if msg.Data == nil {
		return
	}

	encoded, err := rpc.Encode(msg.Data)
	if err != nil {
		return
	}

	var addedData cameraAddedEventData
	if err := rpc.Decode(encoded, &addedData); err != nil {
		return
	}

	dm.addCamera(&addedData.Camera)
}

func (dm *DeviceManager) addCamera(cam *Camera) {
	dm.mu.Lock()
	_, exists := dm.devices[cam.ID]
	dm.configured[cam.ID] = true
	dm.mu.Unlock()

	if exists {
		return
	}

	camLogger := dm.logger.CreateLogger(&loggerOptions{
		Suffix:     cam.Name,
		TargetID:   cam.ID,
		TargetType: "camera",
	})
	cameraDevice := newCameraDeviceProxy(dm.client, dm.api, dm.storageController, cam, &dm.pluginInfo, camLogger)
	if err := cameraDevice.init(); err != nil {
		return
	}

	dm.mu.Lock()
	dm.devices[cam.ID] = cameraDevice
	dm.mu.Unlock()

	if err := dm.plugin.OnCameraAdded(cameraDevice); err != nil {
		dm.logger.Error("OnCameraAdded failed:", err)
	}
}

func (dm *DeviceManager) handleCameraReleased(msg deviceManagerEventMessage) {
	if dm.plugin == nil {
		return
	}

	if msg.Data == nil {
		return
	}

	encoded, err := rpc.Encode(msg.Data)
	if err != nil {
		return
	}

	var releasedData cameraReleasedEventData
	if err := rpc.Decode(encoded, &releasedData); err != nil {
		return
	}

	if releasedData.CameraID != "" {
		dm.releaseCamera(releasedData.CameraID)
	}
}

func (dm *DeviceManager) releaseCamera(cameraID string) {
	dm.mu.Lock()
	delete(dm.configured, cameraID)
	dm.mu.Unlock()

	if err := dm.plugin.OnCameraReleased(cameraID); err != nil {
		dm.logger.Error("OnCameraReleased failed:", err)
	}

	dm.mu.Lock()
	device, exists := dm.devices[cameraID]
	if exists {
		delete(dm.devices, cameraID)
	}
	dm.mu.Unlock()

	if device != nil {
		device.cleanup()
	}

	if dm.storageController != nil {
		dm.storageController.releaseCameraStorage(cameraID)
	}
}
