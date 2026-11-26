import { Sensor, SensorCategory, SensorType } from './base.js';
import { defineSensor, SensorDomain } from './meta.js';

import type { Observable } from '../observable/index.js';
import type { PropertyChangeOf, SensorLike, SensorOptions } from './base.js';

/** Operating mode of a water heater. */
export enum WaterHeaterMode {
  /** Water heater is off. */
  Off = 'off',
  /** Energy-saving mode. */
  Eco = 'eco',
  /** Heats with electricity only. */
  Electric = 'electric',
  /** Heats with gas only. */
  Gas = 'gas',
  /** Heats with the heat pump only. */
  HeatPump = 'heat_pump',
  /** Heats more to keep up with a high demand for hot water. */
  HighDemand = 'high_demand',
  /** Heats as fast as it can. */
  Performance = 'performance',
  /** The device decides by its own schedule or logic. */
  Auto = 'auto',
  /** Heats the water. */
  Heat = 'heat',
  /** Running in a mode without a name of its own. */
  On = 'on',
}

/** Optional capabilities of a water heater. */
export enum WaterHeaterCapability {
  /** Water heater has an away mode that saves energy while nobody is home. */
  Away = 'away',
}

/** Property names of a water heater. */
export enum WaterHeaterProperty {
  /** Current water temperature in °C. */
  CurrentTemperature = 'currentTemperature',
  /** Target water temperature in °C. */
  TargetTemperature = 'targetTemperature',
  /** Operating mode, a {@link WaterHeaterMode}, a command when written. */
  Mode = 'mode',
  /** `true` while the away mode is on. */
  Away = 'away',
}

/** Property values of a water heater. */
export interface WaterHeaterControlProperties {
  [WaterHeaterProperty.CurrentTemperature]: number | undefined;
  [WaterHeaterProperty.TargetTemperature]: number;
  [WaterHeaterProperty.Mode]: WaterHeaterMode;
  [WaterHeaterProperty.Away]: boolean;
}

/** Read-only proxy interface for a water heater. */
export interface WaterHeaterControlLike extends SensorLike {
  readonly type: SensorType.WaterHeater;
  readonly onPropertyChanged: Observable<PropertyChangeOf<WaterHeaterControlProperties>>;
  readonly onCapabilitiesChanged: Observable<WaterHeaterCapability[]>;

  getValue(property: WaterHeaterProperty.CurrentTemperature): number | undefined;
  getValue(property: WaterHeaterProperty.TargetTemperature): number | undefined;
  getValue(property: WaterHeaterProperty.Mode): WaterHeaterMode | undefined;
  getValue(property: WaterHeaterProperty.Away): boolean | undefined;
  getValue(property: string): unknown;
}

/**
 * A water heater or boiler that keeps its water at a target temperature.
 * Override `setMode()`, `setTargetTemperature()` and `setAway()` to drive
 * hardware and call the `super` method after success to sync the SDK state.
 * Report the water temperature with `setCurrentTemperature()`.
 *
 * Narrow the modes to those the device has with
 * `setPropertySpec(WaterHeaterProperty.Mode, { values: [...] })`, and its
 * temperature range with `{ min, max, step }` on the target temperature.
 * Temperatures are always in °C.
 *
 * When the device refuses a command, throw from the override instead of calling
 * `super`: the write fails for whoever sent it and the state stays as it was.
 *
 * @example
 * ```ts
 * class Boiler extends WaterHeaterControl {
 *   constructor() {
 *     super('Boiler');
 *     this.setPropertySpec(WaterHeaterProperty.Mode, { values: [WaterHeaterMode.Off, WaterHeaterMode.Eco, WaterHeaterMode.Electric] });
 *     this.setPropertySpec(WaterHeaterProperty.TargetTemperature, { min: 40, max: 65, step: 1 });
 *   }
 *
 *   override async setTargetTemperature(value: number): Promise<void> {
 *     await device.setSetpoint(value);
 *     await super.setTargetTemperature(value);
 *   }
 * }
 * ```
 */
export class WaterHeaterControl<TStorage extends object = Record<string, any>> extends Sensor<WaterHeaterControlProperties, TStorage, WaterHeaterCapability> {
  readonly type = SensorType.WaterHeater;
  readonly category = SensorCategory.Control;

  constructor(name = 'Water Heater', options?: SensorOptions) {
    super(name, options);

    this._writeState({
      [WaterHeaterProperty.TargetTemperature]: 50,
      [WaterHeaterProperty.Mode]: WaterHeaterMode.Off,
      [WaterHeaterProperty.Away]: false,
    });
  }

  /** Current water temperature in °C. */
  get currentTemperature(): number | undefined {
    return this.props.currentTemperature;
  }

