# Plugin Guide

A camera.ui plugin is a Python package the host loads at runtime to extend cameras with new capabilities — a detection model, a vendor camera integration, a notifier, a smart-home bridge. This guide is the single reference for shipping one. You should be comfortable with modern Python (3.11+) and have the SDK installed (`pip install camera-ui-sdk`).

## 1. Plugin anatomy

A plugin is a folder with two files the host expects:

- `contract.py` — the manifest. A static object describing what the plugin is.
- `main.py` — the runtime. A class extending `BasePlugin`, returned by a `__main__()` factory.

The minimal runnable plugin:

```python
# contract.py
from camera_ui_sdk import PluginContract, PluginRole

contract: PluginContract = {
    "name": "My Plugin",
    "role": PluginRole.SensorProvider,
    "provides": [],
    "consumes": [],
    "interfaces": [],
}
```

```python
# main.py
from camera_ui_sdk import BasePlugin, CameraDevice


class MyPlugin(BasePlugin):
    async def configureCameras(self, cameraDevices: list[CameraDevice]) -> None: ...
    async def onCameraAdded(self, camera: CameraDevice) -> None: ...
    async def onCameraReleased(self, cameraId: str) -> None: ...


def __main__() -> type[MyPlugin]:
    return MyPlugin
```

The host instantiates the class with three arguments: a `LoggerService`, a `PluginAPI`, and a typed `DeviceStorage`. Everything else — sensors, discovery, schemas — is opt-in.

## 2. The contract

`PluginContract` is the static manifest the host reads before starting the plugin. The fields:

- **`name`** — stable identifier; doubles as log prefix and storage namespace.
- **`role`** — what the plugin does at the highest level (see table below).
- **`provides`** — sensor types the plugin attaches to cameras (e.g. `[SensorType.Motion]`).
- **`consumes`** — sensor types the plugin reads from other plugins.
- **`interfaces`** — capability flags (`DiscoveryProvider`, `Notifier`, detection types, …).
- **`pythonVersion`** *(optional)* — `"3.11"` or `"3.12"`. The host picks a matching interpreter from its venv pool. Ignored by Node / Go plugins.
- **`dependencies`** *(optional)* — extra PyPI packages installed into the plugin's venv at adoption time.

| Role | Use when |
| --- | --- |
| `SensorProvider` | You add detection or smart-home sensors to existing cameras (motion plugin, classifier, contact sensor). |
| `CameraController` | You bring your own cameras and own their streams (RTSP, ONVIF, vendor SDK), but produce no sensors. |
| `CameraAndSensorProvider` | You bring your own cameras AND want to attach sensors to them. Most vendor integrations land here. |
| `Hub` | Cloud-service integration that owns its cameras end-to-end via a vendor account, OR a bridge plugin that consumes other plugins' sensors and forwards them to an external system (HomeKit, MQTT, automations) or implements a `Notifier`. |

Examples:

```python
from camera_ui_sdk import PluginInterface, PluginRole, SensorType

# Detection plugin attaching motion sensors
{
    "name": "My Motion",
    "role": PluginRole.SensorProvider,
    "provides": [SensorType.Motion],
    "consumes": [],
    "interfaces": [PluginInterface.MotionDetection],
}

# ONVIF-style integration with discovery
{
    "name": "ACME Cameras",
    "role": PluginRole.CameraAndSensorProvider,
    "provides": [SensorType.Motion],
    "consumes": [],
    "interfaces": [PluginInterface.DiscoveryProvider],
}

# HomeKit bridge consuming sensor state from other plugins
{
    "name": "HomeKit Bridge",
    "role": PluginRole.Hub,
    "provides": [],
    "consumes": [SensorType.Motion, SensorType.Doorbell],
    "interfaces": [],
}
```

## 3. The plugin class

`BasePlugin[StorageT]` is generic over your storage shape so `self.storage.values["X"]` is typed. Its constructor takes the three host-injected dependencies in order: `logger`, `api`, `storage`.

