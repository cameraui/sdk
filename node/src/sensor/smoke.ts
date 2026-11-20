import { SensorType } from './base.js';
import { BinarySensor, defineBinarySensor } from './binary.js';

import type { Observable } from '../observable/index.js';
import type { PropertyChangeOf, SensorLike, SensorOptions } from './base.js';

/** Property names of a smoke sensor. */
export enum SmokeProperty {
  /** Whether smoke is detected. */
  Detected = 'detected',
}

/** Property values of a smoke sensor. */
export interface SmokeSensorProperties {
  [SmokeProperty.Detected]: boolean;
}

/** Read-only proxy interface for a smoke sensor. */
export interface SmokeSensorLike extends SensorLike {
  readonly type: SensorType.Smoke;
  readonly onPropertyChanged: Observable<PropertyChangeOf<SmokeSensorProperties>>;

  getValue(property: SmokeProperty.Detected): boolean | undefined;
  getValue(property: string): unknown;
}

/** Smoke detector sensor. */
export class SmokeSensor<TStorage extends object = Record<string, any>> extends BinarySensor<SmokeSensorProperties, TStorage> {
  readonly type = SensorType.Smoke;

  constructor(name = 'Smoke Sensor', options?: SensorOptions) {
    super(name, options);
  }
}

/** Registry metadata for {@link SmokeSensor}. */
export const smokeMeta = defineBinarySensor(SensorType.Smoke, 'smoke', 'smoke');
