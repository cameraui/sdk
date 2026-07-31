import { isEqual } from '../internal/shared-utils.js';
import { Subject } from '../observable/index.js';

import type { CapabilityUpdateFn, PropertyUpdateFn, SensorJSON } from '../internal/sensor-rpc.js';
import type { Observable } from '../observable/index.js';
import type { DeviceStorage, JsonSchema } from '../storage/index.js';
import type { AudioProperty } from './audio.js';
import type { BatteryCapability, BatteryProperty } from './battery.js';
import type { ContactProperty } from './contact.js';
import type { Detection } from './detection.js';
import type { DoorbellProperty } from './doorbell.js';
import type { FaceProperty } from './face.js';
import type { GarageProperty } from './garage.js';
import type { HumidityProperty } from './humidity.js';
import type { LeakProperty } from './leak.js';
import type { LicensePlateProperty } from './licensePlate.js';
import type { LightCapability, LightProperty } from './light.js';
import type { LockProperty } from './lock.js';
import type { MotionProperty } from './motion.js';
import type { ObjectProperty } from './object.js';
import type { OccupancyProperty } from './occupancy.js';
import type { PTZCapability, PTZProperty } from './ptz.js';
import type { SecuritySystemProperty } from './securitySystem.js';
import type { SirenCapability, SirenProperty } from './siren.js';
import type { SmokeProperty } from './smoke.js';
import type { SwitchProperty } from './switch.js';
import type { TemperatureProperty } from './temperature.js';

/** Union of all sensor-specific property enums. */
export type SensorPropertyType =
  | AudioProperty
  | BatteryProperty
  | ContactProperty
  | DoorbellProperty
  | FaceProperty
  | GarageProperty
  | HumidityProperty
  | LeakProperty
  | LicensePlateProperty
  | LightProperty
  | LockProperty
  | MotionProperty
  | ObjectProperty
  | OccupancyProperty
  | PTZProperty
  | SecuritySystemProperty
  | SirenProperty
  | SmokeProperty
  | SwitchProperty
  | TemperatureProperty;

/** Union of all sensor-specific capability enums. */
export type SensorCapability = PTZCapability | LightCapability | SirenCapability | BatteryCapability;

/**
 * Type of sensor. "Sensor" is camera.ui's umbrella term for the smallest
 * smart-home unit. It covers measuring devices and controllable ones alike. The concrete
 * classes carry the real meaning (`LightControl`, `MotionSensor`, ...).
 * Plugins create sensors of these types, either standalone via the sensor
 * manager or attached to a camera via `camera.addSensor()`.
 */
export enum SensorType {
  // detection sensors: analyze frames and report detections
  /** Video-based motion detection. */
  Motion = 'motion',
  /** Object detection (person, vehicle, animal, etc.). */
  Object = 'object',
  /** Audio event detection (glass break, scream, etc.). */
  Audio = 'audio',
  /** Face detection and recognition. */
  Face = 'face',
  /** License plate detection and OCR. */
  LicensePlate = 'licensePlate',
  /** General-purpose image classifier. */
  Classifier = 'classifier',
  /** CLIP embedding generation for semantic search. */
  Clip = 'clip',
  /** Locates objects in a frame so secondary detectors get real crops from camera-side detections. */
  ObjectAssist = 'objectAssist',

  // sensors: read-only state and environment
  /** Contact/open-close sensor (door, window). */
  Contact = 'contact',
  /** Temperature sensor (°C). */
  Temperature = 'temperature',
  /** Humidity sensor (0-100%). */
  Humidity = 'humidity',
  /** Occupancy/presence sensor. */
  Occupancy = 'occupancy',
  /** Smoke detector. */
  Smoke = 'smoke',
  /** Water leak detector. */
  Leak = 'leak',

  // controls: writable sensors the user can toggle from the UI
  /** Light on/off and brightness control. */
  Light = 'light',
  /** Siren on/off and volume control. */
  Siren = 'siren',
  /** Generic on/off switch. */
  Switch = 'switch',
  /** Lock/unlock control. */
  Lock = 'lock',
  /** Pan-tilt-zoom camera control. */
  PTZ = 'ptz',
  /** Security system arm/disarm control. */
  SecuritySystem = 'securitySystem',
  /** Garage door opener. */
  Garage = 'garage',

