import { Sensor, SensorType, SensorCategory } from './base.js';
import { defineSensor, SensorDomain } from './meta.js';

import type { Observable } from '../observable/index.js';
import type { PropertyChangeOf, SensorLike, SensorOptions } from './base.js';

/**
 * Property names of a tamper sensor.
 *
 * @internal
 */
export enum TamperProperty {
  /** Whether tampering is detected. */
  Detected = 'detected',
}

/**
 * Property values of a tamper sensor.
 *
 * @internal
 */
export interface TamperSensorProperties {
  [TamperProperty.Detected]: boolean;
}

/** Read-only proxy interface for a tamper sensor. */
export interface TamperSensorLike extends SensorLike {
  readonly type: SensorType.Tamper;
  readonly onPropertyChanged: Observable<PropertyChangeOf<TamperSensorProperties>>;

  getValue(property: TamperProperty.Detected): boolean | undefined;
  getValue(property: string): unknown;
}

/** Tamper sensor. */
export class TamperSensor<TStorage extends object = Record<string, any>> extends Sensor<TamperSensorProperties, TStorage> {
  readonly type = SensorType.Tamper;
  readonly category = SensorCategory.Sensor;

  constructor(name = 'Tamper Sensor', options?: SensorOptions) {
    super(name, options);

    this._writeState({ [TamperProperty.Detected]: false });
  }

  get detected(): boolean {
    return this.props.detected;
  }

  /**
   * Report tampering detection state.
   *
   * @param value - True when tamper is currently detected.
   *
   * @example
   * ```ts
   * tamper.setDetected(true);
   * ```
   */
  setDetected(value: boolean): void {
    this._writeState({ [TamperProperty.Detected]: value });
  }

  /**
   * Read-only sensor: external writes are ignored.
   *
   * @internal
   */
  updateValue(_property: string, _value: unknown): void {}
}

/** Registry metadata for {@link TamperSensor}. */
export const tamperMeta = defineSensor({
  type: SensorType.Tamper,
  category: SensorCategory.Sensor,
  assignmentKey: 'tamper',
  multiProvider: true,
  isDetectionType: false,
  properties: {
    [TamperProperty.Detected]: { type: 'boolean', writable: true },
  },
  shortcutable: true,
  cascadeTrigger: { property: TamperProperty.Detected, value: true, sustained: true },
  virtual: { properties: { [TamperProperty.Detected]: false } },
  semantics: {
    domain: SensorDomain.Binary,
    stateProperty: TamperProperty.Detected,
    commandProperty: TamperProperty.Detected,
    deviceClass: 'tamper',
  },
});
