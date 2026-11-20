import { SensorType } from './base.js';
import { BinarySensor, defineBinarySensor } from './binary.js';

import type { Observable } from '../observable/index.js';
import type { PropertyChangeOf, SensorLike, SensorOptions } from './base.js';

/** Property names of a power sensor. */
export enum PowerProperty {
  /** Whether power is detected. */
  Detected = 'detected',
}

/** Property values of a power sensor. */
export interface PowerSensorProperties {
  [PowerProperty.Detected]: boolean;
}

/** Read-only proxy interface for a power sensor. */
export interface PowerSensorLike extends SensorLike {
  readonly type: SensorType.Power;
  readonly onPropertyChanged: Observable<PropertyChangeOf<PowerSensorProperties>>;

  getValue(property: PowerProperty.Detected): boolean | undefined;
  getValue(property: string): unknown;
}

/** Power detection sensor. */
export class PowerSensor<TStorage extends object = Record<string, any>> extends BinarySensor<PowerSensorProperties, TStorage> {
  readonly type = SensorType.Power;

  constructor(name = 'Power Sensor', options?: SensorOptions) {
    super(name, options);
  }
}

/** Registry metadata for {@link PowerSensor}. */
export const powerMeta = defineBinarySensor(SensorType.Power, 'power', 'power');
