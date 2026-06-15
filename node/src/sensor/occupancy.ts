import { Sensor, SensorType, SensorCategory } from './base.js';

import type { Observable } from '../observable/index.js';
import type { PropertyChangeOf, SensorLike } from './base.js';

/**
 * Properties for occupancy sensors
 *
 * @internal
 */
export enum OccupancyProperty {
  /** Whether occupancy is detected (true = occupied) */
  Detected = 'detected',
}

/**
 * Property value map for occupancy sensors.
 *
 * @internal
 */
export interface OccupancySensorProperties {
  [OccupancyProperty.Detected]: boolean;
}

/** Read-only proxy interface for an occupancy sensor */
export interface OccupancySensorLike extends SensorLike {
  readonly type: SensorType.Occupancy;
  readonly onPropertyChanged: Observable<PropertyChangeOf<OccupancySensorProperties>>;

  getValue(property: OccupancyProperty.Detected): boolean | undefined;
  getValue(property: string): unknown;
}

/** Occupancy sensor for detecting presence in a room or area */
export class OccupancySensor<TStorage extends object = Record<string, any>> extends Sensor<OccupancySensorProperties, TStorage> {
  readonly type = SensorType.Occupancy;
  readonly category = SensorCategory.Sensor;

  constructor(name = 'Occupancy Sensor') {
    super(name);

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
   * Read-only sensor: external writes are ignored. State is reported via `setDetected`.
   *
   * Called by the cross-process plugin host when a generic property write is received.
   * Occupancy sensors have no externally writable properties, so the parameters are
   * unused (underscore-prefixed) and the call is a no-op.
   *
   * @param _property - Unused — occupancy sensors expose no writable properties.
   *
   * @param _value - Unused — occupancy sensors expose no writable properties.
   *
   * @internal
   */
  updateValue(_property: string, _value: unknown): void {
    // No-op — occupancy state is reported by the plugin, not set externally.
  }
}
