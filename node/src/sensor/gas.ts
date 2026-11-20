import { SensorType } from './base.js';
import { BinarySensor, defineBinarySensor } from './binary.js';

import type { Observable } from '../observable/index.js';
import type { PropertyChangeOf, SensorLike, SensorOptions } from './base.js';

/** Property names of a gas sensor. */
export enum GasProperty {
  /** Whether gas is detected. */
  Detected = 'detected',
}

/** Property values of a gas sensor. */
export interface GasSensorProperties {
  [GasProperty.Detected]: boolean;
}

/** Read-only proxy interface for a gas sensor. */
export interface GasSensorLike extends SensorLike {
  readonly type: SensorType.Gas;
  readonly onPropertyChanged: Observable<PropertyChangeOf<GasSensorProperties>>;

  getValue(property: GasProperty.Detected): boolean | undefined;
  getValue(property: string): unknown;
}

/** Gas detector sensor. */
export class GasSensor<TStorage extends object = Record<string, any>> extends BinarySensor<GasSensorProperties, TStorage> {
  readonly type = SensorType.Gas;

  constructor(name = 'Gas Sensor', options?: SensorOptions) {
    super(name, options);
  }
}

/** Registry metadata for {@link GasSensor}. */
export const gasMeta = defineBinarySensor(SensorType.Gas, 'gas', 'gas');
