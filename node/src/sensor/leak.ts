import { Sensor, SensorType, SensorCategory } from './base.js';
import { defineSensor, SensorDomain } from './meta.js';

import type { Observable } from '../observable/index.js';
import type { PropertyChangeOf, SensorLike } from './base.js';

/**
 * Properties for leak sensors
 *
 * @internal
 */
export enum LeakProperty {
  /** Whether a leak is detected */
  Detected = 'detected',
}

/**
 * Property value map for leak sensors.
 *
 * @internal
 */
export interface LeakSensorProperties {
  [LeakProperty.Detected]: boolean;
}

/** Read-only proxy interface for a leak sensor */
export interface LeakSensorLike extends SensorLike {
  readonly type: SensorType.Leak;
  readonly onPropertyChanged: Observable<PropertyChangeOf<LeakSensorProperties>>;

  getValue(property: LeakProperty.Detected): boolean | undefined;
  getValue(property: string): unknown;
}

/** Water leak detector sensor */
export class LeakSensor<TStorage extends object = Record<string, any>> extends Sensor<LeakSensorProperties, TStorage> {
  readonly type = SensorType.Leak;
  readonly category = SensorCategory.Sensor;

  constructor(name = 'Leak Sensor') {
    super(name);

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
   * Read-only sensor: external writes are ignored. State is reported via `setDetected`.
   *
   * Called by the cross-process plugin host when a generic property write is received.
   * Leak sensors have no externally writable properties, so the parameters are
   * unused (underscore-prefixed) and the call is a no-op.
   *
   * @param _property - Unused — leak sensors expose no writable properties.
   *
   * @param _value - Unused — leak sensors expose no writable properties.
   *
   * @internal
   */
  updateValue(_property: string, _value: unknown): void {
    // No-op — leak state is reported by the plugin, not set externally.
  }
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
