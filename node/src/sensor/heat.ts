import { SensorType } from './base.js';
import { BinarySensor, defineBinarySensor } from './binary.js';

import type { Observable } from '../observable/index.js';
import type { PropertyChangeOf, SensorLike, SensorOptions } from './base.js';

/** Property names of a heat sensor. */
export enum HeatProperty {
  /** Whether abnormal heat is detected. */
  Detected = 'detected',
}

/** Property values of a heat sensor. */
export interface HeatSensorProperties {
  [HeatProperty.Detected]: boolean;
}

/** Read-only proxy interface for a heat sensor. */
export interface HeatSensorLike extends SensorLike {
  readonly type: SensorType.Heat;
  readonly onPropertyChanged: Observable<PropertyChangeOf<HeatSensorProperties>>;

  getValue(property: HeatProperty.Detected): boolean | undefined;
  getValue(property: string): unknown;
}

/** Heat alarm sensor. */
export class HeatSensor<TStorage extends object = Record<string, any>> extends BinarySensor<HeatSensorProperties, TStorage> {
  readonly type = SensorType.Heat;

  constructor(name = 'Heat Sensor', options?: SensorOptions) {
    super(name, options);
  }
}

/** Registry metadata for {@link HeatSensor}. */
export const heatMeta = defineBinarySensor(SensorType.Heat, 'heat', 'heat');
