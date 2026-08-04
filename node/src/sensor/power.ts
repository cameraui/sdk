import { Sensor, SensorType, SensorCategory } from './base.js';
import { defineSensor, SensorDomain } from './meta.js';

import type { Observable } from '../observable/index.js';
import type { PropertyChangeOf, SensorLike, SensorOptions } from './base.js';

/**
 * Property names of a power sensor.
 *
 * @internal
 */
export enum PowerProperty {
  /** Whether power is detected. */
  Detected = 'detected',
}

/**
 * Property values of a power sensor.
 *
 * @internal
 */
export interface PowerSensorProperties {
  [PowerProperty.Detected]: boolean;
}

/** Read-only proxy interface for a power sensor. */
export interface PowerSensorLike extends SensorLike {
  readonly type: SensorType.Power;
  readonly onPropertyChanged: Observable<PropertyChangeOf<PowerSensorProperties>>;

  getValue(property: PowerProperty.Detected): boolean | undefined;
  getValue(property: string): unknown;
}

/** Power detection sensor. */
export class PowerSensor<TStorage extends object = Record<string, any>> extends Sensor<PowerSensorProperties, TStorage> {
  readonly type = SensorType.Power;
  readonly category = SensorCategory.Sensor;

  constructor(name = 'Power Sensor', options?: SensorOptions) {
    super(name, options);

    this._writeState({ [PowerProperty.Detected]: false });
  }

  get detected(): boolean {
    return this.props.detected;
  }

  /**
   * Report power detection state.
   *
   * @param value - True when power is currently detected.
   *
   * @example
   * ```ts
   * power.setDetected(true);
   * ```
   */
  setDetected(value: boolean): void {
    this._writeState({ [PowerProperty.Detected]: value });
  }

  /**
   * Read-only sensor: external writes are ignored.
   *
   * @internal
   */
  updateValue(_property: string, _value: unknown): void {}
}

/** Registry metadata for {@link PowerSensor}. */
export const powerMeta = defineSensor({
  type: SensorType.Power,
  category: SensorCategory.Sensor,
  assignmentKey: 'power',
  multiProvider: true,
  isDetectionType: false,
  properties: {
    [PowerProperty.Detected]: { type: 'boolean', writable: true },
  },
  shortcutable: true,
  cascadeTrigger: { property: PowerProperty.Detected, value: true, sustained: true },
  virtual: { properties: { [PowerProperty.Detected]: false } },
  semantics: {
    domain: SensorDomain.Binary,
    stateProperty: PowerProperty.Detected,
    commandProperty: PowerProperty.Detected,
    deviceClass: 'power',
  },
});
