import { isEqual } from '../internal/shared-utils.js';
import { Subject } from '../observable/index.js';

import type { CapabilityUpdateFn, PropertyUpdateFn, SensorDeviceState, SensorJSON, SensorMembership, SourceUpdateFn } from '../internal/sensor-rpc.js';
import type { Observable } from '../observable/index.js';
import type { DeviceStorage, JsonSchema } from '../storage/index.js';
import type { AccessProperty } from './access.js';
import type { AirQualityCapability, AirQualityProperty } from './airQuality.js';
import type { AudioProperty } from './audio.js';
import type { BatteryCapability, BatteryProperty } from './battery.js';
import type { ButtonProperty } from './button.js';
import type { CarbonDioxideProperty } from './carbonDioxide.js';
import type { CarbonMonoxideProperty } from './carbonMonoxide.js';
import type { ChimeCapability, ChimeProperty } from './chime.js';
import type { ClassifierProperty } from './classifier.js';
import type { ColdProperty } from './cold.js';
import type { ContactProperty } from './contact.js';
import type { Detection } from './detection.js';
import type { DeviceInfo, SensorDevice, SetDeviceInfoOptions } from './device.js';
import type { DisplayCapability, DisplayProperty } from './display.js';
import type { DoorbellProperty } from './doorbell.js';
import type { FaceProperty } from './face.js';
import type { GarageProperty } from './garage.js';
import type { GasProperty } from './gas.js';
import type { GlassBreakProperty } from './glassBreak.js';
import type { HeatProperty } from './heat.js';
import type { HumidityProperty } from './humidity.js';
import type { IlluminanceProperty } from './illuminance.js';
import type { LeakProperty } from './leak.js';
import type { LicensePlateProperty } from './licensePlate.js';
import type { LightCapability, LightProperty } from './light.js';
import type { LockProperty } from './lock.js';
import type { PropertySpecOverride, SensorPropertySpec } from './meta.js';
import type { MotionProperty } from './motion.js';
import type { ObjectProperty } from './object.js';
import type { OccupancyProperty } from './occupancy.js';
import type { PowerProperty } from './power.js';
import type { PresenceProperty } from './presence.js';
import type { ProblemProperty } from './problem.js';
import type { PTZCapability, PTZProperty } from './ptz.js';
import type { SecuritySystemProperty } from './securitySystem.js';
import type { SirenCapability, SirenProperty } from './siren.js';
import type { SmokeProperty } from './smoke.js';
import type { SwitchProperty } from './switch.js';
import type { TamperProperty } from './tamper.js';
import type { TemperatureProperty } from './temperature.js';
import type { VibrationProperty } from './vibration.js';

/** Union of all sensor-specific property enums. */
export type SensorPropertyType =
  | AccessProperty
  | AirQualityProperty
  | AudioProperty
  | BatteryProperty
  | ButtonProperty
  | CarbonDioxideProperty
  | CarbonMonoxideProperty
  | ChimeProperty
  | ClassifierProperty
  | ColdProperty
  | ContactProperty
  | DisplayProperty
  | DoorbellProperty
  | FaceProperty
  | GarageProperty
  | GasProperty
  | GlassBreakProperty
  | HeatProperty
  | HumidityProperty
  | IlluminanceProperty
  | LeakProperty
  | LicensePlateProperty
  | LightProperty
  | LockProperty
  | MotionProperty
  | ObjectProperty
  | OccupancyProperty
  | PTZProperty
  | PowerProperty
  | PresenceProperty
  | ProblemProperty
  | SecuritySystemProperty
  | SirenProperty
  | SmokeProperty
  | SwitchProperty
  | TamperProperty
  | TemperatureProperty
  | VibrationProperty;

/** Union of all sensor-specific capability enums. */
export type SensorCapability = PTZCapability | LightCapability | SirenCapability | BatteryCapability | AirQualityCapability | ChimeCapability | DisplayCapability;

/**
 * The plugin's view of the source behind an adopted sensor. `unavailable`
 * means wait (source unreachable, entity temporarily unavailable), `removed`
 * means the source reported the entity gone while it was reachable. Neither
 * deletes the sensor: an adopted sensor is deleted by the user only.
 */
export type SensorSourceState = 'connected' | 'unavailable' | 'removed';