  // triggers
  /** Doorbell ring trigger. */
  Doorbell = 'doorbell',

  // info
  /** Battery level and charging state. */
  Battery = 'battery',
}

/**
 * Categorizes a sensor's role in the system.
 * Determines how the backend treats the sensor (read-only vs. controllable).
 */
export enum SensorCategory {
  /** Read-only detection sensor (motion, object, audio, etc.). */
  Sensor = 'sensor',
  /** Controllable sensor with set methods (light, siren, PTZ, etc.). */
  Control = 'control',
  /** Event trigger (doorbell ring). */
  Trigger = 'trigger',
  /** Informational read-only state (battery level). */
  Info = 'info',
}

/** Creates a discriminated union of property change events from a properties interface. The timestamp is the origin time in ms. */
export type PropertyChangeOf<TProps> = {
  [K in keyof TProps & string]: { property: K; value: TProps[K]; timestamp: number };
}[keyof TProps & string];

/**
 * Read-only view of a sensor, as other plugins and the backend see it. Use this
 * type when consuming sensors, not when creating them.
 *
 * All state-modifying methods (`setOn`, `reportDetections`, etc.) live on the
 * concrete sensor classes, not on `SensorLike`. Code that holds a `SensorLike`
 * reference can only read state and observe changes.
 */
export interface SensorLike {
  readonly id: string;
  readonly type: SensorType;
  readonly name: string;
  readonly displayName: string;
  readonly nativeId?: string;
  readonly pluginId?: string;
  readonly capabilities: string[];
  readonly connected: boolean;
  readonly assignedCameraIds: readonly string[];
  readonly assignmentLocked: boolean;
  readonly onPropertyChanged: Observable<{ property: string; value: unknown; timestamp: number }>;
  readonly onCapabilitiesChanged: Observable<string[]>;
  readonly onConnectedChanged: Observable<boolean>;
  readonly onAssignmentChanged: Observable<readonly string[]>;

  /** Get the current value of a sensor property. */
  getValue(property: string): unknown;
  /** Get a read-only snapshot of all property values. */
  getValues(): Readonly<Record<string, unknown>>;
  /**
   * Generic property write used by cross-process bridges. The
   * owning sensor dispatches it to the matching semantic method, so plugin-side
   * hardware overrides still run. Plugin authors call the semantic methods
   * instead.
   */
  updateValue(property: string, value: unknown): void | Promise<void>;
  /** Whether the sensor advertises the given capability. */
  hasCapability(capability: string): boolean;
}

/**
 * Abstract base class for all sensors. Plugins extend this (or use specialized
 * subclasses like `MotionSensor`, `LightControl`, etc.) to implement sensor logic.
 *
 * Sensors are standalone entities: the plugin supplies the durable identity
 * (`nativeId`), everything else belongs to the user: camera assignments,
 * display name and whether the sensor is exported or not. A plugin
 * never decides where its sensor is used and never handles the export itself.
 *
 * State changes go through the semantic methods on the concrete class. Writing a
 * changed value notifies the backend and local listeners.
 *
 * The `id` is provisional until registration, when the host swaps in the
 * persistent entity id. Reading `storage` before registration throws. Override
 * `storageSchema` to return a JSON schema and get a per-sensor settings UI.
 *
 * @template TProperties - Sensor-specific property interface (e.g., MotionSensorProperties)
 * @template TStorage - Persistent storage schema for per-sensor config
 * @template TCapability - Capability enum type (e.g., PTZCapability)
 */
export abstract class Sensor<TProperties extends object, TStorage extends object = Record<string, any>, TCapability extends string = string> implements SensorLike {
  abstract readonly type: SensorType;
  abstract readonly category: SensorCategory;

  readonly name: string;

  /** @internal */
  _requiresFrames?: boolean;

  private _id: string;
  private _nativeId?: string;
  private _assignedCameraIds: string[] = [];
  private _assignmentLocked = false;
  private _pluginId?: string;
  private _propertiesStore: TProperties;
  private _registered = false;

