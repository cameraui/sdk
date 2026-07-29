import { Sensor, SensorType, SensorCategory } from './base.js';
import { defineSensor, SensorDomain } from './meta.js';

import type { Observable } from '../observable/index.js';
import type { PropertyChangeOf, SensorLike, SensorOptions } from './base.js';

/**
 * Property names of a temperature sensor.
 *
 * @internal
 */
export enum TemperatureProperty {
  /** Current temperature in degrees Celsius. */
  Current = 'current',
}

/**
 * Property values of a temperature sensor.
 *
 * @internal
 */
export interface TemperatureInfoProperties {
  [TemperatureProperty.Current]: number;
}

/** Read-only proxy interface for a temperature sensor. */
export interface TemperatureInfoLike extends SensorLike {
  readonly type: SensorType.Temperature;
  readonly onPropertyChanged: Observable<PropertyChangeOf<TemperatureInfoProperties>>;

  getValue(property: TemperatureProperty.Current): number | undefined;
  getValue(property: string): unknown;
}

/** Temperature info sensor. Reports current temperature in °C. */
export class TemperatureInfo<TStorage extends object = Record<string, any>> extends Sensor<TemperatureInfoProperties, TStorage> {
  readonly type = SensorType.Temperature;
  readonly category = SensorCategory.Info;

  constructor(name = 'Temperature', options?: SensorOptions) {
    super(name, options);

    this._writeState({ [TemperatureProperty.Current]: 20 });
  }

  get current(): number {
    return this.props.current;
  }

  /**
   * Report a new temperature reading. Clamped to [-270, 100] °C.
   *
   * @param value - Temperature reading in degrees Celsius.
   *
   * @example
   * ```ts
   * temperature.setCurrent(21.5);
   * ```
   */
  setCurrent(value: number): void {
    this._writeState({ [TemperatureProperty.Current]: Math.max(-270, Math.min(100, value)) });
  }

  /**
   * Read-only sensor: external writes are ignored.
   *
   * @internal
   */
  updateValue(_property: string, _value: unknown): void {}
}

/** Registry metadata for {@link TemperatureInfo}. */
export const temperatureMeta = defineSensor({
  type: SensorType.Temperature,
  category: SensorCategory.Info,
  assignmentKey: 'temperature',
  multiProvider: true,
  isDetectionType: false,
  properties: {
    [TemperatureProperty.Current]: { type: 'number', unit: '°C', writable: true },
  },
  shortcutable: true,
  virtual: { properties: { [TemperatureProperty.Current]: 20 } },
  semantics: {
    domain: SensorDomain.Measurement,
    stateProperty: TemperatureProperty.Current,
    commandProperty: TemperatureProperty.Current,
    deviceClass: 'temperature',
    unit: '°C',
  },
});
