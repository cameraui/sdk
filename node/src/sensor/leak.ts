import { SensorType } from './base.js';
import { BinarySensor, defineBinarySensor } from './binary.js';

import type { Observable } from '../observable/index.js';
import type { PropertyChangeOf, SensorLike, SensorOptions } from './base.js';

/** Property names of a leak sensor. */
export enum LeakProperty {
  /** Whether a leak is detected. */
  Detected = 'detected',
}

/** Property values of a leak sensor. */
export interface LeakSensorProperties {
  [LeakProperty.Detected]: boolean;
}

/** Read-only proxy interface for a leak sensor. */
export interface LeakSensorLike extends SensorLike {
  readonly type: SensorType.Leak;
  readonly onPropertyChanged: Observable<PropertyChangeOf<LeakSensorProperties>>;

  getValue(property: LeakProperty.Detected): boolean | undefined;
  getValue(property: string): unknown;
}

/** Water leak detector sensor. */
export class LeakSensor<TStorage extends object = Record<string, any>> extends BinarySensor<LeakSensorProperties, TStorage> {
  readonly type = SensorType.Leak;

  constructor(name = 'Leak Sensor', options?: SensorOptions) {
    super(name, options);
  }
}

/** Registry metadata for {@link LeakSensor}. */
export const leakMeta = defineBinarySensor(SensorType.Leak, 'leak', 'moisture');
