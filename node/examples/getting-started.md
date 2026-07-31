# Plugin Guide

A camera.ui plugin is a Node package the host loads at runtime to extend cameras with new capabilities — a detection model, a vendor camera integration, a notifier, a smart-home bridge. This guide is the single reference for shipping one. You should be comfortable with TypeScript and have the SDK installed (`npm install @camera.ui/sdk`).

## 1. Plugin anatomy

A plugin is a folder with two files the host expects:

- `contract.ts` — the manifest. A static object describing what the plugin is.
- `index.ts` — the runtime. A class extending `BasePlugin`, exported as `default`.

The minimal compilable plugin:

```ts
// contract.ts
import { PluginRole } from '@camera.ui/sdk';
import type { PluginContract } from '@camera.ui/sdk';

export const contract: PluginContract = {
  name: 'My Plugin',
  role: PluginRole.SensorProvider,
  provides: [],
  consumes: [],
  interfaces: [],
};

export default contract;
```

```ts
// index.ts
import { BasePlugin } from '@camera.ui/sdk';
import type { CameraDevice } from '@camera.ui/sdk';

export default class MyPlugin extends BasePlugin {
  async configureCameras(_cameras: CameraDevice[]): Promise<void> {}
  async onCameraAdded(_camera: CameraDevice): Promise<void> {}
  async onCameraReleased(_cameraId: string): Promise<void> {}
}
```

The host instantiates the class with three arguments: a `LoggerService`, a `PluginAPI`, and a typed `DeviceStorage`. Everything else — sensors, discovery, schemas — is opt-in.

## 2. The contract

`PluginContract` is the static manifest the host reads before starting the plugin. The fields:

- **`name`** — stable identifier; doubles as log prefix and storage namespace.
- **`role`** — what the plugin does at the highest level (see table below).
- **`provides`** — sensor types the plugin attaches to cameras (e.g. `[SensorType.Motion]`).
- **`consumes`** — sensor types the plugin reads from other plugins.
- **`interfaces`** — capability flags (`DiscoveryProvider`, `Notifier`, detection types, …).

| Role | Use when |
| --- | --- |
| `SensorProvider` | You add detection or smart-home sensors to existing cameras (motion plugin, classifier, contact sensor). |
| `CameraController` | You bring your own cameras and own their streams (RTSP, ONVIF, vendor SDK), but produce no sensors. |
| `CameraAndSensorProvider` | You bring your own cameras AND want to attach sensors to them. Most vendor integrations land here. |
| `Hub` | Cloud-service integration that owns its cameras end-to-end via a vendor account, OR a bridge plugin that consumes other plugins' sensors and forwards them to an external system (HomeKit, MQTT, automations) or implements a `Notifier`. |

Examples:

```ts
// Detection plugin attaching motion sensors
{ name: 'My Motion', role: PluginRole.SensorProvider,
  provides: [SensorType.Motion], consumes: [], interfaces: [PluginInterface.MotionDetection] }

// ONVIF-style integration with discovery
{ name: 'ACME Cameras', role: PluginRole.CameraAndSensorProvider,
  provides: [SensorType.Motion], consumes: [], interfaces: [PluginInterface.DiscoveryProvider] }

// HomeKit bridge consuming sensor state from other plugins
{ name: 'HomeKit Bridge', role: PluginRole.Hub,
  provides: [], consumes: [SensorType.Motion, SensorType.Doorbell], interfaces: [] }
```

The SDK also carries a plugin protocol level (`PROTOCOL_LEVEL`). The CLI stamps the level your plugin was built against into the bundle, and the server refuses to start a plugin whose level it does not support, telling the user whether the plugin or the server needs an update. You never set it yourself: rebuilding against the current SDK is all it takes.

## 3. The plugin class

`BasePlugin<TStorage>` is generic over your storage shape so `this.storage.values.X` is typed. Its constructor takes the three host-injected dependencies in order: `logger`, `api`, `storage`.

