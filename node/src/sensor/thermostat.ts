import { Sensor, SensorCategory, SensorType } from './base.js';
import { defineSensor, SensorDomain } from './meta.js';

import type { Observable } from '../observable/index.js';
import type { PropertyChangeOf, SensorLike, SensorOptions } from './base.js';

/** What a thermostat is set to do. */
export enum ThermostatMode {
  Off = 'off',
  Heat = 'heat',
  Cool = 'cool',
  /** Heats and cools to stay inside a target range. */
  HeatCool = 'heat_cool',
  /** The device decides by its own schedule or logic. */
  Auto = 'auto',
  Dry = 'dry',
  FanOnly = 'fan_only',
}

/** What a thermostat does right now. */
export enum ThermostatAction {
  Off = 'off',
  Idle = 'idle',
  Heating = 'heating',
  Cooling = 'cooling',
  Drying = 'drying',
  Fan = 'fan',
  Preheating = 'preheating',
  Defrosting = 'defrosting',
}

/** Optional capabilities of a thermostat. */
export enum ThermostatCapability {
  /** Thermostat keeps the temperature inside a range, in `heat_cool` mode. */
  Range = 'range',
  /** Thermostat reports what it does right now. */
  Action = 'action',
  /** Thermostat reports the humidity. */
  Humidity = 'humidity',
  /** Thermostat has presets, such as eco or away. */
  Preset = 'preset',
  /** Thermostat has fan modes. */
  FanMode = 'fanMode',
  /** Thermostat keeps the humidity at a target. */
  TargetHumidity = 'targetHumidity',
}

/** Property names of a thermostat. Temperatures are in °C. */
export enum ThermostatProperty {
  /** Current temperature. */
  CurrentTemperature = 'currentTemperature',
  /** Temperature the thermostat heats or cools to. */
  TargetTemperature = 'targetTemperature',
  /** Lower end of the target range. */
  TargetTemperatureLow = 'targetTemperatureLow',
  /** Upper end of the target range. */
  TargetTemperatureHigh = 'targetTemperatureHigh',
  /** Mode, a {@link ThermostatMode}. */
  Mode = 'mode',
  /** What the thermostat does right now, a {@link ThermostatAction}. */
  Action = 'action',
  /** Current humidity in percent. */
  CurrentHumidity = 'currentHumidity',
  /** Active preset, one of the choices the device offers. */
  Preset = 'preset',
  /** Active fan mode, one of the choices the device offers. */
  FanMode = 'fanMode',
  /** Humidity in percent the thermostat keeps. */
  TargetHumidity = 'targetHumidity',
}

/** Property values of a thermostat. */
export interface ThermostatControlProperties {
  [ThermostatProperty.CurrentTemperature]: number | undefined;
  [ThermostatProperty.TargetTemperature]: number;
  [ThermostatProperty.TargetTemperatureLow]: number;
  [ThermostatProperty.TargetTemperatureHigh]: number;
  [ThermostatProperty.Mode]: ThermostatMode;
  [ThermostatProperty.Action]: ThermostatAction | undefined;
  [ThermostatProperty.CurrentHumidity]: number | undefined;
  [ThermostatProperty.Preset]: string | undefined;
  [ThermostatProperty.FanMode]: string | undefined;
  [ThermostatProperty.TargetHumidity]: number;
}

/** Read-only proxy interface for a thermostat. */
export interface ThermostatControlLike extends SensorLike {
  readonly type: SensorType.Thermostat;
  readonly onPropertyChanged: Observable<PropertyChangeOf<ThermostatControlProperties>>;
  readonly onCapabilitiesChanged: Observable<ThermostatCapability[]>;

