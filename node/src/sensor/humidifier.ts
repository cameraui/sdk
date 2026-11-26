import { Sensor, SensorCategory, SensorType } from './base.js';
import { defineSensor, SensorDomain } from './meta.js';

import type { Observable } from '../observable/index.js';
import type { PropertyChangeOf, SensorLike, SensorOptions } from './base.js';

/** Whether the device adds or removes moisture, it decides how smart homes show it. */
export enum HumidifierKind {
  Humidifier = 'humidifier',
  Dehumidifier = 'dehumidifier',
}

/** What a humidifier does right now. */
export enum HumidifierAction {
  Off = 'off',
  Idle = 'idle',
  Humidifying = 'humidifying',
  Drying = 'drying',
}

/** Optional capabilities of a humidifier. */
export enum HumidifierCapability {
  /** Humidifier reports the humidity it measures. */
  Humidity = 'humidity',
  /** Humidifier reports whether it is working or idle. */
  Action = 'action',
  /** Humidifier offers modes such as eco or sleep. */
  Mode = 'mode',
}

/** Property names of a humidifier. */
export enum HumidifierProperty {
  /** `true` while the humidifier is on, a command when written. */
  On = 'on',
  /** Target humidity in percent. */
  TargetHumidity = 'targetHumidity',
  /** Measured humidity in percent. */
  CurrentHumidity = 'currentHumidity',
  /** What the humidifier does right now, a {@link HumidifierAction}. */
  Action = 'action',
  /** Active mode, one of the choices the plugin sets. */
  Mode = 'mode',
  /** Whether it humidifies or dehumidifies, a {@link HumidifierKind}. */
  Kind = 'kind',
}

/** Property values of a humidifier. */
export interface HumidifierControlProperties {
  [HumidifierProperty.On]: boolean;
  [HumidifierProperty.TargetHumidity]: number;
  [HumidifierProperty.CurrentHumidity]: number | undefined;
  [HumidifierProperty.Action]: HumidifierAction | undefined;
  [HumidifierProperty.Mode]: string | undefined;
  [HumidifierProperty.Kind]: HumidifierKind | undefined;
}

/** Read-only proxy interface for a humidifier. */
export interface HumidifierControlLike extends SensorLike {
  readonly type: SensorType.Humidifier;
  readonly onPropertyChanged: Observable<PropertyChangeOf<HumidifierControlProperties>>;
  readonly onCapabilitiesChanged: Observable<HumidifierCapability[]>;

  getValue(property: HumidifierProperty.On): boolean | undefined;
  getValue(property: HumidifierProperty.TargetHumidity): number | undefined;
  getValue(property: HumidifierProperty.CurrentHumidity): number | undefined;
  getValue(property: HumidifierProperty.Action): HumidifierAction | undefined;
  getValue(property: HumidifierProperty.Mode): string | undefined;
  getValue(property: HumidifierProperty.Kind): HumidifierKind | undefined;
  getValue(property: string): unknown;
}

/**
 * A humidifier or dehumidifier that works toward a target humidity. Override
 * `setOn()`, `setOff()`, `setTargetHumidity()` and `setMode()` to drive
 * hardware and call the `super` method after success to sync the SDK state.
 * Report what the device measures and does with `setCurrentHumidity()` and
 * `setAction()`.
 *
 * `setKind()` says whether it humidifies or dehumidifies. The modes it offers
 * come as choices: `setPropertySpec(HumidifierProperty.Mode, { choices })`.
 *
 * When the device refuses a command, throw from the override instead of calling
 * `super`: the write fails for whoever sent it and the state stays as it was.
 *
 * @example
 * ```ts
 * class Bedroom extends HumidifierControl {
 *   constructor() {
 *     super('Bedroom humidifier');
 *     this.setKind(HumidifierKind.Humidifier);
 *     this.capabilities = [HumidifierCapability.Humidity, HumidifierCapability.Action];
 *   }
 *
 *   override async setTargetHumidity(value: number): Promise<void> {
 *     await device.setHumidity(value);
 *     await super.setTargetHumidity(value);
 *   }
 * }
 * ```
 */
export class HumidifierControl<TStorage extends object = Record<string, any>> extends Sensor<HumidifierControlProperties, TStorage, HumidifierCapability> {
  readonly type = SensorType.Humidifier;
  readonly category = SensorCategory.Control;

  constructor(name = 'Humidifier', options?: SensorOptions) {
    super(name, options);

    this._writeState({ [HumidifierProperty.On]: false, [HumidifierProperty.TargetHumidity]: 50 });
  }

  /** `true` while the humidifier is on. */
  get on(): boolean {
    return this.props.on;
  }

  /** Target humidity in percent. */
  get targetHumidity(): number {
    return this.props.targetHumidity;
  }

  /** Measured humidity in percent. */
  get currentHumidity(): number | undefined {
    return this.props.currentHumidity;
  }

  /** What the humidifier does right now. */
  get action(): HumidifierAction | undefined {
    return this.props.action;
  }

  /** Active mode. */
  get mode(): string | undefined {
    return this.props.mode;
  }

  /** Whether it humidifies or dehumidifies. */
  get kind(): HumidifierKind | undefined {
    return this.props.kind;
  }

  /**
   * Turn the humidifier on. Override to drive hardware and call
   * `await super.setOn()` after success to sync the SDK state.
   *
   * @example
   * ```ts
   * await humidifier.setOn();
   * ```
   */
  async setOn(): Promise<void> {
    this._writeState({ [HumidifierProperty.On]: true });
  }

