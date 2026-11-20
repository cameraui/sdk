import { SensorType } from './base.js';
import { defineMeasurement, MeasurementInfo } from './measurement.js';

import type { Observable } from '../observable/index.js';
import type { PropertyChangeOf, SensorLike, SensorOptions } from './base.js';

/** Property names of a humidity sensor. */
export enum HumidityProperty {
  /** Current relative humidity (0-100%). */
  Current = 'current',
}

/** Property values of a humidity sensor. */
export interface HumidityInfoProperties {
  [HumidityProperty.Current]: number;
}

/** Read-only proxy interface for a humidity sensor. */
export interface HumidityInfoLike extends SensorLike {
  readonly type: SensorType.Humidity;
  readonly onPropertyChanged: Observable<PropertyChangeOf<HumidityInfoProperties>>;

  getValue(property: HumidityProperty.Current): number | undefined;
  getValue(property: string): unknown;
}

/** Humidity info sensor. Reports current relative humidity in %. */
export class HumidityInfo<TStorage extends object = Record<string, any>> extends MeasurementInfo<HumidityInfoProperties, TStorage> {
  readonly type = SensorType.Humidity;

  constructor(name = 'Humidity', options?: SensorOptions) {
    super(name, humidityMeta, options);
  }
}

/** Registry metadata for {@link HumidityInfo}. */
export const humidityMeta = defineMeasurement(SensorType.Humidity, 'humidity', {
  unit: '%',
  deviceClass: 'humidity',
  initial: 50,
  min: 0,
  max: 100,
});
