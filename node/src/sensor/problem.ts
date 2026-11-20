import { SensorType } from './base.js';
import { BinarySensor, defineBinarySensor } from './binary.js';

import type { Observable } from '../observable/index.js';
import type { PropertyChangeOf, SensorLike, SensorOptions } from './base.js';

/** Property names of a problem sensor. */
export enum ProblemProperty {
  /** Whether a problem is detected. */
  Detected = 'detected',
}

/** Property values of a problem sensor. */
export interface ProblemSensorProperties {
  [ProblemProperty.Detected]: boolean;
}

/** Read-only proxy interface for a problem sensor. */
export interface ProblemSensorLike extends SensorLike {
  readonly type: SensorType.Problem;
  readonly onPropertyChanged: Observable<PropertyChangeOf<ProblemSensorProperties>>;

  getValue(property: ProblemProperty.Detected): boolean | undefined;
  getValue(property: string): unknown;
}

/** Generic problem/fault sensor. */
export class ProblemSensor<TStorage extends object = Record<string, any>> extends BinarySensor<ProblemSensorProperties, TStorage> {
  readonly type = SensorType.Problem;

  constructor(name = 'Problem Sensor', options?: SensorOptions) {
    super(name, options);
  }
}

/** Registry metadata for {@link ProblemSensor}. */
export const problemMeta = defineBinarySensor(SensorType.Problem, 'problem', 'problem');
