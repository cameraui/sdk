import { SensorType } from './base.js';
import { BinarySensor, defineBinarySensor } from './binary.js';

import type { Observable } from '../observable/index.js';
import type { PropertyChangeOf, SensorLike, SensorOptions } from './base.js';

/** Property names of a vibration sensor. */
export enum VibrationProperty {
  /** Whether vibration is detected. */
  Detected = 'detected',
}

/** Property values of a vibration sensor. */
export interface VibrationSensorProperties {
  [VibrationProperty.Detected]: boolean;
}

/** Read-only proxy interface for a vibration sensor. */
export interface VibrationSensorLike extends SensorLike {
  readonly type: SensorType.Vibration;
  readonly onPropertyChanged: Observable<PropertyChangeOf<VibrationSensorProperties>>;

  getValue(property: VibrationProperty.Detected): boolean | undefined;
  getValue(property: string): unknown;
}

/** Vibration sensor. */
export class VibrationSensor<TStorage extends object = Record<string, any>> extends BinarySensor<VibrationSensorProperties, TStorage> {
  readonly type = SensorType.Vibration;

  constructor(name = 'Vibration Sensor', options?: SensorOptions) {
    super(name, options);
  }
}

/** Registry metadata for {@link VibrationSensor}. */
export const vibrationMeta = defineBinarySensor(SensorType.Vibration, 'vibration', 'vibration');