```ts
import { API_EVENT, BasePlugin } from '@camera.ui/sdk';
import type { CameraDevice, DeviceStorage, LoggerService, PluginAPI } from '@camera.ui/sdk';

interface MyStorage {
  pollIntervalSec: number;
}

export default class MyPlugin extends BasePlugin<MyStorage> {
  private state = new Map<string, MyCameraState>();

  constructor(logger: LoggerService, api: PluginAPI, storage: DeviceStorage<MyStorage>) {
    super(logger, api, storage);
    this.api.on(API_EVENT.SHUTDOWN, () => this.shutdown());
  }

  async configureCameras(cameras: CameraDevice[]): Promise<void> {
    for (const camera of cameras) await this.attach(camera);
  }

  async onCameraAdded(camera: CameraDevice): Promise<void> {
    await this.attach(camera);
  }

  async onCameraReleased(cameraId: string): Promise<void> {
    this.state.get(cameraId)?.dispose();
    this.state.delete(cameraId);
  }

  private async attach(_camera: CameraDevice): Promise<void> { /* ... */ }
  private shutdown(): void { /* drop timers, close sockets */ }
}
```

Things to internalize:

- `configureCameras` runs once at startup with the cameras already assigned to the plugin. A rejection aborts plugin startup.
- `onCameraAdded` runs whenever the user assigns a new camera at runtime. Set up the same per-camera state as `configureCameras`.
- `onCameraReleased` runs when a camera is removed or reassigned. Drop timers, close vendor sessions.
- A `Map<cameraId, X>` is the conventional pattern for per-camera state — cheap to look up, trivial to clean up.
- `API_EVENT.SHUTDOWN` fires when the host tears the plugin down (reload, server stop). Listeners must release everything synchronously enough for the host to stop the process. There is also `API_EVENT.FINISH_LAUNCHING`, fired once after `configureCameras` returns — useful for kicking off background work that should wait until the camera set is stable.

## 4. Sensors

A sensor is the smallest smart-home unit in camera.ui. Detection sensors push results from analyzing video; control sensors expose user-toggleable hardware (lights, sirens, locks); event sensors fire one-shot triggers (doorbell).

Every sensor is a persisted entity of its own. The plugin supplies the durable identity, everything else belongs to the user: camera assignments, display name and whether the sensor is exported to consumers. There are two ways to register one:

- **`camera.addSensor(sensor)`** — the sensor belongs to this camera's hardware (spotlight, siren, battery, PTZ). The host locks the assignment to the camera; users cannot re-assign it.
- **`api.sensorManager.addSensor(sensor)`** — standalone device (smart plug, hub, imported smart-home device). The user assigns it to zero or more cameras in the UI.

Either way, pass a `nativeId` (e.g. the upstream device id) in the constructor options so the host can reconcile the sensor across restarts by `(pluginId, nativeId)`. Without it, identity falls back to `(type, name)` and a rename creates a new sensor.

For detection, subclass the matching `*DetectorSensor` and implement the detect method. The host pushes one frame at the configured rate:

```ts
import { MotionDetectorSensor } from '@camera.ui/sdk';
import type { MotionResult, VideoFrameData } from '@camera.ui/sdk';

class MyMotionSensor extends MotionDetectorSensor {
  constructor() {
    super('My Motion');
  }

  async detectMotion(_frame: VideoFrameData): Promise<MotionResult> {
    // analyze frame.data, return detections
    return { detected: false, detections: [] };
  }
}
```

Then attach it from the plugin's `attach()` helper:

```ts
const sensor = new MyMotionSensor();
await camera.addSensor(sensor);
```

Other detector base classes follow the same shape but expect a batch (`frames: VideoFrameData[]`) and an abstract `modelSpec` getter: `ObjectDetectorSensor` (`detectObjects(frame)` — singular here), `FaceDetectorSensor.detectFaces(frames)`, `LicensePlateDetectorSensor.detectLicensePlates(frames)`, `AudioDetectorSensor.detectAudio(audio)`, `ClassifierDetectorSensor.detectClassifications(frames)`, `ClipDetectorSensor.detectEmbeddings(frames)`. Smart-home sensors expose semantic methods instead — e.g. `LightControl` gives you `setOn()` / `setOff()` / `setBrightness(value)`, `ContactSensor` gives you `setDetected(value)`, `DoorbellTrigger` gives you `trigger()`. You construct them, register them, and then call those methods when your hardware reports a change.

A standalone sensor works exactly the same, it just goes through the sensor manager instead of a camera:

```ts
import { LockControl } from '@camera.ui/sdk';

const lock = new LockControl('Front Door', { nativeId: 'lock.front_door' });
await api.sensorManager.addSensor(lock);
```

Every sensor also has a lifecycle pair: `onStart()` runs once the sensor is registered and its storage is ready — start pollers, subscriptions, timers there. `onStop()` is the counterpart and runs on removal, plugin shutdown and cleanup:

```ts
class PollingContact extends ContactSensor {
  private timer?: NodeJS.Timeout;

  protected override onStart(): void {
    this.timer = setInterval(() => this.poll(), 10_000);
  }

  protected override onStop(): void {
    clearInterval(this.timer);
  }
}
```

`removeSensor` only unregisters the runtime instance — the persisted entity stays and shows as disconnected until the user deletes it in the UI. The host removes camera-bound sensors automatically when a camera is released; your `onCameraReleased` hook just needs to drop your reference.

## 5. Storage and configuration schema

User-facing settings live in storage. Storage is split into two scopes — plugin-level and sensor-level — each with its own `storageSchema` getter that returns a JSON schema array. The host renders the schemas as form fields and persists the values; you read them via `storage.values.X`.

**Plugin-level** schemas appear on the plugin's settings page. Override the getter on your `BasePlugin` subclass.

```ts
override get storageSchema(): JsonSchema[] {
  return [
    {
      type: 'number',
      key: 'pollIntervalSec',
      title: 'Poll interval (seconds)',
      description: 'How often background work runs',
      defaultValue: 30,
      minimum: 5,
      maximum: 300,
      step: 5,
      store: true,
      required: true,
      onSet: async (newValue, oldValue) => {
        this.logger.log(`Poll interval ${oldValue} -> ${newValue}`);
        this.reschedule();
      },
    },
  ];
}
```

**Sensor-level** schemas appear on the camera detail page next to that one sensor. Override the getter on your `Sensor` subclass.

```ts
class ConfigurableMotion extends MotionDetectorSensor<{ sensitivity: number; mode: 'fast' | 'accurate' }> {
  override get storageSchema(): JsonSchema[] {
    return [
      {
        type: 'number',
        key: 'sensitivity',
        title: 'Sensitivity',
        description: 'Higher = trigger on smaller motion',
        defaultValue: 50,
        minimum: 0, maximum: 100, step: 1,
        store: true,
        onSet: async () => this.reconfigure(),
      },
      {
        type: 'string',
        key: 'mode',
        title: 'Mode',
        description: 'Trade-off between speed and accuracy',
        defaultValue: 'fast',
        enum: ['fast', 'accurate'],
        store: true,
      },
      {
        type: 'button',
        key: 'reset',
        title: 'Reset to defaults',
        description: 'Restore sensitivity / mode',
        color: 'danger',
        onSet: async () => {
          await this.storage.setValue('sensitivity', 50);
          await this.storage.setValue('mode', 'fast');
        },
      },
    ];
  }

  async detectMotion(_frame: VideoFrameData): Promise<MotionResult> {
    const sensitivity = this.storage.values.sensitivity;
    const _mode = this.storage.values.mode;
    void sensitivity;
    return { detected: false, detections: [] };
  }

  private reconfigure(): void { /* re-warm caches */ }
}
```

Field types:

- `number` — slider/input with optional `minimum`, `maximum`, `step`.
- `string` — text input; add `enum: [...]` for a dropdown, `format: 'password'` to mask, `format: 'image'` / `'qrCode'` for media display.
- `boolean` — toggle.
- `button` — fires `onSet()` on click; stores no value. Useful for actions like "Test connection" or "Reset".

`onSet(newValue, oldValue)` runs after the host has persisted the new value. Use it to re-warm caches, restart sessions, or anything else that depends on the changed setting. It's async, but the host doesn't block UI on it — keep work scoped to the plugin.

For the full schema reference (conditional visibility, submit handlers with toast feedback, array fields), see `src/storage/index.ts` in the SDK.

## 6. Optional interfaces

`BasePlugin` covers the lifecycle. Specific capabilities are unlocked by implementing one of the optional interfaces and listing it in `contract.interfaces`. The rest of this section shows each one with a working snippet.

### 6.1 DiscoveryProvider

Let users scan and adopt cameras. Three methods: `onDiscoverCameras` returns adoption candidates, `onGetCameraSettings` returns the schema for the adoption form, `onAdoptCamera` resolves the form values into a `CameraConfig` for the host to persist. Available only for camera-controlling roles (`CameraController`, `CameraAndSensorProvider`).

