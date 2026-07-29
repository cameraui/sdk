import { Sensor, SensorType, SensorCategory } from './base.js';
import { defineSensor, SensorDomain } from './meta.js';

import type { Observable } from '../observable/index.js';
import type { PropertyChangeOf, SensorLike, SensorOptions } from './base.js';

/**
 * Property names of an occupancy sensor.
 *
 * @internal
 */
export enum OccupancyProperty {
  /** Whether occupancy is detected (true = occupied). */
  Detected = 'detected',
}

/**
 * Property values of an occupancy sensor.
 *
 * @internal
 */
export interface OccupancySensorProperties {
  [OccupancyProperty.Detected]: boolean;
}

/** Read-only proxy interface for an occupancy sensor. */
export interface OccupancySensorLike extends SensorLike {
  readonly type: SensorType.Occupancy;
  readonly onPropertyChanged: Observable<PropertyChangeOf<OccupancySensorProperties>>;

  getValue(property: OccupancyProperty.Detected): boolean | undefined;
  getValue(property: string): unknown;
}

/** Occupancy sensor for detecting presence in a room or area. */
export class OccupancySensor<TStorage extends object = Record<string, any>> extends Sensor<OccupancySensorProperties, TStorage> {
  readonly type = SensorType.Occupancy;
  readonly category = SensorCategory.Sensor;

  constructor(name = 'Occupancy Sensor', options?: SensorOptions) {
    super(name, options);

    this._writeState({ [OccupancyProperty.Detected]: false });
  }

  get detected(): boolean {
    return this.props.detected;
  }

  /**
   * Report occupancy state.
   *
   * @param value - True when the area is currently occupied.
   *
   * @example
   * ```ts
   * occupancy.setDetected(true);
   * ```
   */
  setDetected(value: boolean): void {
    this._writeState({ [OccupancyProperty.Detected]: value });
  }

  /**
   * Read-only sensor: external writes are ignored.
   *
   * @internal
   */
  updateValue(_property: string, _value: unknown): void {}
}

/** Registry metadata for {@link OccupancySensor}. */
export const occupancyMeta = defineSensor({
  type: SensorType.Occupancy,
  category: SensorCategory.Sensor,
  assignmentKey: 'occupancy',
  multiProvider: true,
  isDetectionType: false,
  properties: {
    [OccupancyProperty.Detected]: { type: 'boolean', writable: true },
  },
  shortcutable: true,
  cascadeTrigger: { property: OccupancyProperty.Detected, value: true, sustained: true },
  virtual: { properties: { [OccupancyProperty.Detected]: false } },
  semantics: {
    domain: SensorDomain.Binary,
    stateProperty: OccupancyProperty.Detected,
    commandProperty: OccupancyProperty.Detected,
    deviceClass: 'occupancy',
  },
});