```python
from typing import TypedDict

from camera_ui_sdk import API_EVENT, BasePlugin, CameraDevice, DeviceStorage, LoggerService, PluginAPI


class MyStorage(TypedDict):
    pollIntervalSec: int


class MyPlugin(BasePlugin[MyStorage]):
    def __init__(self, logger: LoggerService, api: PluginAPI, storage: DeviceStorage[MyStorage]) -> None:
        super().__init__(logger, api, storage)
        self.state: dict[str, MyCameraState] = {}
        self.api.on(API_EVENT.SHUTDOWN, self._shutdown)

    async def configureCameras(self, cameraDevices: list[CameraDevice]) -> None:
        for camera in cameraDevices:
            await self._attach(camera)

    async def onCameraAdded(self, camera: CameraDevice) -> None:
        await self._attach(camera)

    async def onCameraReleased(self, cameraId: str) -> None:
        if state := self.state.pop(cameraId, None):
            state.dispose()

    async def _attach(self, camera: CameraDevice) -> None: ...
    def _shutdown(self) -> None: ...  # drop timers, close sockets
```

Things to internalize:

- `configureCameras` runs once at startup with the cameras already assigned to the plugin. A raised exception aborts plugin startup.
- `onCameraAdded` runs whenever the user assigns a new camera at runtime. Set up the same per-camera state as `configureCameras`.
- `onCameraReleased` runs when a camera is removed or reassigned. Drop timers, close vendor sessions.
- A `dict[str, X]` keyed by `camera.id` is the conventional pattern for per-camera state — cheap to look up, trivial to clean up.
- `API_EVENT.SHUTDOWN` fires when the host tears the plugin down (reload, server stop). Listeners must release everything synchronously enough for the host to stop the process. There is also `API_EVENT.FINISH_LAUNCHING`, fired once after `configureCameras` returns — useful for kicking off background work that should wait until the camera set is stable.

## 4. Adding sensors to cameras

A sensor is the unit of state the host (and other plugins) sees on a camera. Detection sensors push results from analyzing video; control sensors expose user-toggleable hardware (lights, sirens, locks); event sensors fire one-shot triggers (doorbell).

For detection, subclass the matching `*DetectorSensor` and implement the detect method. The host pushes one frame at the configured rate:

```python
from camera_ui_sdk import MotionDetectorSensor, MotionResult, VideoFrameData


class MyMotionSensor(MotionDetectorSensor):
    def __init__(self) -> None:
        super().__init__("My Motion")

    async def detectMotion(self, frame: VideoFrameData) -> MotionResult:
        # analyze frame["data"], return detections
        return {"detected": False, "detections": []}
```

Then attach it from the plugin's `_attach()` helper:

```python
sensor = MyMotionSensor()
await camera.addSensor(sensor)
```

Other detector base classes follow the same shape. `ObjectDetectorSensor.detectObjects(frame)` takes a single frame; `FaceDetectorSensor.detectFaces(frames)`, `LicensePlateDetectorSensor.detectLicensePlates(frames)`, `ClassifierDetectorSensor.detectClassifications(frames)`, `ClipDetectorSensor.detectEmbeddings(frames)` all take a batch (`list[VideoFrameData]`); `AudioDetectorSensor.detectAudio(audio)` takes one `AudioFrameData`. The frame-based detectors also expose an abstract `modelSpec` property — return the input dimensions and (for classifier) the trigger labels. Smart-home sensors expose semantic methods instead — `LightControl` gives you `setOn()` / `setOff()` / `setBrightness(value)`, `ContactSensor` gives you `setDetected(value)`, `DoorbellTrigger` gives you `trigger()`. You construct them, call `camera.addSensor`, and then call those methods when your hardware reports a change.

The host removes sensors automatically when a camera is released. Your `onCameraReleased` hook just needs to drop your reference to it.

## 5. Storage and configuration schema

User-facing settings live in storage. Storage is split into two scopes — plugin-level and sensor-level — each with its own `storage_schema` property that returns a list of JSON schema dicts. The host renders the schemas as form fields and persists the values; you read them via `self.storage.values["X"]` (or `await self.storage.getValue("X", default)`).

**Plugin-level** schemas appear on the plugin's settings page. Override the property on your `BasePlugin` subclass.

```python
from camera_ui_sdk import JsonSchema


class MyPlugin(BasePlugin[MyStorage]):
    @property
    def storage_schema(self) -> list[JsonSchema]:
        return [
            {
                "type": "number",
                "key": "pollIntervalSec",
                "title": "Poll interval (seconds)",
                "description": "How often background work runs",
                "defaultValue": 30,
                "minimum": 5,
                "maximum": 300,
                "step": 5,
                "store": True,
                "required": True,
                "onSet": self._on_interval_changed,
            },
        ]

    async def _on_interval_changed(self, new_value: object, old_value: object) -> None:
        self.logger.log(f"Poll interval {old_value} -> {new_value}")
        self._reschedule()
```