/**
 * Type of sensor. "Sensor" is camera.ui's umbrella term for the smallest
 * smart-home unit. It covers measuring devices and controllable ones alike. The concrete
 * classes carry the real meaning (`LightControl`, `MotionSensor`, ...).
 * Plugins create sensors of these types, attached to a camera via
 * `camera.addSensor()` or handed back for an adopted record through
 * `SensorDiscoveryProvider`.
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
  /** Face embedding generation from a face crop, for recognition against enrolled faces. */
  FaceEmbedder = 'faceEmbedder',
  /** Appearance embedding of a person crop, to find the same person again without a face. */
  PersonEmbedder = 'personEmbedder',
  /** Outline of an object inside a crop, as a mask over its box. */
  Segmenter = 'segmenter',
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
  /** Occupancy sensor, whether someone is in a room. */
  Occupancy = 'occupancy',
  /** Smoke detector. */
  Smoke = 'smoke',
  /** Water leak detector. */
  Leak = 'leak',
  /** Gas detector. */
  Gas = 'gas',
  /** Carbon monoxide detector. */
  CarbonMonoxide = 'carbonMonoxide',
  /** Heat alarm. */
  Heat = 'heat',
  /** Cold alarm. */
  Cold = 'cold',
  /** Vibration sensor. */
  Vibration = 'vibration',
  /** Tamper sensor. */
  Tamper = 'tamper',
  /** Generic problem/fault sensor. */
  Problem = 'problem',
  /** Power detection sensor. */
  Power = 'power',
  /** Illuminance sensor (lx). */
  Illuminance = 'illuminance',
  /** Carbon dioxide sensor (ppm). */
  CarbonDioxide = 'carbonDioxide',
  /** Glass break detector. */
  GlassBreak = 'glassBreak',
  /** Air quality level with particle and gas readings. */
  AirQuality = 'airQuality',
  /** Whether a person is at home. */
  Presence = 'presence',

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
  /** Chime that plays tones. */
  Chime = 'chime',
  /** Text display on a device. */
  Display = 'display',

  // triggers
  /** Doorbell ring trigger. */
  Doorbell = 'doorbell',
  /** Button with single, double and long presses. */
  Button = 'button',
  /** Access reader, such as a fingerprint or NFC reader. */
  Access = 'access',

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