  getValue(property: ThermostatProperty.CurrentTemperature): number | undefined;
  getValue(property: ThermostatProperty.TargetTemperature): number | undefined;
  getValue(property: ThermostatProperty.TargetTemperatureLow): number | undefined;
  getValue(property: ThermostatProperty.TargetTemperatureHigh): number | undefined;
  getValue(property: ThermostatProperty.Mode): ThermostatMode | undefined;
  getValue(property: ThermostatProperty.Action): ThermostatAction | undefined;
  getValue(property: ThermostatProperty.CurrentHumidity): number | undefined;
  getValue(property: ThermostatProperty.Preset): string | undefined;
  getValue(property: ThermostatProperty.FanMode): string | undefined;
  getValue(property: ThermostatProperty.TargetHumidity): number | undefined;
  getValue(property: string): unknown;
}

/**
 * A thermostat or air conditioner. Temperatures are in °C, a plugin converts
 * from the device's unit. Override `setTargetTemperature()`, `setMode()` and
 * the other commands to drive hardware and call the `super` method after
 * success to sync the SDK state. Report readings with `setCurrentTemperature()`,
 * `setAction()` and `setCurrentHumidity()`.
 *
 * Narrow the modes to those the device has with
 * `setPropertySpec(ThermostatProperty.Mode, { values: [...] })`, and its
 * temperature range with `{ min, max, step }` on the target properties.
 * Presets and fan modes are the device's own, set them as `choices`.
 *
 * @example
 * ```ts
 * class Radiator extends ThermostatControl {
 *   constructor() {
 *     super('Bathroom');
 *     this.capabilities = [ThermostatCapability.Action];
 *     this.setPropertySpec(ThermostatProperty.Mode, { values: [ThermostatMode.Off, ThermostatMode.Heat] });
 *     this.setPropertySpec(ThermostatProperty.TargetTemperature, { min: 5, max: 30, step: 0.5 });
 *   }
 *
 *   override async setTargetTemperature(value: number): Promise<void> {
 *     await valve.setTarget(value);
 *     await super.setTargetTemperature(value);
 *   }
 * }
 * ```
 */
export class ThermostatControl<TStorage extends object = Record<string, any>> extends Sensor<ThermostatControlProperties, TStorage, ThermostatCapability> {
  readonly type = SensorType.Thermostat;
  readonly category = SensorCategory.Control;

  constructor(name = 'Thermostat', options?: SensorOptions) {
    super(name, options);

    this._writeState({
      [ThermostatProperty.TargetTemperature]: 20,
      [ThermostatProperty.TargetTemperatureLow]: 18,
      [ThermostatProperty.TargetTemperatureHigh]: 24,
      [ThermostatProperty.Mode]: ThermostatMode.Off,
      [ThermostatProperty.TargetHumidity]: 50,
    });
  }

  /** Current temperature in °C. */
  get currentTemperature(): number | undefined {
    return this.props.currentTemperature;
  }

  /** Target temperature in °C. */
  get targetTemperature(): number {
    return this.props.targetTemperature;
  }

  /** Lower end of the target range in °C. */
  get targetTemperatureLow(): number {
    return this.props.targetTemperatureLow;
  }

  /** Upper end of the target range in °C. */
  get targetTemperatureHigh(): number {
    return this.props.targetTemperatureHigh;
  }

  /** Mode. */
  get mode(): ThermostatMode {
    return this.props.mode;
  }

  /** What the thermostat does right now. */
  get action(): ThermostatAction | undefined {
    return this.props.action;
  }

  /** Current humidity in percent. */
  get currentHumidity(): number | undefined {
    return this.props.currentHumidity;
  }

  /** Active preset. */
  get preset(): string | undefined {
    return this.props.preset;
  }

  /** Active fan mode. */
  get fanMode(): string | undefined {
    return this.props.fanMode;
  }

  /** Target humidity in percent. */
  get targetHumidity(): number {
    return this.props.targetHumidity;
  }

  /**
   * Set the target temperature. Override to drive hardware and call
   * `await super.setTargetTemperature(value)` after success to sync the SDK state.
   *
   * @param value - Temperature in °C.
   *
   * @example
   * ```ts
   * await thermostat.setTargetTemperature(21.5);
   * ```
   */
  async setTargetTemperature(value: number): Promise<void> {
    this._writeState({ [ThermostatProperty.TargetTemperature]: value });
  }

