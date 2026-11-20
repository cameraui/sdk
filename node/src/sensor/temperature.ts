import { SensorType } from './base.js';
import { defineMeasurement, MeasurementInfo } from './measurement.js';

import type { Observable } from '../observable/index.js';
import type { PropertyChangeOf, SensorLike, SensorOptions } from './base.js';

/** Property names of a temperature sensor. */
export enum TemperatureProperty {
  /** Current temperature in degrees Celsius. */
  Current = 'current',
}

/** Property values of a temperature sensor. */
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
export class TemperatureInfo<TStorage extends object = Record<string, any>> extends MeasurementInfo<TemperatureInfoProperties, TStorage> {
  readonly type = SensorType.Temperature;

  constructor(name = 'Temperature', options?: SensorOptions) {
    super(name, temperatureMeta, options);
  }
}

/** Registry metadata for {@link TemperatureInfo}. */
export const temperatureMeta = defineMeasurement(SensorType.Temperature, 'temperature', {
  unit: '°C',
  deviceClass: 'temperature',
  initial: 20,
  min: -273.15,
});