  readonly #propertyChangedSubject = new Subject<PropertyChangeOf<TProperties>>();
  readonly onPropertyChanged: Observable<PropertyChangeOf<TProperties>> = this.#propertyChangedSubject.asObservable();
  readonly #capabilitiesChangedSubject = new Subject<TCapability[]>();
  readonly onCapabilitiesChanged: Observable<TCapability[]> = this.#capabilitiesChangedSubject.asObservable();

  private _storage?: DeviceStorage<TStorage>;
  private _capabilities: TCapability[] = [];
  private _capabilitiesUpdateFn?: CapabilityUpdateFn;

  private _active = false;
  readonly #assignmentChangedSubject = new Subject<readonly string[]>();
  readonly onAssignmentChanged: Observable<readonly string[]> = this.#assignmentChangedSubject.asObservable();
  readonly #connectedChangedSubject = new Subject<boolean>();
  readonly onConnectedChanged: Observable<boolean> = this.#connectedChangedSubject.asObservable();

  private _updateFn?: PropertyUpdateFn;

  private _displayName = '';

  constructor(name: string, options?: SensorOptions) {
    // provisional id, replaced by the host's persistent id at registration
    this._id = crypto.randomUUID();
    this.name = name;
    this._nativeId = options?.nativeId;
    this._propertiesStore = {} as TProperties;
  }

  get id(): string {
    return this._id;
  }

  get nativeId(): string | undefined {
    return this._nativeId;
  }

  get displayName(): string {
    return this._displayName || this.name;
  }

  get isAssigned(): boolean {
    return this._assignedCameraIds.length > 0;
  }

  get connected(): boolean {
    return this._registered;
  }

  get assignedCameraIds(): readonly string[] {
    return this._assignedCameraIds;
  }

  get assignmentLocked(): boolean {
    return this._assignmentLocked;
  }

  get pluginId(): string | undefined {
    return this._pluginId;
  }

  get storage(): DeviceStorage<TStorage> {
    if (!this._storage) {
      throw new Error('Storage not initialized - sensor not registered yet');
    }
    return this._storage;
  }

  get storageSchema(): JsonSchema[] {
    return [];
  }

  get capabilities(): TCapability[] {
    return this._capabilities;
  }

  /** Set capabilities, deduplicated, and notify backend plus local listeners. */
  protected set capabilities(value: TCapability[]) {
    this._capabilities = [...new Set(value)];
    this._capabilitiesUpdateFn?.(this._capabilities);
    this.#capabilitiesChangedSubject.next(this._capabilities);
  }

  /**
   * Set the display name (the only mutable identifier on a sensor).
   *
   * @param value - Human-readable label shown in the UI.
   *
   * @example
   * ```ts
   * sensor.setDisplayName('Front Door Motion');
   * ```
   */
  setDisplayName(value: string): void {
    this._displayName = value;
  }

  /**
   * Get the current value of a sensor property. Calling the generic overload
   * with a property enum value gives a properly typed result.
   */
  getValue<K extends keyof TProperties>(property: K): TProperties[K] | undefined;
  getValue(property: string): unknown;
  getValue(property: string): unknown {
    return this._propertiesStore[property as keyof TProperties];
  }

  /**
   * Get a read-only snapshot of all property values.
   *
   * @returns Shallow copy of every property currently held by the sensor.
   *
   * @example
   * ```ts
   * const snapshot = sensor.getValues();
   * console.log(snapshot);
   * ```
   */
  getValues(): Readonly<TProperties> {
    return { ...this._propertiesStore };
  }

  /**
   * Generic property write coming from a consumer. Read-only sensors implement
   * it as a no-op, control sensors dispatch known properties to their semantic
   * methods (`setOn`, `setActive`, `setTargetState`) so plugin overrides drive
   * hardware. Unknown or non-writable properties are ignored.
   *
   * Plugin authors call the semantic methods on the concrete class instead.
   */
  abstract updateValue(property: string, value: unknown): void | Promise<void>;