  /**
   * Set the lower end of the target range. Override to drive hardware and call
   * `await super.setTargetTemperatureLow(value)` after success to sync the SDK state.
   *
   * @param value - Temperature in °C.
   *
   * @example
   * ```ts
   * await thermostat.setTargetTemperatureLow(19);
   * ```
   */
  async setTargetTemperatureLow(value: number): Promise<void> {
    this._writeState({ [ThermostatProperty.TargetTemperatureLow]: value });
  }

  /**
   * Set the upper end of the target range. Override to drive hardware and call
   * `await super.setTargetTemperatureHigh(value)` after success to sync the SDK state.
   *
   * @param value - Temperature in °C.
   *
   * @example
   * ```ts
   * await thermostat.setTargetTemperatureHigh(24);
   * ```
   */
  async setTargetTemperatureHigh(value: number): Promise<void> {
    this._writeState({ [ThermostatProperty.TargetTemperatureHigh]: value });
  }

  /**
   * Set the mode. Override to drive hardware and call
   * `await super.setMode(value)` after success to sync the SDK state.
   *
   * @param value - One of the modes the thermostat offers.
   *
   * @example
   * ```ts
   * await thermostat.setMode(ThermostatMode.Heat);
   * ```
   */
  async setMode(value: ThermostatMode): Promise<void> {
    this._writeState({ [ThermostatProperty.Mode]: value });
  }

  /**
   * Set the preset. Override to drive hardware and call
   * `await super.setPreset(value)` after success to sync the SDK state.
   *
   * @param value - One of the preset choices.
   *
   * @example
   * ```ts
   * await thermostat.setPreset('eco');
   * ```
   */
  async setPreset(value: string): Promise<void> {
    this._writeState({ [ThermostatProperty.Preset]: value });
  }

  /**
   * Set the fan mode. Override to drive hardware and call
   * `await super.setFanMode(value)` after success to sync the SDK state.
   *
   * @param value - One of the fan mode choices.
   *
   * @example
   * ```ts
   * await thermostat.setFanMode('low');
   * ```
   */
  async setFanMode(value: string): Promise<void> {
    this._writeState({ [ThermostatProperty.FanMode]: value });
  }

  /**
   * Set the target humidity. Override to drive hardware and call
   * `await super.setTargetHumidity(value)` after success to sync the SDK state.
   *
   * @param value - Humidity in percent.
   *
   * @example
   * ```ts
   * await thermostat.setTargetHumidity(45);
   * ```
   */
  async setTargetHumidity(value: number): Promise<void> {
    this._writeState({ [ThermostatProperty.TargetHumidity]: Math.max(0, Math.min(100, Math.round(value))) });
  }

  /**
   * Report the current temperature.
   *
   * @param value - Temperature in °C.
   *
   * @example
   * ```ts
   * thermostat.setCurrentTemperature(20.4);
   * ```
   */
  setCurrentTemperature(value: number): void {
    if (!Number.isFinite(value)) return;
    this._writeState({ [ThermostatProperty.CurrentTemperature]: value });
  }

  /**
   * Report what the thermostat does right now.
   *
   * @param value - What it does.
   *
   * @example
   * ```ts
   * thermostat.setAction(ThermostatAction.Heating);
   * ```
   */
  setAction(value: ThermostatAction): void {
    this._writeState({ [ThermostatProperty.Action]: value });
  }

  /**
   * Report the current humidity.
   *
   * @param value - Humidity in percent.
   *
   * @example
   * ```ts
   * thermostat.setCurrentHumidity(45);
   * ```
   */
  setCurrentHumidity(value: number): void {
    if (!Number.isFinite(value)) return;
    this._writeState({ [ThermostatProperty.CurrentHumidity]: Math.max(0, Math.min(100, value)) });
  }

