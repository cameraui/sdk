import { SensorType } from './base.js';
import { BinarySensor, defineBinarySensor } from './binary.js';

import type { Observable } from '../observable/index.js';
import type { PropertyChangeOf, SensorLike, SensorOptions } from './base.js';

/** Property names of an occupancy sensor. */
export enum OccupancyProperty {
  /** Whether occupancy is detected (true = occupied). */
  Detected = 'detected',
}

/** Property values of an occupancy sensor. */
export interface OccupancySensorProperties {
  [OccupancyProperty.Detected]: boolean;
}

/** Read-only proxy interface for an occupancy sensor. */
export interface OccupancySensorLike extends SensorLike {
  readonly type: SensorType.Occupancy;
  readonly onPropertyChanged: Observable<PropertyChangeOf<OccupancySensorProperties>>;

  getValue(property: OccupancyProperty.Detected): boolean | undefined;
  getValue(property: string): unknown;
}

/** Occupancy sensor for detecting presence in a room or area. */
export class OccupancySensor<TStorage extends object = Record<string, any>> extends BinarySensor<OccupancySensorProperties, TStorage> {
  readonly type = SensorType.Occupancy;

  constructor(name = 'Occupancy Sensor', options?: SensorOptions) {
    super(name, options);
  }
}

/** Registry metadata for {@link OccupancySensor}. */
export const occupancyMeta = defineBinarySensor(SensorType.Occupancy, 'occupancy', 'occupancy');
