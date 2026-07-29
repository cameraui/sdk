import { Sensor, SensorType, SensorCategory } from './base.js';
import { defineSensor, SensorDomain } from './meta.js';

import type { Observable } from '../observable/index.js';
import type { PropertyChangeOf, SensorLike, SensorOptions } from './base.js';

/**
 * Property names of a leak sensor.
 *
 * @internal
 */
export enum LeakProperty {
  /** Whether a leak is detected. */
  Detected = 'detected',
}

/**
 * Property values of a leak sensor.
 *
 * @internal
 */
export interface LeakSensorProperties {
  [LeakProperty.Detected]: boolean;
}

/** Read-only proxy interface for a leak sensor. */
export interface LeakSensorLike extends SensorLike {
  readonly type: SensorType.Leak;
  readonly onPropertyChanged: Observable<PropertyChangeOf<LeakSensorProperties>>;

  getValue(property: LeakProperty.Detected): boolean | undefined;
  getValue(property: string): unknown;
}

/** Water leak detector sensor. */
export class LeakSensor<TStorage extends object = Record<string, any>> extends Sensor<LeakSensorProperties, TStorage> {
  readonly type = SensorType.Leak;
  readonly category = SensorCategory.Sensor;

  constructor(name = 'Leak Sensor', options?: SensorOptions) {
    super(name, options);

    this._writeState({ [LeakProperty.Detected]: false });
  }

  get detected(): boolean {
    return this.props.detected;
  }

  /**
   * Report leak detection state.
   *
   * @param value - True when a leak is currently detected.
   *
   * @example
   * ```ts
   * leak.setDetected(true);
   * ```
   */
  setDetected(value: boolean): void {
    this._writeState({ [LeakProperty.Detected]: value });
  }

  /**
   * Read-only sensor: external writes are ignored.
   *
   * @internal
   */
  updateValue(_property: string, _value: unknown): void {}
}

/** Registry metadata for {@link LeakSensor}. */
export const leakMeta = defineSensor({
  type: SensorType.Leak,
  category: SensorCategory.Sensor,
  assignmentKey: 'leak',
  multiProvider: true,
  isDetectionType: false,
  properties: {
    [LeakProperty.Detected]: { type: 'boolean', writable: true },
  },
  shortcutable: true,
  cascadeTrigger: { property: LeakProperty.Detected, value: true, sustained: true },
  virtual: { properties: { [LeakProperty.Detected]: false } },
  semantics: {
    domain: SensorDomain.Binary,
    stateProperty: LeakProperty.Detected,
    commandProperty: LeakProperty.Detected,
    deviceClass: 'moisture',
  },
});
