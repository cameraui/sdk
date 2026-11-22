import { Sensor, SensorCategory, SensorType } from './base.js';
import { defineSensor, SensorDomain } from './meta.js';

import type { Observable } from '../observable/index.js';
import type { PropertyChangeOf, SensorLike, SensorOptions } from './base.js';

/** What an air purifier does right now. */
export enum AirPurifierState {
  Inactive = 'inactive',
  Idle = 'idle',
  Purifying = 'purifying',
}

/** Optional capabilities of an air purifier. */
export enum AirPurifierCapability {
  /** Purifier reports whether it is purifying or idle while it is on. */
  State = 'state',
  /** Purifier runs at a set speed. */
  Speed = 'speed',
  /** Purifier has an automatic mode. */
  Auto = 'auto',
  /** Purifier offers presets such as sleep or turbo. */
  Preset = 'preset',
  /** Purifier locks its buttons against children. */
  ChildLock = 'childLock',
  /** Purifier reports the state of its filter. */
  Filter = 'filter',
}

/** Property names of an air purifier. */
export enum AirPurifierProperty {
  /** `true` while the purifier is on, a command when written. */
  On = 'on',
  /** What the purifier does right now, an {@link AirPurifierState}. */
  State = 'state',
  /** Speed in percent. */
  Speed = 'speed',
  /** `true` while the purifier runs in its automatic mode. */
  Auto = 'auto',
  /** Active preset, one of the choices the plugin sets. */
  Preset = 'preset',
  /** `true` while the buttons on the purifier are locked. */
  ChildLock = 'childLock',
  /** Filter life left in percent. */
  FilterLife = 'filterLife',
  /** `true` when the filter needs a change. */
  FilterChange = 'filterChange',
}

/** Property values of an air purifier. */
export interface AirPurifierControlProperties {
  [AirPurifierProperty.On]: boolean;
  [AirPurifierProperty.State]: AirPurifierState | undefined;
  [AirPurifierProperty.Speed]: number;
  [AirPurifierProperty.Auto]: boolean;
  [AirPurifierProperty.Preset]: string | undefined;
  [AirPurifierProperty.ChildLock]: boolean;
  [AirPurifierProperty.FilterLife]: number | undefined;
  [AirPurifierProperty.FilterChange]: boolean;
}

/** Read-only proxy interface for an air purifier. */
export interface AirPurifierControlLike extends SensorLike {
  readonly type: SensorType.AirPurifier;
  readonly onPropertyChanged: Observable<PropertyChangeOf<AirPurifierControlProperties>>;
  readonly onCapabilitiesChanged: Observable<AirPurifierCapability[]>;

  getValue(property: AirPurifierProperty.On): boolean | undefined;
  getValue(property: AirPurifierProperty.State): AirPurifierState | undefined;
  getValue(property: AirPurifierProperty.Speed): number | undefined;
  getValue(property: AirPurifierProperty.Auto): boolean | undefined;
  getValue(property: AirPurifierProperty.Preset): string | undefined;
  getValue(property: AirPurifierProperty.ChildLock): boolean | undefined;
  getValue(property: AirPurifierProperty.FilterLife): number | undefined;
  getValue(property: AirPurifierProperty.FilterChange): boolean | undefined;
  getValue(property: string): unknown;
}

/**
 * An air purifier. Override `setOn()`, `setOff()`, `setSpeed()`, `setAuto()`,
 * `setPreset()` and `setChildLock()` to drive hardware and call the `super`
 * method after success to sync the SDK state. Report what the purifier does
 * and how its filter is with `setState()`, `setFilterLife()` and
 * `setFilterChange()`.
 *
 * Each optional part comes with its {@link AirPurifierCapability}. The presets
 * it offers come as choices: `setPropertySpec(AirPurifierProperty.Preset, { choices })`.
 *
 * @example
 * ```ts
 * class Bedroom extends AirPurifierControl {
 *   constructor() {
 *     super('Bedroom purifier');
 *     this.capabilities = [AirPurifierCapability.Speed, AirPurifierCapability.Filter];
 *   }
 *
 *   override async setSpeed(speed: number): Promise<void> {
 *     await device.setFanLevel(speed);
 *     await super.setSpeed(speed);
 *   }
 * }
 * ```
 */
