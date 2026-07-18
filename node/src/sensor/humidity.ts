import { Sensor, SensorType, SensorCategory } from './base.js';
import { defineSensor, SensorDomain } from './meta.js';

import type { Observable } from '../observable/index.js';
import type { PropertyChangeOf, SensorLike } from './base.js';

/**
 * Properties for humidity sensors
 *
 * @internal
 */
export enum HumidityProperty {
  /** Current relative humidity (0-100%) */
  Current = 'current',
}

/**
 * Property value map for humidity info sensors.
 *
 * @internal
 */
export interface HumidityInfoProperties {
  [HumidityProperty.Current]: number;
}

/** Read-only proxy interface for a humidity sensor */
export interface HumidityInfoLike extends SensorLike {
  readonly type: SensorType.Humidity;
  readonly onPropertyChanged: Observable<PropertyChangeOf<HumidityInfoProperties>>;

  getValue(property: HumidityProperty.Current): number | undefined;
  getValue(property: string): unknown;
}

/** Humidity info sensor. Reports current relative humidity in %. */
export class HumidityInfo<TStorage extends object = Record<string, any>> extends Sensor<HumidityInfoProperties, TStorage> {
  readonly type = SensorType.Humidity;
  readonly category = SensorCategory.Info;

  constructor(name = 'Humidity') {
    super(name);

    this._writeState({ [HumidityProperty.Current]: 50 });
  }

  get current(): number {
    return this.props.current;
  }

  /**
   * Report a new humidity reading. Clamped to [0, 100] %.
   *
   * @param value - Relative humidity percentage in the range 0-100.
   *
   * @example
   * ```ts
   * humidity.setCurrent(63);
   * ```
   */
  setCurrent(value: number): void {
    this._writeState({ [HumidityProperty.Current]: Math.max(0, Math.min(100, value)) });
  }

  /**
   * Read-only sensor: external writes are ignored. Reading via `setCurrent` is plugin-only.
   *
   * Called by the cross-process plugin host when a generic property write is received.
   * Humidity sensors have no externally writable properties, so the parameters are
   * unused (underscore-prefixed) and the call is a no-op.
   *
   * @param _property - Unused — humidity sensors expose no writable properties.
   *
   * @param _value - Unused — humidity sensors expose no writable properties.
   *
   * @internal
   */
  updateValue(_property: string, _value: unknown): void {
    // No-op — humidity is reported by the plugin, not set externally.
  }
}

/** Registry metadata for {@link HumidityInfo}. */
export const humidityMeta = defineSensor({
  type: SensorType.Humidity,
  category: SensorCategory.Info,
  assignmentKey: 'humidity',
  multiProvider: true,
  isDetectionType: false,
  properties: Object.values(HumidityProperty),
  shortcutable: true,
  virtual: { properties: { [HumidityProperty.Current]: 50 } },
  semantics: {
    domain: SensorDomain.Measurement,
    stateProperty: HumidityProperty.Current,
    commandProperty: HumidityProperty.Current,
    deviceClass: 'humidity',
    unit: '%',
  },
});