  /** Target water temperature in °C. */
  get targetTemperature(): number {
    return this.props.targetTemperature;
  }

  /** Operating mode, a {@link WaterHeaterMode}, a command when written. */
  get mode(): WaterHeaterMode {
    return this.props.mode;
  }

  /** `true` while the away mode is on. */
  get away(): boolean {
    return this.props.away;
  }

  /**
   * Set the operating mode. Override to drive hardware and call
   * `await super.setMode(value)` after success to sync the SDK state.
   *
   * @param value - One of the modes the water heater offers.
   *
   * @example
   * ```ts
   * await boiler.setMode(WaterHeaterMode.Eco);
   * ```
   */
  async setMode(value: WaterHeaterMode): Promise<void> {
    this._writeState({ [WaterHeaterProperty.Mode]: value });
  }

  /**
   * Set the target temperature. Override to drive hardware and call
   * `await super.setTargetTemperature(value)` after success to sync the SDK state.
   *
   * @param value - Target temperature in °C.
   *
   * @example
   * ```ts
   * await boiler.setTargetTemperature(55);
   * ```
   */
  async setTargetTemperature(value: number): Promise<void> {
    this._writeState({ [WaterHeaterProperty.TargetTemperature]: value });
  }

  /**
   * Switch the away mode on or off. Override to drive hardware and call
   * `await super.setAway(away)` after success to sync the SDK state.
   *
   * @param away - `true` for the away mode.
   *
   * @example
   * ```ts
   * await boiler.setAway(true);
   * ```
   */
  async setAway(away: boolean): Promise<void> {
    this._writeState({ [WaterHeaterProperty.Away]: away });
  }

  /**
   * Report the current water temperature.
   *
   * @param value - Water temperature in °C.
   *
   * @example
   * ```ts
   * boiler.setCurrentTemperature(48.5);
   * ```
   */
  setCurrentTemperature(value: number): void {
    if (!Number.isFinite(value)) return;
    this._writeState({ [WaterHeaterProperty.CurrentTemperature]: value });
  }

  /** @internal */
  protected override async _applyValue(property: string, value: unknown): Promise<void> {
    switch (property as WaterHeaterProperty) {
      case WaterHeaterProperty.Mode:
        await this.setMode(value as WaterHeaterMode);
        return;
      case WaterHeaterProperty.TargetTemperature:
        await this.setTargetTemperature(Number(value));
        return;
      case WaterHeaterProperty.Away:
        await this.setAway(Boolean(value));
        return;
    }
  }
}

/** Registry metadata for {@link WaterHeaterControl}. */
export const waterHeaterMeta = defineSensor({
  type: SensorType.WaterHeater,
  category: SensorCategory.Control,
  assignmentKey: 'waterHeater',
  multiProvider: true,
  isDetectionType: false,
  properties: {
    [WaterHeaterProperty.CurrentTemperature]: { type: 'number', unit: '°C' },
    [WaterHeaterProperty.TargetTemperature]: { type: 'number', min: 30, max: 75, step: 0.5, unit: '°C', writable: true },
    [WaterHeaterProperty.Mode]: {
      type: 'enum',
      values: {
        off: WaterHeaterMode.Off,
        eco: WaterHeaterMode.Eco,
        electric: WaterHeaterMode.Electric,
        gas: WaterHeaterMode.Gas,
        heat_pump: WaterHeaterMode.HeatPump,
        high_demand: WaterHeaterMode.HighDemand,
        performance: WaterHeaterMode.Performance,
        auto: WaterHeaterMode.Auto,
        heat: WaterHeaterMode.Heat,
        on: WaterHeaterMode.On,
      },
      writable: true,
    },
    [WaterHeaterProperty.Away]: { type: 'boolean', writable: true },
  },
  shortcutable: true,
  cascadeTrigger: { property: WaterHeaterProperty.Mode, values: Object.values(WaterHeaterMode).filter((mode) => mode !== WaterHeaterMode.Off), sustained: true },
  propertyCapabilities: {
    [WaterHeaterProperty.Away]: WaterHeaterCapability.Away,
  },
  virtual: {
    properties: { [WaterHeaterProperty.Mode]: WaterHeaterMode.Off, [WaterHeaterProperty.TargetTemperature]: 50 },
    optionalCapabilities: { [WaterHeaterCapability.Away]: { [WaterHeaterProperty.Away]: false } },
  },
  semantics: {
    domain: SensorDomain.WaterHeater,
    stateProperty: WaterHeaterProperty.Mode,
    commandProperty: WaterHeaterProperty.Mode,
    climate: {
      current: WaterHeaterProperty.CurrentTemperature,
      target: WaterHeaterProperty.TargetTemperature,
      mode: WaterHeaterProperty.Mode,
    },
    toggles: [WaterHeaterProperty.Away],
  },
});
