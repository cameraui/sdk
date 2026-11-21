import { SensorType } from './base.js';
import { BinarySensor, defineBinarySensor } from './binary.js';

import type { Observable } from '../observable/index.js';
import type { PropertyChangeOf, SensorLike, SensorOptions } from './base.js';

/** Property names of a glass break sensor. */
export enum GlassBreakProperty {
  /** Whether breaking glass is detected. */
  Detected = 'detected',
}

/** Property values of a glass break sensor. */
export interface GlassBreakSensorProperties {
  [GlassBreakProperty.Detected]: boolean;
}

/** Read-only proxy interface for a glass break sensor. */
export interface GlassBreakSensorLike extends SensorLike {
  readonly type: SensorType.GlassBreak;
  readonly onPropertyChanged: Observable<PropertyChangeOf<GlassBreakSensorProperties>>;

  getValue(property: GlassBreakProperty.Detected): boolean | undefined;
  getValue(property: string): unknown;
}

/** Glass break detector sensor. */
export class GlassBreakSensor<TStorage extends object = Record<string, any>> extends BinarySensor<GlassBreakSensorProperties, TStorage> {
  readonly type = SensorType.GlassBreak;

  constructor(name = 'Glass Break Sensor', options?: SensorOptions) {
    super(name, options);
  }
}

/** Registry metadata for {@link GlassBreakSensor}. */
export const glassBreakMeta = defineBinarySensor(SensorType.GlassBreak, 'glassBreak', 'safety');
