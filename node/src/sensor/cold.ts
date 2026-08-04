import { Sensor, SensorType, SensorCategory } from './base.js';
import { defineSensor, SensorDomain } from './meta.js';

import type { Observable } from '../observable/index.js';
import type { PropertyChangeOf, SensorLike, SensorOptions } from './base.js';

/**
 * Property names of a cold sensor.
 *
 * @internal
 */
export enum ColdProperty {
  /** Whether abnormal cold is detected. */
  Detected = 'detected',
}

/**
 * Property values of a cold sensor.
 *
 * @internal
 */
export interface ColdSensorProperties {
  [ColdProperty.Detected]: boolean;
}

/** Read-only proxy interface for a cold sensor. */
export interface ColdSensorLike extends SensorLike {
  readonly type: SensorType.Cold;
  readonly onPropertyChanged: Observable<PropertyChangeOf<ColdSensorProperties>>;

  getValue(property: ColdProperty.Detected): boolean | undefined;
  getValue(property: string): unknown;
}

/** Cold alarm sensor. */
export class ColdSensor<TStorage extends object = Record<string, any>> extends Sensor<ColdSensorProperties, TStorage> {
  readonly type = SensorType.Cold;
  readonly category = SensorCategory.Sensor;

  constructor(name = 'Cold Sensor', options?: SensorOptions) {
    super(name, options);

    this._writeState({ [ColdProperty.Detected]: false });
  }

  get detected(): boolean {
    return this.props.detected;
  }

  /**
   * Report abnormal cold detection state.
   *
   * @param value - True when cold is currently detected.
   *
   * @example
   * ```ts
   * cold.setDetected(true);
   * ```
   */
  setDetected(value: boolean): void {
    this._writeState({ [ColdProperty.Detected]: value });
  }

  /**
   * Read-only sensor: external writes are ignored.
   *
   * @internal
   */
  updateValue(_property: string, _value: unknown): void {}
}

/** Registry metadata for {@link ColdSensor}. */
export const coldMeta = defineSensor({
  type: SensorType.Cold,
  category: SensorCategory.Sensor,
  assignmentKey: 'cold',
  multiProvider: true,
  isDetectionType: false,
  properties: {
    [ColdProperty.Detected]: { type: 'boolean', writable: true },
  },
  shortcutable: true,
  cascadeTrigger: { property: ColdProperty.Detected, value: true, sustained: true },
  virtual: { properties: { [ColdProperty.Detected]: false } },
  semantics: {
    domain: SensorDomain.Binary,
    stateProperty: ColdProperty.Detected,
    commandProperty: ColdProperty.Detected,
    deviceClass: 'cold',
  },
});