  /**
   * Turn the humidifier off. Override to drive hardware and call
   * `await super.setOff()` after success to sync the SDK state.
   *
   * @example
   * ```ts
   * await humidifier.setOff();
   * ```
   */
  async setOff(): Promise<void> {
    this._writeState({ [HumidifierProperty.On]: false });
  }

  /**
   * Set the target humidity. Override to drive hardware and call
   * `await super.setTargetHumidity(value)` after success to sync the SDK state.
   *
   * @param value - 0 to 100 percent.
   *
   * @example
   * ```ts
   * await humidifier.setTargetHumidity(45);
   * ```
   */
  async setTargetHumidity(value: number): Promise<void> {
    this._writeState({ [HumidifierProperty.TargetHumidity]: Math.max(0, Math.min(100, Math.round(value))) });
  }

  /**
   * Set the mode. Override to drive hardware and call
   * `await super.setMode(value)` after success to sync the SDK state.
   *
   * @param value - One of the mode choices.
   *
   * @example
   * ```ts
   * await humidifier.setMode('sleep');
   * ```
   */
  async setMode(value: string): Promise<void> {
    this._writeState({ [HumidifierProperty.Mode]: value });
  }

  /**
   * Report the humidity the device measures.
   *
   * @param value - 0 to 100 percent.
   *
   * @example
   * ```ts
   * humidifier.setCurrentHumidity(38);
   * ```
   */
  setCurrentHumidity(value: number): void {
    if (!Number.isFinite(value)) return;
    this._writeState({ [HumidifierProperty.CurrentHumidity]: Math.max(0, Math.min(100, value)) });
  }

  /**
   * Report what the humidifier does right now.
   *
   * @param value - Off, idle, humidifying or drying.
   *
   * @example
   * ```ts
   * humidifier.setAction(HumidifierAction.Humidifying);
   * ```
   */
  setAction(value: HumidifierAction): void {
    this._writeState({ [HumidifierProperty.Action]: value });
  }

  /**
   * Say whether the device humidifies or dehumidifies. Smart homes show it by
   * its kind, and Home Assistant takes it as the device class.
   *
   * @param kind - Humidifier or dehumidifier.
   *
   * @example
   * ```ts
   * humidifier.setKind(HumidifierKind.Dehumidifier);
   * ```
   */
  setKind(kind: HumidifierKind): void {
    this._writeState({ [HumidifierProperty.Kind]: kind });
    this.setPropertySpec(HumidifierProperty.Kind, { values: [kind] });
  }

  /** @internal */
  protected override async _applyValue(property: string, value: unknown): Promise<void> {
    switch (property as HumidifierProperty) {
      case HumidifierProperty.On:
        await (value ? this.setOn() : this.setOff());
        return;
      case HumidifierProperty.TargetHumidity:
        await this.setTargetHumidity(Number(value));
        return;
      case HumidifierProperty.Mode:
        await this.setMode(String(value));
        return;
    }
  }
}

/** Registry metadata for {@link HumidifierControl}. */
export const humidifierMeta = defineSensor({
  type: SensorType.Humidifier,
  category: SensorCategory.Control,
  assignmentKey: 'humidifier',
  multiProvider: true,
  isDetectionType: false,
  properties: {
    [HumidifierProperty.On]: { type: 'boolean', writable: true },
    [HumidifierProperty.TargetHumidity]: { type: 'number', min: 0, max: 100, step: 1, unit: '%', writable: true },
    [HumidifierProperty.CurrentHumidity]: { type: 'number', min: 0, max: 100, unit: '%' },
    [HumidifierProperty.Action]: {
      type: 'enum',
      values: {
        off: HumidifierAction.Off,
        idle: HumidifierAction.Idle,
        humidifying: HumidifierAction.Humidifying,
        drying: HumidifierAction.Drying,
      },
    },
    [HumidifierProperty.Mode]: { type: 'string', writable: true },
    [HumidifierProperty.Kind]: {
      type: 'enum',
      values: { humidifier: HumidifierKind.Humidifier, dehumidifier: HumidifierKind.Dehumidifier },
      internal: true,
    },
  },
  shortcutable: true,
  cascadeTrigger: { property: HumidifierProperty.On, values: [true], sustained: true },
  propertyCapabilities: {
    [HumidifierProperty.CurrentHumidity]: HumidifierCapability.Humidity,
    [HumidifierProperty.Action]: HumidifierCapability.Action,
    [HumidifierProperty.Mode]: HumidifierCapability.Mode,
  },
  virtual: {
    properties: { [HumidifierProperty.On]: false, [HumidifierProperty.TargetHumidity]: 50 },
    optionalCapabilities: {
      [HumidifierCapability.Humidity]: { [HumidifierProperty.CurrentHumidity]: 50 },
      [HumidifierCapability.Action]: { [HumidifierProperty.Action]: HumidifierAction.Off },
    },
  },
  semantics: {
    domain: SensorDomain.Humidifier,
    stateProperty: HumidifierProperty.On,
    commandProperty: HumidifierProperty.On,
    deviceClassProperty: HumidifierProperty.Kind,
    humidifier: {
      target: HumidifierProperty.TargetHumidity,
      current: HumidifierProperty.CurrentHumidity,
      action: HumidifierProperty.Action,
      mode: HumidifierProperty.Mode,
    },
  },
});
