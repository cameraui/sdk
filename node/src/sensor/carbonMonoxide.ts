import { SensorType } from './base.js';
import { BinarySensor, defineBinarySensor } from './binary.js';

import type { Observable } from '../observable/index.js';
import type { PropertyChangeOf, SensorLike, SensorOptions } from './base.js';

/** Property names of a carbon monoxide sensor. */
export enum CarbonMonoxideProperty {
  /** Whether carbon monoxide is detected. */
  Detected = 'detected',
}

/** Property values of a carbon monoxide sensor. */
export interface CarbonMonoxideSensorProperties {
  [CarbonMonoxideProperty.Detected]: boolean;
}

/** Read-only proxy interface for a carbon monoxide sensor. */
export interface CarbonMonoxideSensorLike extends SensorLike {
  readonly type: SensorType.CarbonMonoxide;
  readonly onPropertyChanged: Observable<PropertyChangeOf<CarbonMonoxideSensorProperties>>;

  getValue(property: CarbonMonoxideProperty.Detected): boolean | undefined;
  getValue(property: string): unknown;
}

/** Carbon monoxide detector sensor. */
export class CarbonMonoxideSensor<TStorage extends object = Record<string, any>> extends BinarySensor<CarbonMonoxideSensorProperties, TStorage> {
  readonly type = SensorType.CarbonMonoxide;

  constructor(name = 'Carbon Monoxide Sensor', options?: SensorOptions) {
    super(name, options);
  }
}

/** Registry metadata for {@link CarbonMonoxideSensor}. */
export const carbonMonoxideMeta = defineBinarySensor(SensorType.CarbonMonoxide, 'carbonMonoxide', 'carbon_monoxide');