  /** @internal */
  async updateValue(property: string, value: unknown): Promise<void> {
    switch (property as ThermostatProperty) {
      case ThermostatProperty.TargetTemperature:
        await this.setTargetTemperature(Number(value));
        return;
      case ThermostatProperty.TargetTemperatureLow:
        await this.setTargetTemperatureLow(Number(value));
        return;
      case ThermostatProperty.TargetTemperatureHigh:
        await this.setTargetTemperatureHigh(Number(value));
        return;
      case ThermostatProperty.Mode:
        await this.setMode(value as ThermostatMode);
        return;
      case ThermostatProperty.Preset:
        await this.setPreset(String(value));
        return;
      case ThermostatProperty.FanMode:
        await this.setFanMode(String(value));
        return;
      case ThermostatProperty.TargetHumidity:
        await this.setTargetHumidity(Number(value));
        return;
    }
  }
}

const TARGET = { type: 'number', min: 7, max: 35, step: 0.5, unit: '°C', writable: true } as const;

/** Registry metadata for {@link ThermostatControl}. */
export const thermostatMeta = defineSensor({
  type: SensorType.Thermostat,
  category: SensorCategory.Control,
  assignmentKey: 'thermostat',
  multiProvider: true,
  isDetectionType: false,
  properties: {
    [ThermostatProperty.CurrentTemperature]: { type: 'number', unit: '°C' },
    [ThermostatProperty.TargetTemperature]: TARGET,
    [ThermostatProperty.TargetTemperatureLow]: TARGET,
    [ThermostatProperty.TargetTemperatureHigh]: TARGET,
    [ThermostatProperty.Mode]: {
      type: 'enum',
      values: {
        off: ThermostatMode.Off,
        heat: ThermostatMode.Heat,
        cool: ThermostatMode.Cool,
        heat_cool: ThermostatMode.HeatCool,
        auto: ThermostatMode.Auto,
        dry: ThermostatMode.Dry,
        fan_only: ThermostatMode.FanOnly,
      },
      writable: true,
    },
    [ThermostatProperty.Action]: {
      type: 'enum',
      values: {
        off: ThermostatAction.Off,
        idle: ThermostatAction.Idle,
        heating: ThermostatAction.Heating,
        cooling: ThermostatAction.Cooling,
        drying: ThermostatAction.Drying,
        fan: ThermostatAction.Fan,
        preheating: ThermostatAction.Preheating,
        defrosting: ThermostatAction.Defrosting,
      },
    },
    [ThermostatProperty.CurrentHumidity]: { type: 'number', min: 0, max: 100, unit: '%' },
    [ThermostatProperty.Preset]: { type: 'string', writable: true },
    [ThermostatProperty.FanMode]: { type: 'string', writable: true },
    [ThermostatProperty.TargetHumidity]: { type: 'number', min: 0, max: 100, step: 1, unit: '%', writable: true },
  },
  shortcutable: true,
  propertyCapabilities: {
    [ThermostatProperty.TargetTemperatureLow]: ThermostatCapability.Range,
    [ThermostatProperty.TargetTemperatureHigh]: ThermostatCapability.Range,
    [ThermostatProperty.Action]: ThermostatCapability.Action,
    [ThermostatProperty.CurrentHumidity]: ThermostatCapability.Humidity,
    [ThermostatProperty.Preset]: ThermostatCapability.Preset,
    [ThermostatProperty.FanMode]: ThermostatCapability.FanMode,
    [ThermostatProperty.TargetHumidity]: ThermostatCapability.TargetHumidity,
  },
  virtual: { properties: { [ThermostatProperty.Mode]: ThermostatMode.Off, [ThermostatProperty.TargetTemperature]: 20 } },
  semantics: {
    domain: SensorDomain.Climate,
    stateProperty: ThermostatProperty.Mode,
    commandProperty: ThermostatProperty.Mode,
    climate: {
      current: ThermostatProperty.CurrentTemperature,
      target: ThermostatProperty.TargetTemperature,
      targetLow: ThermostatProperty.TargetTemperatureLow,
      targetHigh: ThermostatProperty.TargetTemperatureHigh,
      mode: ThermostatProperty.Mode,
      action: ThermostatProperty.Action,
      humidity: ThermostatProperty.CurrentHumidity,
      targetHumidity: ThermostatProperty.TargetHumidity,
    },
  },
});
