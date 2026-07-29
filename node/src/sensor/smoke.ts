import { Sensor, SensorType, SensorCategory } from './base.js';
import { defineSensor, SensorDomain } from './meta.js';

import type { Observable } from '../observable/index.js';
import type { PropertyChangeOf, SensorLike, SensorOptions } from './base.js';

/**
 * Property names of a smoke sensor.
 *
 * @internal
 */
export enum SmokeProperty {
  /** Whether smoke is detected. */
  Detected = 'detected',
}

/**
 * Property values of a smoke sensor.
 *
 * @internal
 */
export interface SmokeSensorProperties {
  [SmokeProperty.Detected]: boolean;
}

/** Read-only proxy interface for a smoke sensor. */
export interface SmokeSensorLike extends SensorLike {
  readonly type: SensorType.Smoke;
  readonly onPropertyChanged: Observable<PropertyChangeOf<SmokeSensorProperties>>;

  getValue(property: SmokeProperty.Detected): boolean | undefined;
  getValue(property: string): unknown;
}

/** Smoke detector sensor. */
export class SmokeSensor<TStorage extends object = Record<string, any>> extends Sensor<SmokeSensorProperties, TStorage> {
  readonly type = SensorType.Smoke;
  readonly category = SensorCategory.Sensor;

  constructor(name = 'Smoke Sensor', options?: SensorOptions) {
    super(name, options);

    this._writeState({ [SmokeProperty.Detected]: false });
  }

  get detected(): boolean {
    return this.props.detected;
  }

  /**
   * Report smoke detection state.
   *
   * @param value - True when smoke is currently detected.
   *
   * @example
   * ```ts
   * smoke.setDetected(true);
   * ```
   */
  setDetected(value: boolean): void {
    this._writeState({ [SmokeProperty.Detected]: value });
  }

  /**
   * Read-only sensor: external writes are ignored.
   *
   * @internal
   */
  updateValue(_property: string, _value: unknown): void {}
}

/** Registry metadata for {@link SmokeSensor}. */
export const smokeMeta = defineSensor({
  type: SensorType.Smoke,
  category: SensorCategory.Sensor,
  assignmentKey: 'smoke',
  multiProvider: true,
  isDetectionType: false,
  properties: {
    [SmokeProperty.Detected]: { type: 'boolean', writable: true },
  },
  shortcutable: true,
  cascadeTrigger: { property: SmokeProperty.Detected, value: true, sustained: true },
  virtual: { properties: { [SmokeProperty.Detected]: false } },
  semantics: {
    domain: SensorDomain.Binary,
    stateProperty: SmokeProperty.Detected,
    commandProperty: SmokeProperty.Detected,
    deviceClass: 'smoke',
  },
});
