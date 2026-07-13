import { Subject } from '../observable/index.js';
import { isEqual } from '../internal/shared-utils.js';

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
import type { CapabilityUpdateFn, PropertyChangedEvent, PropertyChangeListener, PropertyUpdateFn, SensorJSON } from '../internal/sensor-rpc.js';

/** Union of all sensor-specific property enums */
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

/** Union of all sensor-specific capability enums */
export type SensorCapability = PTZCapability | LightCapability | SirenCapability | BatteryCapability;

/**
 * Type of sensor. Each maps to a smart-home concept (HomeKit service).
 * Plugins create sensors of these types and attach them to cameras.
 */
export enum SensorType {
  // Detection Sensors — analyze frames and report detections
  /** Video-based motion detection */
  Motion = 'motion',
  /** Object detection (person, vehicle, animal, etc.) */
  Object = 'object',
  /** Audio event detection (glass break, scream, etc.) */
  Audio = 'audio',
  /** Face detection and recognition */
  Face = 'face',
  /** License plate detection and OCR */
  LicensePlate = 'licensePlate',
  /** General-purpose image classifier */
  Classifier = 'classifier',
  /** CLIP embedding generation for semantic search */
  Clip = 'clip',

  // Sensors — read-only state/environment sensors
  /** Contact/open-close sensor (door, window) */
  Contact = 'contact',
  /** Temperature sensor (°C) */
  Temperature = 'temperature',
  /** Humidity sensor (0–100%) */
  Humidity = 'humidity',
  /** Occupancy/presence sensor */
  Occupancy = 'occupancy',
  /** Smoke detector */
  Smoke = 'smoke',
  /** Water leak detector */
  Leak = 'leak',

  // Controls — writable sensors the user can toggle from UI
  /** Light on/off and brightness control */
  Light = 'light',
  /** Siren on/off and volume control */
  Siren = 'siren',
  /** Generic on/off switch */
  Switch = 'switch',
  /** Lock/unlock control */
  Lock = 'lock',
  /** Pan-tilt-zoom camera control */
  PTZ = 'ptz',
  /** Security system arm/disarm control */
  SecuritySystem = 'securitySystem',
  /** Garage door opener */
  Garage = 'garage',

  // Triggers
  /** Doorbell ring trigger */
  Doorbell = 'doorbell',

  // Info
  /** Battery level and charging state */
  Battery = 'battery',
}

/**
 * Categorizes a sensor's role in the system.
 * Determines how the backend treats the sensor (read-only vs. controllable).
 */
export enum SensorCategory {
  /** Read-only detection sensor (motion, object, audio, etc.) */
  Sensor = 'sensor',
  /** Controllable sensor with set methods (light, siren, PTZ, etc.) */
  Control = 'control',
  /** Event trigger (doorbell ring) */
  Trigger = 'trigger',
  /** Informational read-only state (battery level) */
  Info = 'info',
}

/** Creates a discriminated union of property change events from a properties interface */
export type PropertyChangeOf<TProps> = {
  [K in keyof TProps & string]: { property: K; value: TProps[K]; timestamp: number };
}[keyof TProps & string];

/**
 * Read-only proxy interface for a sensor. This is what other plugins
 * and the backend see — use this type when consuming sensors, not creating them.
 *
 * All state-modifying methods (`setOn`, `reportDetections`, etc.) live on the
 * concrete sensor classes, not on `SensorLike`. Code that holds a `SensorLike`
 * reference can only READ state and observe changes.
 */
export interface SensorLike {
  readonly id: string;
  readonly type: SensorType;
  readonly name: string;
  readonly displayName: string;
  readonly pluginId?: string;
  readonly capabilities: string[];

  /** Get the current value of a sensor property */
  getValue(property: string): unknown;
  /** Get a read-only snapshot of all property values */
  getValues(): Readonly<Record<string, unknown>>;
  /**
   * Write a property generically. Cross-process bridges (e.g. HomeKit) bind
   * generic property names to UI characteristics and call this on a sensor
   * proxy — the proxy forwards via RPC to the owning sensor, where control
   * sensor classes (`Light`, `Siren`, etc.) override `updateValue` to dispatch
   * to the appropriate semantic method (`setOn`, `setActive`, ...). This means
   * plugin-side hardware-action overrides ARE honored end-to-end.
   *
   * Plugin authors **must not** call this — they should call the semantic
   * methods directly on the concrete sensor class.
   */
  updateValue(property: string, value: unknown): void | Promise<void>;
  /** Observable for property changes. Emits { property, value, timestamp } when any property changes. */
  readonly onPropertyChanged: Observable<{ property: string; value: unknown; timestamp: number }>;
  /** Observable for capability changes. Emits the full capabilities array when capabilities change. */
  readonly onCapabilitiesChanged: Observable<string[]>;
  hasCapability(capability: string): boolean;
}

