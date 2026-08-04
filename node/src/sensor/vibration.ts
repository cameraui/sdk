import { Sensor, SensorType, SensorCategory } from './base.js';
import { defineSensor, SensorDomain } from './meta.js';

import type { Observable } from '../observable/index.js';
import type { PropertyChangeOf, SensorLike, SensorOptions } from './base.js';

/**
 * Property names of a vibration sensor.
 *
 * @internal
 */
export enum VibrationProperty {
  /** Whether vibration is detected. */
  Detected = 'detected',
}

/**
 * Property values of a vibration sensor.
 *
 * @internal
 */
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
export class VibrationSensor<TStorage extends object = Record<string, any>> extends Sensor<VibrationSensorProperties, TStorage> {
  readonly type = SensorType.Vibration;
  readonly category = SensorCategory.Sensor;

  constructor(name = 'Vibration Sensor', options?: SensorOptions) {
    super(name, options);

    this._writeState({ [VibrationProperty.Detected]: false });
  }

  get detected(): boolean {
    return this.props.detected;
  }

  /**
   * Report vibration detection state.
   *
   * @param value - True when vibration is currently detected.
   *
   * @example
   * ```ts
   * vibration.setDetected(true);
   * ```
   */
  setDetected(value: boolean): void {
    this._writeState({ [VibrationProperty.Detected]: value });
  }

  /**
   * Read-only sensor: external writes are ignored.
   *
   * @internal
   */
  updateValue(_property: string, _value: unknown): void {}
}

/** Registry metadata for {@link VibrationSensor}. */
export const vibrationMeta = defineSensor({
  type: SensorType.Vibration,
  category: SensorCategory.Sensor,
  assignmentKey: 'vibration',
  multiProvider: true,
  isDetectionType: false,
  properties: {
    [VibrationProperty.Detected]: { type: 'boolean', writable: true },
  },
  shortcutable: true,
  cascadeTrigger: { property: VibrationProperty.Detected, value: true, sustained: true },
  virtual: { properties: { [VibrationProperty.Detected]: false } },
  semantics: {
    domain: SensorDomain.Binary,
    stateProperty: VibrationProperty.Detected,
    commandProperty: VibrationProperty.Detected,
    deviceClass: 'vibration',
  },
});
