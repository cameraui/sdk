import { Sensor, SensorType, SensorCategory } from './base.js';
import { defineSensor, SensorDomain } from './meta.js';

import type { Observable } from '../observable/index.js';
import type { PropertyChangeOf, SensorLike, SensorOptions } from './base.js';

/**
 * Property names of a heat sensor.
 *
 * @internal
 */
export enum HeatProperty {
  /** Whether abnormal heat is detected. */
  Detected = 'detected',
}

/**
 * Property values of a heat sensor.
 *
 * @internal
 */
export interface HeatSensorProperties {
  [HeatProperty.Detected]: boolean;
}

/** Read-only proxy interface for a heat sensor. */
export interface HeatSensorLike extends SensorLike {
  readonly type: SensorType.Heat;
  readonly onPropertyChanged: Observable<PropertyChangeOf<HeatSensorProperties>>;

  getValue(property: HeatProperty.Detected): boolean | undefined;
  getValue(property: string): unknown;
}

/** Heat alarm sensor. */
export class HeatSensor<TStorage extends object = Record<string, any>> extends Sensor<HeatSensorProperties, TStorage> {
  readonly type = SensorType.Heat;
  readonly category = SensorCategory.Sensor;

  constructor(name = 'Heat Sensor', options?: SensorOptions) {
    super(name, options);

    this._writeState({ [HeatProperty.Detected]: false });
  }

  get detected(): boolean {
    return this.props.detected;
  }

  /**
   * Report abnormal heat detection state.
   *
   * @param value - True when heat is currently detected.
   *
   * @example
   * ```ts
   * heat.setDetected(true);
   * ```
   */
  setDetected(value: boolean): void {
    this._writeState({ [HeatProperty.Detected]: value });
  }

  /**
   * Read-only sensor: external writes are ignored.
   *
   * @internal
   */
  updateValue(_property: string, _value: unknown): void {}
}

/** Registry metadata for {@link HeatSensor}. */
export const heatMeta = defineSensor({
  type: SensorType.Heat,
  category: SensorCategory.Sensor,
  assignmentKey: 'heat',
  multiProvider: true,
  isDetectionType: false,
  properties: {
    [HeatProperty.Detected]: { type: 'boolean', writable: true },
  },
  shortcutable: true,
  cascadeTrigger: { property: HeatProperty.Detected, value: true, sustained: true },
  virtual: { properties: { [HeatProperty.Detected]: false } },
  semantics: {
    domain: SensorDomain.Binary,
    stateProperty: HeatProperty.Detected,
    commandProperty: HeatProperty.Detected,
    deviceClass: 'heat',
  },
});