**Sensor-level** schemas appear on the camera detail page next to that one sensor. Override the property on your `Sensor` subclass.

```python
from typing import Literal, TypedDict

from camera_ui_sdk import JsonSchema, MotionDetectorSensor, MotionResult, VideoFrameData


class ConfigurableMotionStorage(TypedDict):
    sensitivity: int
    mode: Literal["fast", "accurate"]


class ConfigurableMotion(MotionDetectorSensor[ConfigurableMotionStorage]):
    @property
    def storage_schema(self) -> list[JsonSchema]:
        return [
            {
                "type": "number",
                "key": "sensitivity",
                "title": "Sensitivity",
                "description": "Higher = trigger on smaller motion",
                "defaultValue": 50,
                "minimum": 0, "maximum": 100, "step": 1,
                "store": True,
                "onSet": lambda *_: self._reconfigure(),
            },
            {
                "type": "string",
                "key": "mode",
                "title": "Mode",
                "description": "Trade-off between speed and accuracy",
                "defaultValue": "fast",
                "enum": ["fast", "accurate"],
                "store": True,
            },
            {
                "type": "button",
                "key": "reset",
                "title": "Reset to defaults",
                "description": "Restore sensitivity / mode",
                "color": "danger",
                "onSet": self._reset_defaults,
            },
        ]

    async def _reset_defaults(self) -> None:
        await self.storage.setValue("sensitivity", 50)
        await self.storage.setValue("mode", "fast")

    async def detectMotion(self, frame: VideoFrameData) -> MotionResult:
        sensitivity = self.storage.values.get("sensitivity", 50)
        _ = sensitivity
        return {"detected": False, "detections": []}

    def _reconfigure(self) -> None: ...  # re-warm caches
```

Field types:

- `number` — slider/input with optional `minimum`, `maximum`, `step`.
- `string` — text input; add `"enum": [...]` for a dropdown, `"format": "password"` to mask, `"format": "image"` / `"qrCode"` for media display.
- `boolean` — toggle.
- `button` — fires `onSet()` on click; stores no value. Useful for actions like "Test connection" or "Reset".

`onSet(new_value, old_value)` runs after the host has persisted the new value. Use it to re-warm caches, restart sessions, or anything else that depends on the changed setting. It can be sync or async, but the host doesn't block UI on it — keep work scoped to the plugin.

For the full schema reference (conditional visibility, submit handlers with toast feedback, array fields), see `camera_ui_sdk/storage/__init__.py` in the SDK.

## 6. Optional interfaces

`BasePlugin` covers the lifecycle. Specific capabilities are unlocked by implementing one of the optional interfaces and listing it in `contract["interfaces"]`. The rest of this section shows each one with a working snippet.

### 6.1 DiscoveryProvider

Let users scan and adopt cameras. Three methods: `onDiscoverCameras` returns adoption candidates, `onGetCameraSettings` returns the schema for the adoption form, `onAdoptCamera` resolves the form values into a `CameraConfig` for the host to persist. Available only for camera-controlling roles (`CameraController`, `CameraAndSensorProvider`).

