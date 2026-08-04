import { Sensor, SensorType, SensorCategory } from './base.js';
import { defineSensor, SensorDomain } from './meta.js';

import type { Observable } from '../observable/index.js';
import type { PropertyChangeOf, SensorLike, SensorOptions } from './base.js';

/**
 * Property names of a problem sensor.
 *
 * @internal
 */
export enum ProblemProperty {
  /** Whether a problem is detected. */
  Detected = 'detected',
}

/**
 * Property values of a problem sensor.
 *
 * @internal
 */
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
export class ProblemSensor<TStorage extends object = Record<string, any>> extends Sensor<ProblemSensorProperties, TStorage> {
  readonly type = SensorType.Problem;
  readonly category = SensorCategory.Sensor;

  constructor(name = 'Problem Sensor', options?: SensorOptions) {
    super(name, options);

    this._writeState({ [ProblemProperty.Detected]: false });
  }

  get detected(): boolean {
    return this.props.detected;
  }

  /**
   * Report the problem state.
   *
   * @param value - True when problem is currently detected.
   *
   * @example
   * ```ts
   * problem.setDetected(true);
   * ```
   */
  setDetected(value: boolean): void {
    this._writeState({ [ProblemProperty.Detected]: value });
  }

  /**
   * Read-only sensor: external writes are ignored.
   *
   * @internal
   */
  updateValue(_property: string, _value: unknown): void {}
}

/** Registry metadata for {@link ProblemSensor}. */
export const problemMeta = defineSensor({
  type: SensorType.Problem,
  category: SensorCategory.Sensor,
  assignmentKey: 'problem',
  multiProvider: true,
  isDetectionType: false,
  properties: {
    [ProblemProperty.Detected]: { type: 'boolean', writable: true },
  },
  shortcutable: true,
  cascadeTrigger: { property: ProblemProperty.Detected, value: true, sustained: true },
  virtual: { properties: { [ProblemProperty.Detected]: false } },
  semantics: {
    domain: SensorDomain.Binary,
    stateProperty: ProblemProperty.Detected,
    commandProperty: ProblemProperty.Detected,
    deviceClass: 'problem',
  },
});