/**
 * Abstract base class for all sensors. Plugins extend this (or use specialized
 * subclasses like `MotionSensor`, `LightControl`, etc.) to implement sensor logic.
 *
 * Properties are managed through a reactive proxy — setting a property via `this.props`
 * automatically notifies the backend and local listeners if the value changed.
 *
 * @template TProperties - Sensor-specific property interface (e.g., MotionSensorProperties)
 * @template TStorage - Persistent storage schema for per-sensor config
 * @template TCapability - Capability enum type (e.g., PTZCapability)
 */
export abstract class Sensor<TProperties extends object, TStorage extends object = Record<string, any>, TCapability extends string = string> implements SensorLike {
  abstract readonly type: SensorType;
  abstract readonly category: SensorCategory;

  readonly name: string;
  readonly id: string;

  private _cameraId?: string;
  private _pluginId?: string;
  private _propertiesStore: TProperties;

  private _listeners = new Set<PropertyChangeListener>();
  readonly #propertyChangedSubject = new Subject<PropertyChangeOf<TProperties>>();
  readonly onPropertyChanged: Observable<PropertyChangeOf<TProperties>> = this.#propertyChangedSubject.asObservable();
  readonly #capabilitiesChangedSubject = new Subject<TCapability[]>();
  readonly onCapabilitiesChanged: Observable<TCapability[]> = this.#capabilitiesChangedSubject.asObservable();

  /** Per-sensor persistent storage (available after sensor is added to a camera) */
  private _storage?: DeviceStorage<TStorage>;
  private _capabilities: TCapability[] = [];
  private _capabilitiesUpdateFn?: CapabilityUpdateFn;

  private _isAssigned = false;
  readonly #assignmentChangedSubject = new Subject<boolean>();
  readonly onAssignmentChanged: Observable<boolean> = this.#assignmentChangedSubject.asObservable();

  private _updateFn?: PropertyUpdateFn;

  private _displayName = '';

  /** Override to provide a JSON schema for per-sensor storage settings UI */
  get storageSchema(): JsonSchema[] {
    return [];
  }

  /*
   * @internal
   */
  _requiresFrames?: boolean;

  constructor(name: string) {
    this.id = crypto.randomUUID();
    this.name = name;

    // Initialize empty storage
    this._propertiesStore = {} as TProperties;
  }