export class AirPurifierControl<TStorage extends object = Record<string, any>> extends Sensor<AirPurifierControlProperties, TStorage, AirPurifierCapability> {
  readonly type = SensorType.AirPurifier;
  readonly category = SensorCategory.Control;

  constructor(name = 'Air Purifier', options?: SensorOptions) {
    super(name, options);

    this._writeState({
      [AirPurifierProperty.On]: false,
      [AirPurifierProperty.Speed]: 100,
      [AirPurifierProperty.Auto]: false,
      [AirPurifierProperty.ChildLock]: false,
      [AirPurifierProperty.FilterChange]: false,
    });
  }

  /** `true` while the purifier is on. */
  get on(): boolean {
    return this.props.on;
  }

  /** What the purifier does right now. */
  get state(): AirPurifierState | undefined {
    return this.props.state;
  }

  /** Speed in percent. */
  get speed(): number {
    return this.props.speed;
  }

  /** `true` while the purifier runs in its automatic mode. */
  get auto(): boolean {
    return this.props.auto;
  }

  /** Active preset. */
  get preset(): string | undefined {
    return this.props.preset;
  }

  /** `true` while the buttons on the purifier are locked. */
  get childLock(): boolean {
    return this.props.childLock;
  }

  /** Filter life left in percent. */
  get filterLife(): number | undefined {
    return this.props.filterLife;
  }

  /** `true` when the filter needs a change. */
  get filterChange(): boolean {
    return this.props.filterChange;
  }

  /**
   * Turn the purifier on. Override to drive hardware and call
   * `await super.setOn()` after success to sync the SDK state.
   *
   * @example
   * ```ts
   * await purifier.setOn();
   * ```
   */
  async setOn(): Promise<void> {
    this._writeState({ [AirPurifierProperty.On]: true });
  }

  /**
   * Turn the purifier off. Override to drive hardware and call
   * `await super.setOff()` after success to sync the SDK state.
   *
   * @example
   * ```ts
   * await purifier.setOff();
   * ```
   */
  async setOff(): Promise<void> {
    this._writeState({ [AirPurifierProperty.On]: false });
  }

  /**
   * Set the speed. Override to drive hardware and call
   * `await super.setSpeed(speed)` after success to sync the SDK state.
   *
   * @param speed - 0 to 100 percent.
   *
   * @example
   * ```ts
   * await purifier.setSpeed(60);
   * ```
   */
  async setSpeed(speed: number): Promise<void> {
    this._writeState({ [AirPurifierProperty.Speed]: Math.max(0, Math.min(100, Math.round(speed))) });
  }

  /**
   * Switch the automatic mode on or off. Override to drive hardware and call
   * `await super.setAuto(auto)` after success to sync the SDK state.
   *
   * @param auto - `true` for the automatic mode, `false` for a set speed.
   *
   * @example
   * ```ts
   * await purifier.setAuto(true);
   * ```
   */
  async setAuto(auto: boolean): Promise<void> {
    this._writeState({ [AirPurifierProperty.Auto]: auto });
  }

  /**
   * Set the preset. Override to drive hardware and call
   * `await super.setPreset(value)` after success to sync the SDK state.
   *
   * @param value - One of the preset choices.
   *
   * @example
   * ```ts
   * await purifier.setPreset('sleep');
   * ```
   */
  async setPreset(value: string): Promise<void> {
    this._writeState({ [AirPurifierProperty.Preset]: value });
  }

  /**
   * Lock or unlock the buttons on the purifier. Override to drive hardware and
   * call `await super.setChildLock(locked)` after success to sync the SDK state.
   *
   * @param locked - `true` locks the buttons.
   *
   * @example
   * ```ts
   * await purifier.setChildLock(true);
   * ```
   */
  async setChildLock(locked: boolean): Promise<void> {
    this._writeState({ [AirPurifierProperty.ChildLock]: locked });
  }