```ts
import { API_EVENT, BasePlugin } from '@camera.ui/sdk';
import type {
  CameraConfig, CameraDevice, DeviceStorage, DiscoveredCamera, DiscoveryProvider,
  JsonSchemaWithoutCallbacks, LoggerService, PluginAPI,
} from '@camera.ui/sdk';

interface FakeDevice { id: string; name: string; manufacturer: string; model: string; host: string; }
const FAKE_DEVICES: FakeDevice[] = [
  { id: 'fake-001', name: 'Front Door', manufacturer: 'ACME', model: 'X1', host: '192.0.2.10' },
];

export default class CameraProvider extends BasePlugin implements DiscoveryProvider {
  private cameras = new Map<string, CameraDevice>();

  constructor(logger: LoggerService, api: PluginAPI, storage: DeviceStorage) {
    super(logger, api, storage);
    this.api.on(API_EVENT.SHUTDOWN, () => this.cameras.clear());
  }

  async configureCameras(cameras: CameraDevice[]): Promise<void> {
    for (const c of cameras) this.cameras.set(c.id, c);
  }
  async onCameraAdded(camera: CameraDevice): Promise<void> { this.cameras.set(camera.id, camera); }
  async onCameraReleased(cameraId: string): Promise<void> { this.cameras.delete(cameraId); }

  async onDiscoverCameras(): Promise<DiscoveredCamera[]> {
    const adopted = new Set(Array.from(this.cameras.values()).map((c) => c.nativeId));
    return FAKE_DEVICES
      .filter((d) => !adopted.has(d.id))
      .map(({ id, name, manufacturer, model }) => ({ id, name, manufacturer, model }));
  }

  async onGetCameraSettings(_camera: DiscoveredCamera): Promise<JsonSchemaWithoutCallbacks[]> {
    return [
      { type: 'string', key: 'username', title: 'Username', description: '', required: true },
      { type: 'string', key: 'password', title: 'Password', description: '', format: 'password', required: true },
    ];
  }

  async onAdoptCamera(camera: DiscoveredCamera, settings: Record<string, unknown>): Promise<CameraConfig> {
    const device = FAKE_DEVICES.find((d) => d.id === camera.id);
    if (!device) throw new Error(`Unknown device: ${camera.id}`);
    const u = encodeURIComponent(String(settings.username ?? ''));
    const p = encodeURIComponent(String(settings.password ?? ''));
    return {
      name: device.name,
      nativeId: device.id,
      info: { manufacturer: device.manufacturer, model: device.model },
      sources: [{
        name: 'main',
        role: 'high-resolution',
        urls: [`rtsp://${u}:${p}@${device.host}/stream0`],
        useForSnapshot: true,
        hotMode: true,
        preload: true,
      }],
    };
  }
}
```

For asynchronous discovery (cloud OAuth callbacks, mDNS bursts), you can also push candidates directly into the UI without waiting for the next poll: `await api.deviceManager.pushDiscoveredCameras([...])`.

### 6.2 NotifierInterface

Register as a notification target so the host's `NotificationManager` can dispatch through you. The plugin owns its device list — the manager queries through these methods rather than maintaining a shared registry.

```ts
import { API_EVENT, BasePlugin } from '@camera.ui/sdk';
import type {
  CameraDevice, DeviceStorage, LoggerService, Notification,
  NotifierDevice, NotifierInterface, PluginAPI,
} from '@camera.ui/sdk';

export default class MyNotifier extends BasePlugin implements NotifierInterface {
  private devices: NotifierDevice[] = [];

  constructor(logger: LoggerService, api: PluginAPI, storage: DeviceStorage) {
    super(logger, api, storage);
    this.api.on(API_EVENT.SHUTDOWN, () => this.devices.splice(0));
  }

  async configureCameras(_cameras: CameraDevice[]): Promise<void> {}
  async onCameraAdded(_camera: CameraDevice): Promise<void> {}
  async onCameraReleased(_cameraId: string): Promise<void> {}

  async getDevices(ownerUserId: string): Promise<NotifierDevice[]> {
    return this.devices.filter((d) => d.ownerUserId === ownerUserId);
  }

  async getDevice(deviceId: string): Promise<NotifierDevice | null> {
    return this.devices.find((d) => d.id === deviceId) ?? null;
  }

  async sendNotification(deviceId: string, n: Notification): Promise<void> {
    const device = this.devices.find((d) => d.id === deviceId);
    if (!device?.active) return;
    this.logger.log(`[${device.name}] ${n.title}: ${n.body ?? ''}`);
  }