```python
from urllib.parse import quote
from typing import TypedDict

from camera_ui_sdk import (
    API_EVENT, BasePlugin, CameraConfig, CameraDevice, DeviceStorage,
    DiscoveredCamera, DiscoveryProvider, JsonSchemaWithoutCallbacks,
    LoggerService, PluginAPI,
)


class FakeDevice(TypedDict):
    id: str
    name: str
    manufacturer: str
    model: str
    host: str


FAKE_DEVICES: list[FakeDevice] = [
    {"id": "fake-001", "name": "Front Door", "manufacturer": "ACME", "model": "X1", "host": "192.0.2.10"},
]


class CameraProvider(BasePlugin, DiscoveryProvider):
    def __init__(self, logger: LoggerService, api: PluginAPI, storage: DeviceStorage) -> None:
        super().__init__(logger, api, storage)
        self.cameras: dict[str, CameraDevice] = {}
        self.api.on(API_EVENT.SHUTDOWN, self._on_shutdown)

    async def configureCameras(self, cameraDevices: list[CameraDevice]) -> None:
        for c in cameraDevices:
            self.cameras[c.id] = c

    async def onCameraAdded(self, camera: CameraDevice) -> None:
        self.cameras[camera.id] = camera

    async def onCameraReleased(self, cameraId: str) -> None:
        self.cameras.pop(cameraId, None)

    def _on_shutdown(self) -> None:
        self.cameras.clear()

    async def onDiscoverCameras(self) -> list[DiscoveredCamera]:
        adopted = {c.nativeId for c in self.cameras.values()}
        return [
            {"id": d["id"], "name": d["name"], "manufacturer": d["manufacturer"], "model": d["model"]}
            for d in FAKE_DEVICES if d["id"] not in adopted
        ]

    async def onGetCameraSettings(self, camera: DiscoveredCamera) -> list[JsonSchemaWithoutCallbacks]:
        return [
            {"type": "string", "key": "username", "title": "Username", "description": "", "required": True},
            {"type": "string", "key": "password", "title": "Password", "description": "",
             "format": "password", "required": True},
        ]

    async def onAdoptCamera(self, camera: DiscoveredCamera, cameraSettings: dict[str, object]) -> CameraConfig:
        device = next((d for d in FAKE_DEVICES if d["id"] == camera["id"]), None)
        if device is None:
            raise ValueError(f"Unknown device: {camera['id']}")
        u = quote(str(cameraSettings.get("username", "")))
        p = quote(str(cameraSettings.get("password", "")))
        return {
            "name": device["name"],
            "nativeId": device["id"],
            "info": {"manufacturer": device["manufacturer"], "model": device["model"]},
            "sources": [{
                "name": "main",
                "role": "high-resolution",
                "urls": [f"rtsp://{u}:{p}@{device['host']}/stream0"],
                "useForSnapshot": True,
                "hotMode": True,
                "preload": True,
            }],
        }
```

For asynchronous discovery (cloud OAuth callbacks, mDNS bursts), you can also push candidates directly into the UI without waiting for the next poll: `await self.api.deviceManager.pushDiscoveredCameras([...])`.

### 6.2 NotifierInterface

Register as a notification target so the host's `NotificationManager` can dispatch through you. The plugin owns its device list — the manager queries through these methods rather than maintaining a shared registry.

```python
import uuid
from datetime import datetime, timezone
from typing import Any

from camera_ui_sdk import (
    API_EVENT, BasePlugin, CameraDevice, DeviceStorage, LoggerService,
    Notification, NotifierDevice, NotifierInterface, PluginAPI,
)


class MyNotifier(BasePlugin, NotifierInterface):
    def __init__(self, logger: LoggerService, api: PluginAPI, storage: DeviceStorage) -> None:
        super().__init__(logger, api, storage)
        self.devices: list[NotifierDevice] = []
        self.api.on(API_EVENT.SHUTDOWN, lambda: self.devices.clear())

    async def configureCameras(self, cameraDevices: list[CameraDevice]) -> None: ...
    async def onCameraAdded(self, camera: CameraDevice) -> None: ...
    async def onCameraReleased(self, cameraId: str) -> None: ...

    async def get_devices(self, owner_user_id: str) -> list[NotifierDevice]:
        return [d for d in self.devices if d["ownerUserId"] == owner_user_id]

    async def get_device(self, device_id: str) -> NotifierDevice | None:
        return next((d for d in self.devices if d["id"] == device_id), None)

    async def send_notification(self, device_id: str, n: Notification) -> None:
        device = next((d for d in self.devices if d["id"] == device_id), None)
        if not device or not device["active"]:
            return
        self.logger.log(f"[{device['name']}] {n['title']}: {n.get('body', '')}")

    async def register_device(self, owner_user_id: str, input: dict[str, Any]) -> NotifierDevice:
        device: NotifierDevice = {
            "id": str(uuid.uuid4()),
            "ownerUserId": owner_user_id,
            "type": str(input.get("type", "mobile")),
            "name": str(input.get("name", "Unnamed device")),
            "active": True,
        }
        self.devices.append(device)
        return device

    async def revoke_device(self, device_id: str) -> None:
        self.devices = [d for d in self.devices if d["id"] != device_id]

    async def update_device(self, device_id: str, patch: dict[str, Any]) -> NotifierDevice | None:
        device = next((d for d in self.devices if d["id"] == device_id), None)
        if device is None:
            return None
        if isinstance(patch.get("name"), str):
            device["name"] = patch["name"]
        if isinstance(patch.get("active"), bool):
            device["active"] = patch["active"]
        return device
```