  get displayName(): string {
    return this._displayName || this.name;
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

  /** Whether this sensor has been assigned to a camera in the backend */
  get isAssigned(): boolean {
    return this._isAssigned;
  }

  /** Camera ID this sensor belongs to. Throws if sensor not yet added to a camera. */
  get cameraId(): string {
    if (!this._cameraId) {
      throw new Error('Sensor not attached to camera. Call camera.addSensor() first.');
    }
    return this._cameraId;
  }

  get pluginId(): string | undefined {
    return this._pluginId;
  }

  /** Per-sensor persistent storage. Throws if sensor not yet added to a camera. */
  get storage(): DeviceStorage<TStorage> {
    if (!this._storage) {
      throw new Error('Storage not initialized - sensor not added to camera yet');
    }
    return this._storage;
  }

  /** Optional feature flags advertised by this sensor (e.g., PTZ pan/tilt/zoom) */
  get capabilities(): TCapability[] {
    return this._capabilities;
  }

  /** Set capabilities and notify the backend. Automatically deduplicates. */
  protected set capabilities(value: TCapability[]) {
    // Deduplicate capabilities
    this._capabilities = [...new Set(value)];
    // Broadcast to SensorController (for RPC propagation)
    this._capabilitiesUpdateFn?.(this._capabilities);
    // Notify local listeners
    this.#capabilitiesChangedSubject.next(this._capabilities);
  }

  /**
   * Read-only access to the internal property store. Subclasses use this to
   * read current state when implementing semantic methods (e.g., `if (this.blocked) return`).
   */
  protected get props(): Readonly<TProperties> {
    return this._propertiesStore;
  }

  /**
   * Get the current value of a sensor property. Type-safe via the generic
   * overload — call with a property enum value to get a properly typed result.
   */
  getValue<K extends keyof TProperties>(property: K): TProperties[K] | undefined;
  getValue(property: string): unknown;
  getValue(property: string): unknown {
    return this._propertiesStore[property as keyof TProperties];
  }

  /**
   * Get a read-only snapshot of all property values.
   *
   * @returns Frozen view of every property currently held by the sensor.
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
   * External-consumer entry point that satisfies the `SensorLike.updateValue`
   * contract. Each concrete sensor class implements this — read-only sensors
   * leave it as a no-op, control sensors dispatch known properties to the
   * appropriate semantic methods (`setOn`, `setActive`, `setTargetState`, etc.)
   * so plugin overrides drive hardware. Unknown / non-writable properties are
   * silently ignored.
   *
   * **Plugin authors must not call this** — they should call the semantic
   * methods directly on the concrete sensor class.
   */
  abstract updateValue(property: string, value: unknown): void | Promise<void>;

  /**
   * Iterates over the partial, writes changed properties to the store, fires a **single
   * batched** RPC update with the delta, and notifies local listeners per-property.
   *
   * Used by the semantic helper methods on each sensor type (`setOn`, `setLow`,
   * `reportDetections`, etc.) — **not for plugin authors**. Plugin code should
   * call the semantic helpers, not write state directly.
   *
   * One `_writeState` call → one `_updateFn` invocation. The receiver sees an
   * atomic state transition for this sensor.
   *
   * @param partial - Partial property delta to apply to the sensor's state store.
   *
   * @internal
   */
  protected _writeState(partial: Partial<TProperties>): void {
    const delta: Record<string, unknown> = {};
    const changes: { property: SensorPropertyType; value: unknown; previousValue: unknown }[] = [];

    for (const key of Object.keys(partial) as (keyof TProperties)[]) {
      const value = partial[key];
      if (value === undefined) continue;

      const previousValue = this._propertiesStore[key];
      // Only update if value changed (deep compare for objects/arrays)
      if (isEqual(previousValue, value, true)) continue;

      this._propertiesStore[key] = value;
      delta[key as string] = value;
      changes.push({ property: key as SensorPropertyType, value, previousValue });
    }

    if (Object.keys(delta).length === 0) return;

    // Fire-and-forget batched RPC update — one callback for the whole delta
    this._updateFn?.(delta);

    // Notify local listeners per-property (existing observable contract)
    for (const change of changes) {
      this._notifyListeners(change.property, change.value, change.previousValue);
    }
  }

  /**
   * Helper for `reportDetections(detected, detections?)` flows.
   *
   * - If `detected === false` → returns `[]` (clear).
   * - If `detected === true` and `detections` has items → returns them, substituting a full-frame box where missing.
   * - If `detected === true` and `detections` is missing/empty → returns a single
   *   synthesized full-frame detection with the given `fallbackLabel` and any
   *   `fallbackExtra` fields (used for type-specific properties like `attribute`,
   *   `plateText`, etc.).
   *
   * Generic over `T extends Detection` so each sensor's `reportDetections` can
   * use its specific Detection subtype.
   *
   * @param detected - Whether the caller is reporting an active detection.
   *
   * @param detections - Caller-provided detections (may be empty/undefined).
   *
   * @param fallbackLabel - Label used when synthesizing a fallback detection.
   *
   * @param fallbackExtra - Additional fields merged into the synthesized fallback.
   *
   * @returns Normalized detection list ready to write into the sensor's state.
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
      // Smart-camera plugins (Ring, Reolink, ...) report labels without
      // coordinates, while downstream consumers (detection coordinator, zone
      // matching) require a box on every detection — substitute full-frame.
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

  hasCapability(capability: string): boolean {
    return this._capabilities.includes(capability as TCapability);
  }

  /**
   * Serialize this sensor to a JSON-safe object for RPC transport.
   *
   * @returns The wire representation used to mirror the sensor across processes.
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
      cameraId: this.cameraId,
      pluginId: this.pluginId,
      properties: this._getProperties() as Record<string, unknown>,
      capabilities: this._capabilities,
      requiresFrames: this._requiresFrames,
    };
  }

  /**
   * Lifecycle hook: the sensor just became assigned to a camera. Override to
   * start background work that should only run while this sensor is live —
   * polling loops, event subscriptions, timers, external connections.
   *
   * Called AFTER `cameraId`, `storage`, and RPC channels are wired up, so the
   * override can safely access `this.cameraId`, `this.storage`, and publish
   * properties via the semantic helper methods.
   *
   * Errors thrown here are caught and logged — they will NOT break assignment
   * bookkeeping. If your work can fail, handle it inside the override.
   *
   * Paired 1:1 with `onDeassigned` — for every `onAssigned` call there is
   * exactly one matching `onDeassigned` later (on deassignment or cleanup).
   *
   * Default: no-op. Most sensors don't need lifecycle hooks.
   *
   * @example
   * ```ts
   * protected override async onAssigned(): Promise<void> {
   *   this._timer = setInterval(() => this.poll(), 5_000);
   * }
   * ```
   */
  protected onAssigned(): void | Promise<void> {}

  /**
   * Lifecycle hook: the sensor is being deassigned. Override to tear down
   * whatever was started in `onAssigned` — clear timers, close subscriptions,
   * release external resources.
   *
   * Always called exactly once for each prior `onAssigned`. Also called from
   * `_cleanup` if the sensor is being removed while still assigned, so you
   * can rely on this as the single teardown point.
   *
   * Default: no-op.
   *
   * @example
   * ```ts
   * protected override onDeassigned(): void {
   *   if (this._timer) clearInterval(this._timer);
   * }
   * ```
   */
  protected onDeassigned(): void | Promise<void> {}

  /**
   * @param updateFn - Receiver invoked with each batched property delta.
   *
   * @internal
   */
  _init(updateFn: PropertyUpdateFn): void {
    this._updateFn = updateFn;
  }

  /**
   * @param property - Property key to update on the internal store.
   *
   * @param value - New value to assign to the property.
   *
   * @internal
   */
  _setPropertyInternal<K extends keyof TProperties>(property: K, value: TProperties[K]): void {
    const previousValue = this._propertiesStore[property];
    // Deep compare for objects/arrays
    if (!isEqual(previousValue, value)) {
      this._propertiesStore[property] = value;
      // property is always a valid property enum value (K extends keyof TProperties)
      this._notifyListeners(property as SensorPropertyType, value, previousValue);
    }
  }

  /**
   * @returns A shallow copy of the sensor's current property store.
   *
   * @internal
   */
  _getProperties(): TProperties {
    return { ...this._propertiesStore };
  }

  /**
   * @param cameraId - ID of the camera the sensor has been attached to.
   *
   * @internal
   */
  _setCameraId(cameraId: string): void {
    this._cameraId = cameraId;
  }

  /**
   * @param pluginId - Plugin ID owning this sensor.
   *
   * @internal
   */
  _setPluginId(pluginId: string): void {
    this._pluginId = pluginId;
  }

  /**
   * @param storage - Per-sensor persistent storage handle.
   *
   * @internal
   */
  _setStorage(storage: DeviceStorage<TStorage>): void {
    this._storage = storage;
  }

  /**
   * @param updateFn - Receiver invoked with the deduplicated capability list when capabilities change.
   *
   * @internal
   */
  _initCapabilities(updateFn: CapabilityUpdateFn): void {
    this._capabilitiesUpdateFn = updateFn;
  }

  /**
   * @param assigned - True when the sensor is assigned to a camera, false when deassigned.
   *
   * @internal
   */
  _setAssigned(assigned: boolean): void {
    if (this._isAssigned === assigned) return;
    this._isAssigned = assigned;
    this.#assignmentChangedSubject.next(assigned);
    // Fire-and-forget the lifecycle hook. Plugin authors who need error
    // handling can wrap their onAssigned/onDeassigned body in try/catch.
    try {
      const result = assigned ? this.onAssigned() : this.onDeassigned();
      if (result && typeof result.catch === 'function') {
        result.catch(() => {
          // swallow — lifecycle errors must not break assignment bookkeeping
        });
      }
    } catch {
      // swallow synchronous errors for the same reason
    }
  }

  /**
   * @param property - Property name pushed by the backend.
   *
   * @param value - New value for the property.
   *
   * @internal
   */
  _onBackendPropertyChanged(property: string, value: unknown): void {
    // Update internal state (bypasses proxy to avoid re-broadcast)
    this._setPropertyInternal(property as keyof TProperties, value as TProperties[keyof TProperties]);
  }

  /**
   * @internal
   */
  _cleanup(): void {
    // Trigger onDeassigned if we're still assigned — guarantees the hook is
    // paired 1:1 even when the sensor is force-removed without going through
    // a proper deassignment path.
    if (this._isAssigned) {
      this._isAssigned = false;
      try {
        const result = this.onDeassigned();
        if (result && typeof result.catch === 'function') {
          result.catch(() => {});
        }
      } catch {
        // swallow
      }
    }

    this._updateFn = undefined;
    this._capabilitiesUpdateFn = undefined;
    this._storage = undefined;
    this._listeners.clear();
    this.#propertyChangedSubject.complete();
    this.#capabilitiesChangedSubject.complete();
    this.#assignmentChangedSubject.complete();
  }

  private _notifyListeners(property: SensorPropertyType, value: unknown, previousValue: unknown): void {
    // Skip notification if sensor not yet attached to camera
    // (e.g., during constructor initialization)
    if (!this._cameraId) {
      return;
    }

    const event: PropertyChangedEvent = {
      cameraId: this._cameraId,
      sensorId: this.id,
      sensorType: this.type,
      property,
      value,
      previousValue,
      timestamp: Date.now(),
    };

    // Notify detailed listeners
    for (const listener of this._listeners) {
      try {
        listener(event);
      } catch {
        // Ignore listener errors
      }
    }

    // Notify via Observable subject
    this.#propertyChangedSubject.next({ property, value, timestamp: event.timestamp } as PropertyChangeOf<TProperties>);
  }
}
