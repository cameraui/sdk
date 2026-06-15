import { Sensor, SensorType, SensorCategory } from './base.js';

import type { Observable } from '../observable/index.js';
import type { PropertyChangeOf, SensorLike } from './base.js';

/**
 * Properties for temperature sensors
 *
 * @internal
 */
export enum TemperatureProperty {
  /** Current temperature in degrees Celsius */
  Current = 'current',
}

/**
 * Property value map for temperature info sensors.
 *
 * @internal
 */
export interface TemperatureInfoProperties {
  [TemperatureProperty.Current]: number;
}

/** Read-only proxy interface for a temperature sensor */
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

  constructor(name = 'Temperature') {
    super(name);

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
   * Read-only sensor: external writes are ignored. Reading via `setCurrent` is plugin-only.
   *
   * Called by the cross-process plugin host when a generic property write is received.
   * Temperature sensors have no externally writable properties, so the parameters are
   * unused (underscore-prefixed) and the call is a no-op.
   *
   * @param _property - Unused — temperature sensors expose no writable properties.
   *
   * @param _value - Unused — temperature sensors expose no writable properties.
   *
   * @internal
   */
  updateValue(_property: string, _value: unknown): void {
    // No-op — temperature is reported by the plugin, not set externally.
  }
}
