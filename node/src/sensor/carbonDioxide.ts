import { SensorType } from './base.js';
import { defineMeasurement, MeasurementInfo } from './measurement.js';

import type { Observable } from '../observable/index.js';
import type { PropertyChangeOf, SensorLike, SensorOptions } from './base.js';

/** Property names of a carbon dioxide sensor. */
export enum CarbonDioxideProperty {
  /** Current CO2 concentration in parts per million. */
  Current = 'current',
}

/** Property values of a carbon dioxide sensor. */
export interface CarbonDioxideInfoProperties {
  [CarbonDioxideProperty.Current]: number;
}

/** Read-only proxy interface for a carbon dioxide sensor. */
export interface CarbonDioxideInfoLike extends SensorLike {
  readonly type: SensorType.CarbonDioxide;
  readonly onPropertyChanged: Observable<PropertyChangeOf<CarbonDioxideInfoProperties>>;

  getValue(property: CarbonDioxideProperty.Current): number | undefined;
  getValue(property: string): unknown;
}

/** Carbon dioxide info sensor. Reports current CO2 concentration in ppm. */
export class CarbonDioxideInfo<TStorage extends object = Record<string, any>> extends MeasurementInfo<CarbonDioxideInfoProperties, TStorage> {
  readonly type = SensorType.CarbonDioxide;

  constructor(name = 'Carbon Dioxide', options?: SensorOptions) {
    super(name, carbonDioxideMeta, options);
  }
}

/** Registry metadata for {@link CarbonDioxideInfo}. */
export const carbonDioxideMeta = defineMeasurement(SensorType.CarbonDioxide, 'carbonDioxide', {
  unit: 'ppm',
  deviceClass: 'carbon_dioxide',
  initial: 400,
  min: 0,
});