/** Creates a discriminated union of property change events from a properties interface. */
export type PropertyChangeOf<TProps> = {
  [K in keyof TProps & string]: {
    /** Name of the changed property. */
    property: K;
    /** New value of the property. */
    value: TProps[K];
    /** Origin timestamp in milliseconds since epoch. */
    timestamp: number;
  };
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
  /** Entity id of the sensor, provisional on a new sensor until registration. */
  readonly id: string;
  /** Type of the sensor, fixed per sensor class. */
  readonly type: SensorType;
  /** Name the plugin gave the sensor. */
  readonly name: string;
  /** Full name shown to the user: inside a device the device name plus `shortName`, otherwise the plugin's name until the user renames the sensor. */
  readonly displayName: string;
  /** Name inside its device, the same as `displayName` for a sensor without a device. */
  readonly shortName: string;
  /** Durable identity the plugin supplied, e.g. an upstream device id. */
  readonly nativeId?: string;
  /** Id of the plugin that owns the sensor, set at registration. */
  readonly pluginId?: string;
  /** Capabilities the sensor advertises. */
  readonly capabilities: string[];
  /** Whether the sensor is registered and its plugin is connected. */
  readonly connected: boolean;
  /** Ids of the cameras the user assigned the sensor to. */
  readonly assignedCameraIds: readonly string[];
  /** Whether the sensor is bound to the camera it was added to, so the user cannot assign it elsewhere. */
  readonly assignmentLocked: boolean;
  /** Device the sensor belongs to, `undefined` without one and for a camera's own sensor. */
  readonly deviceInfo?: SensorDevice;
  /** Whether the sensor is the main sensor of its device, called like the device when it stands alone. */
  readonly primary: boolean;
  /** Specs of the properties the plugin narrowed or described, resolved against the type's. A property without an entry follows its type's spec. */
  readonly propertySpecs: Readonly<Record<string, SensorPropertySpec>>;
  /** Emits on every property change. */
  readonly onPropertyChanged: Observable<{
    /** Name of the changed property. */
    property: string;
    /** New value of the property. */
    value: unknown;
    /** Origin timestamp in milliseconds since epoch. */
    timestamp: number;
  }>;
  /** Emits the full capability list whenever it changes. */
  readonly onCapabilitiesChanged: Observable<string[]>;
  /** Emits when the connected state changes. */
  readonly onConnectedChanged: Observable<boolean>;
  /** Emits the camera id list whenever the user changes the sensor's camera assignments. */
  readonly onAssignmentChanged: Observable<readonly string[]>;
  /** Emits the device whenever the sensor joins or leaves one, or its device, names or main-sensor role change. */
  readonly onDeviceInfoChanged: Observable<SensorDevice | undefined>;
  /** Emits the property specs whenever the plugin changes them. */
  readonly onPropertySpecsChanged: Observable<Readonly<Record<string, SensorPropertySpec>>>;

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
  /** Category of the sensor: detection sensor, control, trigger or info. */
  abstract readonly category: SensorCategory;

  readonly name: string;

  /** @internal */
  _requiresFrames?: boolean;

  private _id: string;
  private _nativeId?: string;
  private _origin?: string;
  private _sourceState?: SensorSourceState;
  private _address?: string;
  private _membership?: SensorMembership;
  private _device?: SensorDevice;
  private _shortName = '';
  private _primary = false;
  private _specOverrides: Record<string, PropertySpecOverride> = {};
  private _propertySpecs: Readonly<Record<string, SensorPropertySpec>> = {};
  private _sourceUpdateFn?: SourceUpdateFn;
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
  readonly #deviceInfoChangedSubject = new Subject<SensorDevice | undefined>();
  readonly onDeviceInfoChanged: Observable<SensorDevice | undefined> = this.#deviceInfoChangedSubject.asObservable();
  readonly #propertySpecsChangedSubject = new Subject<Readonly<Record<string, SensorPropertySpec>>>();
  readonly onPropertySpecsChanged: Observable<Readonly<Record<string, SensorPropertySpec>>> = this.#propertySpecsChangedSubject.asObservable();

  private _updateFn?: PropertyUpdateFn;

  private _displayName = '';

  constructor(name: string, options?: SensorOptions) {
    // provisional id, replaced by the host's persistent id at registration
    this._id = crypto.randomUUID();
    this.name = name;
    this._nativeId = options?.nativeId;
    this._origin = options?.origin;
    this._address = options?.address;
    if (options?.device) this._membership = { device: options.device, primary: options.primary ?? false };
    if (options?.propertySpecs) this._specOverrides = { ...options.propertySpecs };
    this._propertiesStore = {} as TProperties;
  }

  get id(): string {
    return this._id;
  }

  get nativeId(): string | undefined {
    return this._nativeId;
  }

  /** Source system the sensor was imported from, e.g. `'homeassistant'`. */
  get origin(): string | undefined {
    return this._origin;
  }

  /** State of the source behind an adopted sensor, as reported with `setSourceState()`. */
  get sourceState(): SensorSourceState | undefined {
    return this._sourceState;
  }

  /** Current address at the source, e.g. a Home Assistant entity id. Display only. */
  get address(): string | undefined {
    return this._address;
  }

  get displayName(): string {
    return this._displayName || this.name;
  }

  get shortName(): string {
    return this._shortName || this.displayName;
  }

  get deviceInfo(): SensorDevice | undefined {
    return this._device;
  }

  get primary(): boolean {
    return this._primary;
  }

  get propertySpecs(): Readonly<Record<string, SensorPropertySpec>> {
    return this._propertySpecs;
  }

  /** Whether the sensor is assigned to at least one camera. */
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

  /** Per-sensor storage. Throws before registration. */
  get storage(): DeviceStorage<TStorage> {
    if (!this._storage) {
      throw new Error('Storage not initialized - sensor not registered yet');
    }
    return this._storage;
  }

  /** JSON schema of the per-sensor settings. Override it to get a settings UI. */
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
   * Report what the source behind this sensor looks like right now. The host
   * shows the state with its reason on the sensors page and never deletes on
   * it. Only meaningful for adopted sensors.
   *
   * @param state - Current source state
   *
   * @example
   * ```typescript
   * sensor.setSourceState(registryHasEntity ? 'connected' : 'removed');
   * ```
   */
  setSourceState(state: SensorSourceState): void {
    if (this._sourceState === state) return;
    this._sourceState = state;
    this._sourceUpdateFn?.({ sourceState: state });
  }

  /**
   * Report the sensor's current address at the source, e.g. after a Home
   * Assistant entity was renamed. The identity (`nativeId`) stays.
   *
   * @param address - Current address at the source
   *
   * @example
   * ```typescript
   * sensor.setAddress(entry.entity_id);
   * ```
   */
  setAddress(address: string): void {
    if (this._address === address) return;
    this._address = address;
    this._sourceUpdateFn?.({ address });
  }

  /**
   * Put the sensor into a device, or take it out with `undefined`. Sensors of
   * this plugin that report the same `DeviceInfo.id` form one device. Pass the
   * device in the constructor options when it is known there, call this for
   * what changes later: a new firmware, a rename at the source. Only a change
   * reaches the host. Ignored for a sensor added with `camera.addSensor()`,
   * its camera is its device.
   *
   * @param device - Device at the source, `undefined` to leave the current one
   *
   * @param options - Whether this sensor is the device's main sensor
   *
   * @example
   * ```typescript
   * sensor.setDeviceInfo({ id: hub.serial, name: hub.name, manufacturer: 'Acme', firmware: hub.version }, { primary: true });
   * ```
   */
  setDeviceInfo(device: DeviceInfo | undefined, options?: SetDeviceInfoOptions): void {
    const membership: SensorMembership = { device: device ?? null, primary: options?.primary ?? false };
    if (isEqual(this._membership, membership)) return;
    this._membership = membership;
    this._sourceUpdateFn?.({ membership });
  }

  /**
   * Narrow or describe one property for this device: a range and step, the
   * enum values it supports, the choices it offers with their names, a text
   * limit. The host rejects a command outside it before it reaches the
   * plugin. Pass it in the constructor options when it is known there, call
   * this for what changes later. Only a change reaches the host.
   *
   * @param property - Property to describe
   *
   * @param spec - What the device accepts, `undefined` to follow the type's spec again
   *
   * @example
   * ```typescript
   * alarm.setPropertySpec(SecuritySystemProperty.TargetState, {
   *   values: [SecuritySystemState.AwayArm, SecuritySystemState.StayArm, SecuritySystemState.Disarmed],
   * });
   * ```
   */
  setPropertySpec<K extends keyof TProperties & string>(property: K, spec: PropertySpecOverride | undefined): void {
    const { [property]: current, ...rest } = this._specOverrides;
    if (isEqual(current, spec)) return;
    this._specOverrides = spec ? { ...rest, [property]: spec } : rest;
    this._sourceUpdateFn?.({ propertySpecs: this._specOverrides });
  }

  /** @internal */
  toJSON(): SensorJSON {
    return {
      id: this.id,
      type: this.type,
      name: this.name,
      displayName: this.displayName,
      category: this.category,
      nativeId: this.nativeId,
      origin: this._origin,
      pluginId: this.pluginId,
      properties: this._getProperties() as Record<string, unknown>,
      capabilities: this._capabilities,
      requiresFrames: this._requiresFrames,
      sourceState: this._sourceState,
      address: this._address,
      membership: this._membership,
      propertySpecs: this._specOverrides,
    };
  }

  /** @internal */
  _init(updateFn: PropertyUpdateFn): void {
    this._updateFn = updateFn;
    this._registered = true;
  }

  /** @internal */
  _setPropertyInternal<K extends keyof TProperties>(property: K, value: TProperties[K], timestamp?: number): void {
    const previousValue = this._propertiesStore[property];
    if (!isEqual(previousValue, value)) {
      this._propertiesStore[property] = value;
      this._notifyListeners(property as SensorPropertyType, value, timestamp);
    }
  }

  /** @internal */
  _getProperties(): TProperties {
    return { ...this._propertiesStore };
  }

  /** @internal */
  _setId(id: string): void {
    this._id = id;
  }

  /** @internal */
  _setAssignedCameras(cameraIds: string[]): void {
    this._assignedCameraIds = [...cameraIds];
    this.#assignmentChangedSubject.next(this._assignedCameraIds);
  }

  /** @internal */
  _setAssignmentLocked(): void {
    this._assignmentLocked = true;
  }

  /** @internal */
  _setPluginId(pluginId: string): void {
    this._pluginId = pluginId;
  }

  /** @internal */
  _setStorage(storage: DeviceStorage<TStorage>): void {
    this._storage = storage;
  }

  /** @internal */
  _initCapabilities(updateFn: CapabilityUpdateFn): void {
    this._capabilitiesUpdateFn = updateFn;
  }

  /** @internal */
  _initSource(updateFn: SourceUpdateFn): void {
    this._sourceUpdateFn = updateFn;
  }

  /** @internal */
  _applyDeviceState(state: SensorDeviceState): void {
    const changed =
      !isEqual(this._device, state.device) || this._shortName !== state.shortName || this._primary !== state.primary || this._displayName !== state.displayName;
    this._device = state.device;
    this._displayName = state.displayName;
    this._shortName = state.shortName;
    this._primary = state.primary;
    if (changed) this.#deviceInfoChangedSubject.next(state.device);
  }

  /** @internal */
  _applyPropertySpecs(specs: Record<string, SensorPropertySpec>): void {
    if (isEqual(this._propertySpecs, specs)) return;
    this._propertySpecs = specs;
    this.#propertySpecsChangedSubject.next(specs);
  }

  /** @internal */
  _setActive(active: boolean): void {
    if (this._active === active) return;
    this._active = active;
    this.#connectedChangedSubject.next(active);
    this.#runLifecycle(active);
  }

  /** @internal */
  _onBackendPropertyChanged(property: string, value: unknown, timestamp?: number): void {
    this._setPropertyInternal(property as keyof TProperties, value as TProperties[keyof TProperties], timestamp);
  }

  /** @internal */
  _cleanup(): void {
    // pair onStop even when the sensor is force-removed without teardown
    if (this._active) {
      this._active = false;
      this.#runLifecycle(false);
    }

    this._updateFn = undefined;
    this._capabilitiesUpdateFn = undefined;
    this._sourceUpdateFn = undefined;
    this._storage = undefined;
    this._registered = false;
    this._assignedCameraIds = [];
    this.#propertyChangedSubject.complete();
    this.#capabilitiesChangedSubject.complete();
    this.#assignmentChangedSubject.complete();
    this.#connectedChangedSubject.complete();
    this.#deviceInfoChangedSubject.complete();
    this.#propertySpecsChangedSubject.complete();
  }

  /** Read-only view of the property values. */
  protected get props(): Readonly<TProperties> {
    return this._propertiesStore;
  }

  /**
   * Re-announces the model spec, e.g. once the models finished loading.
   *
   * The spec a detector reports at registration is what it knows at that
   * moment: models that load in the background are missing from it. Call this
   * after loading, the server replaces its copy.
   *
   * @example
   * ```typescript
   * async onStart(): Promise<void> {
   *   await this.loadModel();
   *   this.updateModelSpec();
   * }
   * ```
   */
  public updateModelSpec(): void {
    const spec = (this as { modelSpec?: unknown }).modelSpec;
    if (spec) this._writeState({ modelSpec: spec } as unknown as Partial<TProperties>);
  }

  /** @internal */
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

  /** @internal */
  protected _normalizeReportedDetections<T extends Detection>(
    detected: boolean,
    detections: T[] | undefined,
    fallbackLabel: T['label'],
    fallbackExtra?: Omit<T, 'label' | 'confidence' | 'box'>,
  ): T[] {
    if (!detected) return [];
    if (detections && detections.length > 0) {
      // smart-camera plugins report labels without boxes, the coordinator and zone matching need one
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
  /**
   * Source system the sensor was imported from, e.g. `'homeassistant'`. The
   * host stores it on the sensor entity, and export bridges targeting that
   * system skip the sensor so an import can never be exported back to where
   * it came from.
   */
  origin?: string;
  /**
   * Current address at the source, e.g. a Home Assistant entity id. Display
   * only, may change over time; identity is `nativeId`.
   */
  address?: string;
  /** Device the sensor belongs to. Sensors of the plugin that report the same `DeviceInfo.id` form one device. */
  device?: DeviceInfo;
  /** Whether the sensor is the main sensor of its `device`, called like the device when it stands alone. */
  primary?: boolean;
  /** What the device accepts per property, see `setPropertySpec()`. */
  propertySpecs?: Readonly<Record<string, PropertySpecOverride>>;
}