  /**
   * Check whether the sensor advertises a capability.
   *
   * @param capability - Capability flag to look for.
   *
   * @returns True if the sensor currently advertises it.
   *
   * @example
   * ```ts
   * const dimmable = sensor.hasCapability('brightness');
   * ```
   */
  hasCapability(capability: string): boolean {
    return this._capabilities.includes(capability as TCapability);
  }

  /**
   * Serialize this sensor to a JSON-safe object for RPC transport.
   *
   * @internal
   */
  toJSON(): SensorJSON {
    return {
      id: this.id,
      type: this.type,
      name: this.name,
      displayName: this.displayName,
      category: this.category,
      nativeId: this.nativeId,
      pluginId: this.pluginId,
      properties: this._getProperties() as Record<string, unknown>,
      capabilities: this._capabilities,
      requiresFrames: this._requiresFrames,
    };
  }

  /**
   * Wires up RPC propagation and marks the sensor registered.
   *
   * @internal
   */
  _init(updateFn: PropertyUpdateFn): void {
    this._updateFn = updateFn;
    this._registered = true;
  }

  /**
   * Writes a property without broadcasting it back over RPC.
   *
   * @internal
   */
  _setPropertyInternal<K extends keyof TProperties>(property: K, value: TProperties[K], timestamp?: number): void {
    const previousValue = this._propertiesStore[property];
    if (!isEqual(previousValue, value)) {
      this._propertiesStore[property] = value;
      this._notifyListeners(property as SensorPropertyType, value, timestamp);
    }
  }

  /**
   * Shallow copy of the sensor's current property store.
   *
   * @internal
   */
  _getProperties(): TProperties {
    return { ...this._propertiesStore };
  }

  /**
   * Replaces the provisional id with the host's persistent one.
   *
   * @internal
   */
  _setId(id: string): void {
    this._id = id;
  }

  /**
   * Applies the user's camera assignment and notifies subscribers.
   *
   * @internal
   */
  _setAssignedCameras(cameraIds: string[]): void {
    this._assignedCameraIds = [...cameraIds];
    this.#assignmentChangedSubject.next(this._assignedCameraIds);
  }

  /**
   * Marks the assignment as locked to one camera (camera.addSensor registration).
   *
   * @internal
   */
  _setAssignmentLocked(): void {
    this._assignmentLocked = true;
  }

  /**
   * Records the owning plugin.
   *
   * @internal
   */
  _setPluginId(pluginId: string): void {
    this._pluginId = pluginId;
  }

  /**
   * Attaches the per-sensor storage handle.
   *
   * @internal
   */
  _setStorage(storage: DeviceStorage<TStorage>): void {
    this._storage = storage;
  }

  /**
   * Wires capability changes to RPC propagation.
   *
   * @internal
   */
  _initCapabilities(updateFn: CapabilityUpdateFn): void {
    this._capabilitiesUpdateFn = updateFn;
  }

  /**
   * Flips the lifecycle state and runs the matching lifecycle hook.
   *
   * @internal
   */
  _setActive(active: boolean): void {
    if (this._active === active) return;
    this._active = active;
    this.#connectedChangedSubject.next(active);
    this.#runLifecycle(active);
  }

  /**
   * Applies a property change pushed by the backend, without re-broadcasting it.
   *
   * @internal
   */
  _onBackendPropertyChanged(property: string, value: unknown, timestamp?: number): void {
    this._setPropertyInternal(property as keyof TProperties, value as TProperties[keyof TProperties], timestamp);
  }

  /**
   * Tears the sensor down and detaches it from the host.
   *
   * @internal
   */
  _cleanup(): void {
    // pair onStop even when the sensor is force-removed without teardown
    if (this._active) {
      this._active = false;
      this.#runLifecycle(false);
    }

    this._updateFn = undefined;
    this._capabilitiesUpdateFn = undefined;
    this._storage = undefined;
    this._registered = false;
    this._assignedCameraIds = [];
    this.#propertyChangedSubject.complete();
    this.#capabilitiesChangedSubject.complete();
    this.#assignmentChangedSubject.complete();
    this.#connectedChangedSubject.complete();
  }

  protected get props(): Readonly<TProperties> {
    return this._propertiesStore;
  }