`Notification.tag` is a collapse key (e.g. `"motion:cam-1"`). The host uses it to replace an older entry with the same tag in the in-app notification list. Delivery is not throttled: every publish reaches your notifier, so map the tag to a platform collapse-id if you want the same behavior on the device. `Notification.severity` is `Severity.Info | Warn | Error | Critical`; map `Critical` to whatever DND-bypass mechanism your platform offers.

Note: notifier methods are snake_case (`get_devices`, `send_notification`, …) — the rest of the SDK uses camelCase for parity with the Node and Go SDKs, but the notifier surface is intentionally Pythonic.

### 6.3 Detection interfaces

The seven detection capabilities follow a single pattern. Each interface has:

- A required `test*` method invoked by the UI when the user uploads a clip/image and clicks "Test" — it accepts raw media bytes plus metadata and returns the same result shape the per-frame detector would.
- An optional pre-processed `detect*` method invoked by automations and benchmarks — it accepts an already-decoded frame.
- An optional `*Settings()` method that returns a schema for the detection configuration UI.

All seven (`MotionDetectionInterface`, `ObjectDetectionInterface`, `AudioDetectionInterface`, `FaceDetectionInterface`, `LicensePlateDetectionInterface`, `ClassifierDetectionInterface`, `ClipDetectionInterface`) share that shape. `ClipDetectionInterface` additionally requires `getTextEmbedding(text)` for semantic search.

Motion as a worked example:

```python
from typing import Any

from camera_ui_sdk import (
    BasePlugin, JsonSchema, MotionDetectionInterface,
    MotionDetectionPluginResponse, VideoFrameData,
)


class MotionPlugin(BasePlugin, MotionDetectionInterface):
    # ... lifecycle methods omitted ...

    async def testMotionDetection(
        self, video_data: bytes, config: dict[str, Any],
    ) -> MotionDetectionPluginResponse | None:
        detections = await self._run_on_encoded_clip(video_data)
        return {"detected": len(detections) > 0, "detections": detections}

    async def detectMotion(
        self, frames: list[VideoFrameData], config: dict[str, Any] | None = None,
    ) -> MotionDetectionPluginResponse | None:
        detections = await self._run_on_frames(frames)
        return {"detected": len(detections) > 0, "detections": detections}

    async def motionDetectionSettings(self) -> list[JsonSchema] | None:
        return [
            {"type": "number", "key": "minArea", "title": "Min area (%)", "description": "",
             "defaultValue": 1, "minimum": 0, "maximum": 100, "step": 1, "store": True},
        ]

    async def _run_on_encoded_clip(self, v: bytes) -> list: return []
    async def _run_on_frames(self, f: list[VideoFrameData]) -> list: return []
```

The image-based detection interfaces (`ObjectDetectionInterface`, `FaceDetectionInterface`, `LicensePlateDetectionInterface`, `ClassifierDetectionInterface`, `ClipDetectionInterface`) take an extra `metadata: ImageMetadata` argument with `width` / `height` on the `test*` method. The audio interface takes `metadata: AudioMetadata` with the `mimeType`. Otherwise the wiring is identical to the motion example above — add the matching `PluginInterface.X` flag to the contract and implement the `test*` / optional `detect*` / optional settings trio.

A detection plugin almost always implements both halves: the appropriate `*DetectorSensor` subclass (Section 4) for the live pipeline, AND the matching `*DetectionInterface` here for UI test dialogs and ad-hoc benchmarks.

## 7. Logging

`self.logger` is a `LoggerService`. The methods are `log`, `warn`, `error`, `success`, `debug`, `trace`, and `attention` — each accepts a list of arguments joined with spaces by the host. `debug` and `trace` are gated by host log level.

```python
self.logger.log("Plugin started")
self.logger.success(f"Connected to vendor cloud as {user}")
self.logger.warn("Falling back to substream")
self.logger.error("Adopt failed:", err)
```

Every `CameraDevice` exposes `camera.logger` — same interface, but the output is prefixed with the camera name. Prefer it over `self.logger` whenever the message is about a specific camera:

```python
async def onCameraAdded(self, camera: CameraDevice) -> None:
    camera.logger.log("attached")
```

## 8. Inter-plugin communication

