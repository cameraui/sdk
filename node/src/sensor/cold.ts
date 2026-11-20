import { SensorType } from './base.js';
import { BinarySensor, defineBinarySensor } from './binary.js';

import type { Observable } from '../observable/index.js';
import type { PropertyChangeOf, SensorLike, SensorOptions } from './base.js';

/** Property names of a cold sensor. */
export enum ColdProperty {
  /** Whether abnormal cold is detected. */
  Detected = 'detected',
}

/** Property values of a cold sensor. */
export interface ColdSensorProperties {
  [ColdProperty.Detected]: boolean;
}

/** Read-only proxy interface for a cold sensor. */
export interface ColdSensorLike extends SensorLike {
  readonly type: SensorType.Cold;
  readonly onPropertyChanged: Observable<PropertyChangeOf<ColdSensorProperties>>;

  getValue(property: ColdProperty.Detected): boolean | undefined;
  getValue(property: string): unknown;
}

/** Cold alarm sensor. */
export class ColdSensor<TStorage extends object = Record<string, any>> extends BinarySensor<ColdSensorProperties, TStorage> {
  readonly type = SensorType.Cold;

  constructor(name = 'Cold Sensor', options?: SensorOptions) {
    super(name, options);
  }
}

/** Registry metadata for {@link ColdSensor}. */
export const coldMeta = defineBinarySensor(SensorType.Cold, 'cold', 'cold');
