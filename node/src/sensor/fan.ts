import { Sensor, SensorCategory, SensorType } from './base.js';
import { defineSensor, SensorDomain } from './meta.js';

import type { Observable } from '../observable/index.js';
import type { PropertyChangeOf, SensorLike, SensorOptions } from './base.js';

/** Direction a fan turns. */
export enum FanDirection {
  Forward = 'forward',
  Reverse = 'reverse',
}

/** Optional capabilities of a fan. */
export enum FanCapability {
  /** Fan runs at a speed between 0 and 100 percent. */
  Speed = 'speed',
  /** Fan turns forward or in reverse. */
  Direction = 'direction',
  /** Fan swings from side to side. */
  Oscillation = 'oscillation',
  /** Fan has presets, such as sleep or breeze. */
  Preset = 'preset',
}

/** Property names of a fan. */
export enum FanProperty {
  /** Whether the fan runs. */
  On = 'on',
  /** Speed, 0 to 100 percent. */
  Speed = 'speed',
  /** Direction, a {@link FanDirection}. */
  Direction = 'direction',
  /** Whether the fan swings from side to side. */
  Oscillating = 'oscillating',
  /** Active preset, one of the choices the device offers. */
  Preset = 'preset',
}

/** Property values of a fan. */
export interface FanControlProperties {
  [FanProperty.On]: boolean;
  [FanProperty.Speed]: number;
  [FanProperty.Direction]: FanDirection;
  [FanProperty.Oscillating]: boolean;
  [FanProperty.Preset]: string | undefined;
}

/** Read-only proxy interface for a fan. */
export interface FanControlLike extends SensorLike {
  readonly type: SensorType.Fan;
  readonly onPropertyChanged: Observable<PropertyChangeOf<FanControlProperties>>;
  readonly onCapabilitiesChanged: Observable<FanCapability[]>;

  getValue(property: FanProperty.On): boolean | undefined;
  getValue(property: FanProperty.Speed): number | undefined;
  getValue(property: FanProperty.Direction): FanDirection | undefined;
  getValue(property: FanProperty.Oscillating): boolean | undefined;
  getValue(property: FanProperty.Preset): string | undefined;
  getValue(property: string): unknown;
}

/**
 * A ceiling, desk or other fan. Override `setOn()`, `setOff()`, `setSpeed()`
 * and the other commands to drive hardware and call the `super` method after
 * success to sync the SDK state.
 *
 * A fan with speeds adds {@link FanCapability.Speed}, one that turns both ways
 * {@link FanCapability.Direction}, one that swings {@link FanCapability.Oscillation}.
 * Presets are the device's own, add {@link FanCapability.Preset} and set them
 * as `choices`. A fan with a few fixed speeds sets the speed's `step`, three
 * speeds are a step of 33.
 *
 * When the device refuses a command, throw from the override instead of calling
 * `super`: the write fails for whoever sent it and the state stays as it was.
 *
 * @example
 * ```ts
 * class CeilingFan extends FanControl {
 *   constructor() {
 *     super('Bedroom fan');
 *     this.capabilities = [FanCapability.Speed, FanCapability.Direction];
 *   }
 *
 *   override async setSpeed(speed: number): Promise<void> {
 *     await motor.setSpeed(speed);
 *     await super.setSpeed(speed);
 *   }
 * }
 * ```
 */
export class FanControl<TStorage extends object = Record<string, any>> extends Sensor<FanControlProperties, TStorage, FanCapability> {
  readonly type = SensorType.Fan;
  readonly category = SensorCategory.Control;

  constructor(name = 'Fan', options?: SensorOptions) {
    super(name, options);

    this._writeState({
      [FanProperty.On]: false,
      [FanProperty.Speed]: 100,
      [FanProperty.Direction]: FanDirection.Forward,
      [FanProperty.Oscillating]: false,
    });
  }

  /** Whether the fan runs. */
  get on(): boolean {
    return this.props.on;
  }

  /** Speed, 0 to 100 percent. */
  get speed(): number {
    return this.props.speed;
  }

  /** Direction the fan turns. */
  get direction(): FanDirection {
    return this.props.direction;
  }

  /** Whether the fan swings from side to side. */
  get oscillating(): boolean {
    return this.props.oscillating;
  }

  /** Active preset. */
  get preset(): string | undefined {
    return this.props.preset;
  }

  /**
   * Turn the fan on. Override to drive hardware and call `await super.setOn()`
   * after success to sync the SDK state.
   *
   * @example
   * ```ts
   * await fan.setOn();
   * ```
   */
  async setOn(): Promise<void> {
    this._writeState({ [FanProperty.On]: true });
  }