  /**
   * Writes changed properties to the store, fires one batched RPC update with
   * the delta and notifies local listeners per property. Used by the semantic
   * helpers on each sensor type, not by plugin code.
   *
   * @internal
   */
  protected _writeState(partial: Partial<TProperties>): void {
    const delta: Record<string, unknown> = {};
    const changes: { property: SensorPropertyType; value: unknown }[] = [];

    for (const key of Object.keys(partial) as (keyof TProperties)[]) {
      const value = partial[key];
      // no property is nullable, a null would be stored and rebroadcast as a real value
      if (value === undefined || value === null) continue;

      const previousValue = this._propertiesStore[key];
      if (isEqual(previousValue, value, true)) continue;

      this._propertiesStore[key] = value;
      delta[key as string] = value;
      changes.push({ property: key as SensorPropertyType, value });
    }

    if (Object.keys(delta).length === 0) return;

    this._updateFn?.(delta);

    for (const change of changes) {
      this._notifyListeners(change.property, change.value);
    }
  }

  /**
   * Normalizes the arguments of a `reportDetections(detected, detections?)` call.
   *
   * - `detected === false`: returns `[]` (clear).
   * - `detected === true` with detections: returns them, substituting a full-frame box where missing.
   * - `detected === true` without detections: returns one synthesized full-frame
   *   detection carrying `fallbackLabel` and `fallbackExtra`.
   *
   * @internal
   */
  protected _normalizeReportedDetections<T extends Detection>(
    detected: boolean,
    detections: T[] | undefined,
    fallbackLabel: T['label'],
    fallbackExtra?: Omit<T, 'label' | 'confidence' | 'box'>,
  ): T[] {
    if (!detected) return [];
    if (detections && detections.length > 0) {
      // smart-camera plugins report labels without coordinates, downstream
      // consumers (coordinator, zone matching) require a box on every detection
      return detections.map((detection) => (detection.box ? detection : { ...detection, box: { x: 0, y: 0, width: 1, height: 1 } }));
    }
    return [
      {
        label: fallbackLabel,
        confidence: 1,
        box: { x: 0, y: 0, width: 1, height: 1 },
        ...(fallbackExtra ?? {}),
      } as unknown as T,
    ];
  }

  /**
   * Lifecycle hook, called once the sensor is registered and live (storage and
   * RPC are wired up). Override it to start work whose lifetime matches the
   * sensor's: polling loops, event subscriptions, timers.
   *
   * Errors thrown here are swallowed, not logged. Handle failures inside the
   * override. Paired 1:1 with `onStop`, which runs on removal, plugin shutdown
   * or cleanup.
   *
   * @example
   * ```ts
   * protected override onStart(): void {
   *   this._timer = setInterval(() => this.poll(), 5_000);
   * }
   * ```
   */
  protected onStart(): void | Promise<void> {}

  /**
   * Counterpart of `onStart`: tear down whatever it started, such as timers,
   * subscriptions and external resources.
   *
   * @example
   * ```ts
   * protected override onStop(): void {
   *   if (this._timer) clearInterval(this._timer);
   * }
   * ```
   */
  protected onStop(): void | Promise<void> {}

  #runLifecycle(start: boolean): void {
    try {
      const result = start ? this.onStart() : this.onStop();
      if (result && typeof result.catch === 'function') {
        result.catch(() => {
          // swallow, lifecycle errors must not break bookkeeping
        });
      }
    } catch {
      // swallow, same reason
    }
  }

  private _notifyListeners(property: SensorPropertyType, value: unknown, timestamp?: number): void {
    // skip constructor-time writes, listeners only matter once registered
    if (!this._registered) {
      return;
    }

    this.#propertyChangedSubject.next({ property, value, timestamp: timestamp ?? Date.now() } as PropertyChangeOf<TProperties>);
  }
}

/** Options accepted by every sensor constructor. */
export interface SensorOptions {
  /**
   * Durable identity supplied by the plugin, e.g. an upstream device id. The
   * host reconciles the sensor across restarts by `(pluginId, nativeId)`;
   * without it, identity falls back to `(type, name)` and a rename creates a
   * new sensor.
   */
  nativeId?: string;
}
