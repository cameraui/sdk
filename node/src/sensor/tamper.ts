import { SensorType } from './base.js';
import { BinarySensor, defineBinarySensor } from './binary.js';

import type { Observable } from '../observable/index.js';
import type { PropertyChangeOf, SensorLike, SensorOptions } from './base.js';

/** Property names of a tamper sensor. */
export enum TamperProperty {
  /** Whether tampering is detected. */
  Detected = 'detected',
}

/** Property values of a tamper sensor. */
export interface TamperSensorProperties {
  [TamperProperty.Detected]: boolean;
}

/** Read-only proxy interface for a tamper sensor. */
export interface TamperSensorLike extends SensorLike {
  readonly type: SensorType.Tamper;
  readonly onPropertyChanged: Observable<PropertyChangeOf<TamperSensorProperties>>;

  getValue(property: TamperProperty.Detected): boolean | undefined;
  getValue(property: string): unknown;
}

/** Tamper sensor. */
export class TamperSensor<TStorage extends object = Record<string, any>> extends BinarySensor<TamperSensorProperties, TStorage> {
  readonly type = SensorType.Tamper;

  constructor(name = 'Tamper Sensor', options?: SensorOptions) {
    super(name, options);
  }
}

/** Registry metadata for {@link TamperSensor}. */
export const tamperMeta = defineBinarySensor(SensorType.Tamper, 'tamper', 'tamper');