  async registerDevice(ownerUserId: string, input: Record<string, unknown>): Promise<NotifierDevice> {
    const device: NotifierDevice = {
      id: crypto.randomUUID(),
      ownerUserId,
      type: String(input.type ?? 'mobile'),
      name: String(input.name ?? 'Unnamed device'),
      active: true,
    };
    this.devices.push(device);
    return device;
  }

  async revokeDevice(deviceId: string): Promise<void> {
    const idx = this.devices.findIndex((d) => d.id === deviceId);
    if (idx >= 0) this.devices.splice(idx, 1);
  }

  async updateDevice(deviceId: string, patch: Record<string, unknown>): Promise<NotifierDevice | null> {
    const device = this.devices.find((d) => d.id === deviceId);
    if (!device) return null;
    if (typeof patch.name === 'string') device.name = patch.name;
    if (typeof patch.active === 'boolean') device.active = patch.active;
    return device;
  }
}
```

`Notification.tag` is a collapse key for dedup at both the manager and notifier level — multiple events with the same tag inside the throttle window collapse into one notification. `Notification.severity` is `'info' | 'warn' | 'error' | 'critical'`; map `critical` to whatever DND-bypass mechanism your platform offers.

### 6.3 Detection interfaces

The seven detection capabilities follow a single pattern. Each interface has:

- A required `test*` method invoked by the UI when the user uploads a clip/image and clicks "Test" — it accepts raw media bytes plus metadata and returns the same result shape the per-frame detector would.
- An optional pre-processed `detect*` method invoked by automations and benchmarks — it accepts already-decoded frames.
- An optional `*Settings()` method that returns a schema for the detection configuration UI.

All seven (`MotionDetectionInterface`, `ObjectDetectionInterface`, `AudioDetectionInterface`, `FaceDetectionInterface`, `LicensePlateDetectionInterface`, `ClassifierDetectionInterface`, `ClipDetectionInterface`) share that shape. `ClipDetectionInterface` additionally requires `getTextEmbedding(text)` for semantic search.

Motion as a worked example:

```ts
import type {
  MotionDetectionInterface, MotionDetectionPluginResponse,
  VideoFrameData, JsonSchema,
} from '@camera.ui/sdk';

export default class MotionPlugin extends BasePlugin implements MotionDetectionInterface {
  // ... lifecycle methods omitted ...

  async testMotionDetection(
    videoData: Buffer | Uint8Array,
    _config: Record<string, unknown>,
  ): Promise<MotionDetectionPluginResponse | undefined> {
    const detections = await this.runOnEncodedClip(videoData);
    return { detected: detections.length > 0, detections };
  }

  async detectMotion(
    frames: VideoFrameData[],
    _config?: Record<string, unknown>,
  ): Promise<MotionDetectionPluginResponse | undefined> {
    const detections = await this.runOnFrames(frames);
    return { detected: detections.length > 0, detections };
  }

  async motionDetectionSettings(): Promise<JsonSchema[] | undefined> {
    return [
      { type: 'number', key: 'minArea', title: 'Min area (%)', description: '',
        defaultValue: 1, minimum: 0, maximum: 100, step: 1, store: true },
    ];
  }

