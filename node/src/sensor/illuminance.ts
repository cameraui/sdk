import { Sensor, SensorType, SensorCategory } from './base.js';
import { defineSensor, SensorDomain } from './meta.js';

import type { Observable } from '../observable/index.js';
import type { PropertyChangeOf, SensorLike, SensorOptions } from './base.js';

/**
 * Property names of an illuminance sensor.
 *
 * @internal
 */
export enum IlluminanceProperty {
  /** Current illuminance in lux. */
  Current = 'current',
}

/**
 * Property values of an illuminance sensor.
 *
 * @internal
 */
export interface IlluminanceInfoProperties {
  [IlluminanceProperty.Current]: number;
}

/** Read-only proxy interface for an illuminance sensor. */
export interface IlluminanceInfoLike extends SensorLike {
  readonly type: SensorType.Illuminance;
  readonly onPropertyChanged: Observable<PropertyChangeOf<IlluminanceInfoProperties>>;

  getValue(property: IlluminanceProperty.Current): number | undefined;
  getValue(property: string): unknown;
}

/** Illuminance info sensor. Reports current light level in lux. */
export class IlluminanceInfo<TStorage extends object = Record<string, any>> extends Sensor<IlluminanceInfoProperties, TStorage> {
  readonly type = SensorType.Illuminance;
  readonly category = SensorCategory.Info;

  constructor(name = 'Illuminance', options?: SensorOptions) {
    super(name, options);

    this._writeState({ [IlluminanceProperty.Current]: 0 });
  }

  get current(): number {
    return this.props.current;
  }

  /**
   * Report a new illuminance reading. Clamped to [0, 200000] lx.
   *
   * @param value - Illuminance reading in lux.
   *
   * @example
   * ```ts
   * illuminance.setCurrent(120);
   * ```
   */
  setCurrent(value: number): void {
    this._writeState({ [IlluminanceProperty.Current]: Math.max(0, Math.min(200000, value)) });
  }

  /**
   * Read-only sensor: external writes are ignored.
   *
   * @internal
   */
  updateValue(_property: string, _value: unknown): void {}
}

/** Registry metadata for {@link IlluminanceInfo}. */
export const illuminanceMeta = defineSensor({
  type: SensorType.Illuminance,
  category: SensorCategory.Info,
  assignmentKey: 'illuminance',
  multiProvider: true,
  isDetectionType: false,
  properties: {
    [IlluminanceProperty.Current]: { type: 'number', unit: 'lx', writable: true },
  },
  shortcutable: true,
  virtual: { properties: { [IlluminanceProperty.Current]: 20 } },
  semantics: {
    domain: SensorDomain.Measurement,
    stateProperty: IlluminanceProperty.Current,
    commandProperty: IlluminanceProperty.Current,
    deviceClass: 'illuminance',
    unit: 'lx',
  },
});