The cleanest way for one plugin to react to another's sensors is `camera.onSensorProperty(sensor_type, property, callback)`. It auto-subscribes when a sensor of the requested type appears (now or later), unsubscribes when it goes away, and tears down everything when you dispose the returned handle. The callback receives `(value, timestamp_ms, sensor)`. This is the pattern Hub plugins (HomeKit, automations) use.

A complete Hub consumer that listens to motion AND doorbell on every assigned camera:

```python
from typing import Any

from camera_ui_sdk import (
    API_EVENT, BasePlugin, CameraDevice, DeviceStorage, Disposable,
    LoggerService, PluginAPI, SensorLike, SensorType,
)


class HubConsumer(BasePlugin):
    def __init__(self, logger: LoggerService, api: PluginAPI, storage: DeviceStorage) -> None:
        super().__init__(logger, api, storage)
        self.subs: dict[str, list[Disposable]] = {}
        self.api.on(API_EVENT.SHUTDOWN, self._dispose_all)

    async def configureCameras(self, cameraDevices: list[CameraDevice]) -> None:
        for camera in cameraDevices:
            self._bind(camera)

    async def onCameraAdded(self, camera: CameraDevice) -> None:
        self._bind(camera)

    async def onCameraReleased(self, cameraId: str) -> None:
        for sub in self.subs.pop(cameraId, []):
            sub.dispose()

    def _bind(self, camera: CameraDevice) -> None:
        def on_motion(detected: Any, _ts: int, _sensor: SensorLike) -> None:
            if detected:
                camera.logger.log("motion started")

        def on_doorbell(ring: Any, _ts: int, _sensor: SensorLike) -> None:
            if ring:
                camera.logger.log("doorbell rang")

        motion = camera.onSensorProperty(SensorType.Motion, "detected", on_motion)
        doorbell = camera.onSensorProperty(SensorType.Doorbell, "ring", on_doorbell)
        self.subs[camera.id] = [motion, doorbell]

    def _dispose_all(self) -> None:
        for subs in self.subs.values():
            for sub in subs:
                sub.dispose()
        self.subs.clear()
```

Two things to notice:

- The bridge keeps one `list[Disposable]` per camera and disposes it in `onCameraReleased`. This is critical — `onSensorProperty` keeps an internal subscription alive until you call `.dispose()`.
- The bind happens in both `configureCameras` AND `onCameraAdded` for cameras that show up after startup. Same shape as for sensor-providing plugins.

For direct plugin-to-plugin RPC (e.g. asking a face plugin to compute embeddings on demand), use `api.coreManager.connectToPlugin(name)`. It returns a typed proxy of the target plugin including any optional interfaces it implements:

```python
face = await self.api.coreManager.connectToPlugin("Face Plugin")
if face is not None:
    result = await face.testFaceDetection(jpeg_bytes, {"width": 640, "height": 480}, {})
```

Use `await self.api.coreManager.getPluginsByInterface(PluginInterface.FaceDetection)` to discover candidate plugins by capability rather than by name.

## 9. Common pitfalls

- **Always release per-camera state in `onCameraReleased`.** Timers, vendor sessions, RTP sockets, `Disposable`s from `onSensorProperty` — drop them all. Leaking them keeps the camera object alive forever and prevents reassignment from working.
- **Don't block in `configureCameras`.** It runs on the host's startup path; a slow vendor handshake delays every other plugin. Do the network work in `API_EVENT.FINISH_LAUNCHING` instead.
- **Don't import from `camera_ui_sdk.internal`.** The `internal` subpackage exposes types the host uses to talk to plugins via RPC. The shapes there are not part of the stable public surface and may change without notice.
- **Don't construct sensors in `__init__`.** The host hasn't finished wiring up `api` / `storage` until `super().__init__()` returns and `configureCameras` is called. Construct sensors inside the lifecycle hooks.
- **Don't log frame data.** Detection paths run dozens of times per second per camera. Use `logger.debug` / `logger.trace` (host-gated) for anything per-frame, and prefer aggregated counters over per-event logs.

## 10. Next steps

For complete production plugins to read alongside this guide, see [`plugins/`](https://github.com/seydx/camera.ui/tree/main/plugins) in the camera.ui repo. They cover everything documented above — discovery, notifier, detection, hub bridges — wired into a real UI.

For the full module-by-module surface, browse the [API Reference](api/plugin.md) — it's auto-generated from the SDK source and stays in sync with whatever version of `camera-ui-sdk` you have installed.