  /**
   * Report what the purifier does right now.
   *
   * @param value - Inactive, idle or purifying.
   *
   * @example
   * ```ts
   * purifier.setState(AirPurifierState.Idle);
   * ```
   */
  setState(value: AirPurifierState): void {
    this._writeState({ [AirPurifierProperty.State]: value });
  }

  /**
   * Report how much filter life is left.
   *
   * @param percent - 0 to 100 percent.
   *
   * @example
   * ```ts
   * purifier.setFilterLife(35);
   * ```
   */
  setFilterLife(percent: number): void {
    if (!Number.isFinite(percent)) return;
    this._writeState({ [AirPurifierProperty.FilterLife]: Math.max(0, Math.min(100, Math.round(percent))) });
  }

  /**
   * Report whether the filter needs a change.
   *
   * @param change - `true` when the filter needs a change.
   *
   * @example
   * ```ts
   * purifier.setFilterChange(true);
   * ```
   */
  setFilterChange(change: boolean): void {
    this._writeState({ [AirPurifierProperty.FilterChange]: change });
  }

  /** @internal */
  async updateValue(property: string, value: unknown): Promise<void> {
    switch (property as AirPurifierProperty) {
      case AirPurifierProperty.On:
        await (value ? this.setOn() : this.setOff());
        return;
      case AirPurifierProperty.Speed:
        await this.setSpeed(Number(value));
        return;
      case AirPurifierProperty.Auto:
        await this.setAuto(Boolean(value));
        return;
      case AirPurifierProperty.Preset:
        await this.setPreset(String(value));
        return;
      case AirPurifierProperty.ChildLock:
        await this.setChildLock(Boolean(value));
        return;
    }
  }
}

const PERCENT = { type: 'number', min: 0, max: 100, step: 1, unit: '%' } as const;

/** Registry metadata for {@link AirPurifierControl}. */
export const airPurifierMeta = defineSensor({
  type: SensorType.AirPurifier,
  category: SensorCategory.Control,
  assignmentKey: 'airPurifier',
  multiProvider: true,
  isDetectionType: false,
  properties: {
    [AirPurifierProperty.On]: { type: 'boolean', writable: true },
    [AirPurifierProperty.State]: {
      type: 'enum',
      values: { inactive: AirPurifierState.Inactive, idle: AirPurifierState.Idle, purifying: AirPurifierState.Purifying },
    },
    [AirPurifierProperty.Speed]: { ...PERCENT, writable: true },
    [AirPurifierProperty.Auto]: { type: 'boolean', writable: true },
    [AirPurifierProperty.Preset]: { type: 'string', writable: true },
    [AirPurifierProperty.ChildLock]: { type: 'boolean', writable: true },
    [AirPurifierProperty.FilterLife]: PERCENT,
    [AirPurifierProperty.FilterChange]: { type: 'boolean' },
  },
  shortcutable: true,
  propertyCapabilities: {
    [AirPurifierProperty.State]: AirPurifierCapability.State,
    [AirPurifierProperty.Speed]: AirPurifierCapability.Speed,
    [AirPurifierProperty.Auto]: AirPurifierCapability.Auto,
    [AirPurifierProperty.Preset]: AirPurifierCapability.Preset,
    [AirPurifierProperty.ChildLock]: AirPurifierCapability.ChildLock,
    [AirPurifierProperty.FilterLife]: AirPurifierCapability.Filter,
    [AirPurifierProperty.FilterChange]: AirPurifierCapability.Filter,
  },
  virtual: { properties: { [AirPurifierProperty.On]: false } },
  semantics: {
    domain: SensorDomain.AirPurifier,
    stateProperty: AirPurifierProperty.On,
    commandProperty: AirPurifierProperty.On,
    icon: 'mdi:air-purifier',
    fan: { speed: AirPurifierProperty.Speed },
    toggles: [AirPurifierProperty.Auto, AirPurifierProperty.ChildLock],
    readings: [{ property: AirPurifierProperty.FilterLife, unit: '%' }],
  },
});