  /**
   * Turn the fan off. Override to drive hardware and call `await super.setOff()`
   * after success to sync the SDK state.
   *
   * @example
   * ```ts
   * await fan.setOff();
   * ```
   */
  async setOff(): Promise<void> {
    this._writeState({ [FanProperty.On]: false });
  }

  /**
   * Set the speed. Override to drive hardware and call
   * `await super.setSpeed(speed)` after success to sync the SDK state.
   *
   * @param speed - 0 to 100 percent.
   *
   * @example
   * ```ts
   * await fan.setSpeed(66);
   * ```
   */
  async setSpeed(speed: number): Promise<void> {
    this._writeState({ [FanProperty.Speed]: Math.max(0, Math.min(100, Math.round(speed))) });
  }

  /**
   * Set the direction. Override to drive hardware and call
   * `await super.setDirection(direction)` after success to sync the SDK state.
   *
   * @param direction - Forward or reverse.
   *
   * @example
   * ```ts
   * await fan.setDirection(FanDirection.Reverse);
   * ```
   */
  async setDirection(direction: FanDirection): Promise<void> {
    this._writeState({ [FanProperty.Direction]: direction });
  }

  /**
   * Let the fan swing or stop it. Override to drive hardware and call
   * `await super.setOscillating(value)` after success to sync the SDK state.
   *
   * @param value - `true` to swing.
   *
   * @example
   * ```ts
   * await fan.setOscillating(true);
   * ```
   */
  async setOscillating(value: boolean): Promise<void> {
    this._writeState({ [FanProperty.Oscillating]: value });
  }

  /**
   * Set the preset. Override to drive hardware and call
   * `await super.setPreset(value)` after success to sync the SDK state.
   *
   * @param value - One of the preset choices.
   *
   * @example
   * ```ts
   * await fan.setPreset('sleep');
   * ```
   */
  async setPreset(value: string): Promise<void> {
    this._writeState({ [FanProperty.Preset]: value });
  }

  /** @internal */
  protected override async _applyValue(property: string, value: unknown): Promise<void> {
    switch (property as FanProperty) {
      case FanProperty.On:
        if (value) await this.setOn();
        else await this.setOff();
        return;
      case FanProperty.Speed:
        await this.setSpeed(Number(value));
        return;
      case FanProperty.Direction:
        await this.setDirection(value as FanDirection);
        return;
      case FanProperty.Oscillating:
        await this.setOscillating(Boolean(value));
        return;
      case FanProperty.Preset:
        await this.setPreset(String(value));
        return;
    }
  }
}

/** Registry metadata for {@link FanControl}. */
export const fanMeta = defineSensor({
  type: SensorType.Fan,
  category: SensorCategory.Control,
  assignmentKey: 'fan',
  multiProvider: true,
  isDetectionType: false,
  properties: {
    [FanProperty.On]: { type: 'boolean', writable: true },
    [FanProperty.Speed]: { type: 'number', min: 0, max: 100, step: 1, unit: '%', writable: true },
    [FanProperty.Direction]: {
      type: 'enum',
      values: { forward: FanDirection.Forward, reverse: FanDirection.Reverse },
      writable: true,
    },
    [FanProperty.Oscillating]: { type: 'boolean', writable: true },
    [FanProperty.Preset]: { type: 'string', writable: true },
  },
  shortcutable: true,
  cascadeTrigger: { property: FanProperty.On, values: [true], sustained: true },
  propertyCapabilities: {
    [FanProperty.Speed]: FanCapability.Speed,
    [FanProperty.Direction]: FanCapability.Direction,
    [FanProperty.Oscillating]: FanCapability.Oscillation,
    [FanProperty.Preset]: FanCapability.Preset,
  },
  virtual: {
    properties: { [FanProperty.On]: false },
    optionalCapabilities: {
      [FanCapability.Speed]: { [FanProperty.Speed]: 50 },
      [FanCapability.Direction]: { [FanProperty.Direction]: FanDirection.Forward },
      [FanCapability.Oscillation]: { [FanProperty.Oscillating]: false },
    },
  },
  semantics: {
    domain: SensorDomain.Fan,
    stateProperty: FanProperty.On,
    commandProperty: FanProperty.On,
    fan: {
      speed: FanProperty.Speed,
      direction: FanProperty.Direction,
      oscillating: FanProperty.Oscillating,
    },
  },
});
