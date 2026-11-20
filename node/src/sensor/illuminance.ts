import { SensorType } from './base.js';
import { defineMeasurement, MeasurementInfo } from './measurement.js';

import type { Observable } from '../observable/index.js';
import type { PropertyChangeOf, SensorLike, SensorOptions } from './base.js';

/** Property names of an illuminance sensor. */
export enum IlluminanceProperty {
  /** Current illuminance in lux. */
  Current = 'current',
}

/** Property values of an illuminance sensor. */
export interface IlluminanceInfoProperties {
  [IlluminanceProperty.Current]: number;
}

/** Read-only proxy interface for an illuminance sensor. */
export interface IlluminanceInfoLike extends SensorLike {
  readonly type: SensorType.Illuminance;
  readonly onPropertyChanged: Observable<PropertyChangeOf<IlluminanceInfoProperties>>;

  getValue(property: IlluminanceProperty.Current): number | undefined;
  getValue(property: string): unknown;
}

/** Illuminance info sensor. Reports current light level in lux. */
export class IlluminanceInfo<TStorage extends object = Record<string, any>> extends MeasurementInfo<IlluminanceInfoProperties, TStorage> {
  readonly type = SensorType.Illuminance;

  constructor(name = 'Illuminance', options?: SensorOptions) {
    super(name, illuminanceMeta, options);
  }
}

/** Registry metadata for {@link IlluminanceInfo}. */
export const illuminanceMeta = defineMeasurement(SensorType.Illuminance, 'illuminance', {
  unit: 'lx',
  deviceClass: 'illuminance',
  initial: 0,
  min: 0,
});