  private async runOnEncodedClip(_v: Buffer | Uint8Array): Promise<[]> { return []; }
  private async runOnFrames(_f: VideoFrameData[]): Promise<[]> { return []; }
}
```

The image-based detection interfaces (`ObjectDetectionInterface`, `FaceDetectionInterface`, `LicensePlateDetectionInterface`, `ClassifierDetectionInterface`, `ClipDetectionInterface`) take an extra `metadata: ImageMetadata` argument with `width` / `height`. The audio interface takes `metadata: AudioMetadata` with the `mimeType`. Otherwise the wiring is identical to the motion example above — add the matching `PluginInterface.X` flag to the contract and implement the `test*` / optional `detect*` / optional settings trio.

A detection plugin almost always implements both halves: the appropriate `*DetectorSensor` subclass (Section 4) for the live pipeline, AND the matching `*DetectionInterface` here for UI test dialogs and ad-hoc benchmarks.

## 7. Logging

`this.logger` is a `LoggerService`. The methods are `log`, `warn`, `error`, `success`, `debug`, `trace`, and `attention` — each accepts a list of arguments joined with spaces by the host. `debug` and `trace` are gated by host log level.

```ts
this.logger.log('Plugin started');
this.logger.success(`Connected to vendor cloud as ${user}`);
this.logger.warn('Falling back to substream');
this.logger.error('Adopt failed:', err);
```

Every `CameraDevice` exposes `camera.logger` — same interface, but the output is prefixed with the camera name. Prefer it over `this.logger` whenever the message is about a specific camera:

```ts
async onCameraAdded(camera: CameraDevice): Promise<void> {
  camera.logger.log('attached');
}
```

## 8. Consuming sensors from other plugins

Bridge plugins (HomeKit, MQTT, automations) don't look at cameras to find sensors — they receive a **consumable view**: every sensor whose type is listed in `contract.consumes` and that the user exported. The host delivers it through three optional `BasePlugin` hooks:

- `configureSensors(sensors)` — once at startup with the view known at that point.
- `onSensorAdded(sensor)` — a sensor entered the view at runtime: it was created, became exposed, or its type became consumable.
- `onSensorReleased(sensorId)` — a sensor permanently left the view: deleted or unexposed. Plugin connectivity does NOT fire this; watch `sensor.onConnectedChanged` for that.

Each sensor arrives as a `SensorLike`: a read-only view with `type`, `displayName`, `connected`, `assignedCameraIds`, `assignmentLocked`, plus `getValue()` / `getValues()` and the observables `onPropertyChanged`, `onConnectedChanged`, `onAssignmentChanged`. Consumers decide rendering purely from that data — e.g. a light with `assignmentLocked` is camera hardware, an unassigned contact sensor is a standalone device.

A complete Hub consumer that reacts to motion and doorbell state:

```ts
import { API_EVENT, BasePlugin, MotionProperty, SensorType } from '@camera.ui/sdk';
import type {
  CameraDevice, DeviceStorage, Disposable, LoggerService, PluginAPI, SensorLike,
} from '@camera.ui/sdk';

export default class HubConsumer extends BasePlugin {
  private subs = new Map<string, Disposable[]>();

  constructor(logger: LoggerService, api: PluginAPI, storage: DeviceStorage) {
    super(logger, api, storage);
    this.api.on(API_EVENT.SHUTDOWN, () => this.disposeAll());
  }

  async configureCameras(_cameras: CameraDevice[]): Promise<void> {}
  async onCameraAdded(_camera: CameraDevice): Promise<void> {}
  async onCameraReleased(_cameraId: string): Promise<void> {}

  async configureSensors(sensors: SensorLike[]): Promise<void> {
    for (const sensor of sensors) this.bind(sensor);
  }

  async onSensorAdded(sensor: SensorLike): Promise<void> {
    this.bind(sensor);
  }

  async onSensorReleased(sensorId: string): Promise<void> {
    for (const sub of this.subs.get(sensorId) ?? []) sub.dispose();
    this.subs.delete(sensorId);
  }

  private bind(sensor: SensorLike): void {
    const props = sensor.onPropertyChanged.subscribe(({ property, value }) => {
      if (sensor.type === SensorType.Motion && property === MotionProperty.Detected && value) {
        this.logger.log(`${sensor.displayName}: motion started`);
      }
    });

    const conn = sensor.onConnectedChanged.subscribe((connected) => {
      this.logger.log(`${sensor.displayName}: ${connected ? 'online' : 'offline'}`);
    });

    this.subs.set(sensor.id, [props, conn]);
  }

  private disposeAll(): void {
    for (const list of this.subs.values()) for (const sub of list) sub.dispose();
    this.subs.clear();
  }
}
```

Two things to notice:

- The bridge keeps one `Disposable[]` per sensor and disposes it in `onSensorReleased`. `subscribe()` keeps the subscription alive until you call `.dispose()`.
- The bind happens in both `configureSensors` AND `onSensorAdded` for sensors that show up after startup. Same shape as the camera lifecycle.

For direct plugin-to-plugin RPC (e.g. asking a face plugin to compute embeddings on demand), use `api.coreManager.connectToPlugin(name)`. It returns a typed proxy of the target plugin including any optional interfaces it implements:

```ts
const face = await this.api.coreManager.connectToPlugin('Face Plugin');
const result = await face?.testFaceDetection(jpegBytes, { width: 640, height: 480 }, {});
```

Use `api.coreManager.getPluginsByInterface(PluginInterface.FaceDetection)` to discover candidate plugins by capability rather than by name.
