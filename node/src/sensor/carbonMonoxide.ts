import { Sensor, SensorType, SensorCategory } from './base.js';
import { defineSensor, SensorDomain } from './meta.js';

import type { Observable } from '../observable/index.js';
import type { PropertyChangeOf, SensorLike, SensorOptions } from './base.js';

/**
 * Property names of a carbon monoxide sensor.
 *
 * @internal
 */
export enum CarbonMonoxideProperty {
  /** Whether carbon monoxide is detected. */
  Detected = 'detected',
}

/**
 * Property values of a carbon monoxide sensor.
 *
 * @internal
 */
export interface CarbonMonoxideSensorProperties {
  [CarbonMonoxideProperty.Detected]: boolean;
}

/** Read-only proxy interface for a carbon monoxide sensor. */
export interface CarbonMonoxideSensorLike extends SensorLike {
  readonly type: SensorType.CarbonMonoxide;
  readonly onPropertyChanged: Observable<PropertyChangeOf<CarbonMonoxideSensorProperties>>;

  getValue(property: CarbonMonoxideProperty.Detected): boolean | undefined;
  getValue(property: string): unknown;
}

/** Carbon monoxide detector sensor. */
export class CarbonMonoxideSensor<TStorage extends object = Record<string, any>> extends Sensor<CarbonMonoxideSensorProperties, TStorage> {
  readonly type = SensorType.CarbonMonoxide;
  readonly category = SensorCategory.Sensor;

  constructor(name = 'Carbon Monoxide Sensor', options?: SensorOptions) {
    super(name, options);

    this._writeState({ [CarbonMonoxideProperty.Detected]: false });
  }

  get detected(): boolean {
    return this.props.detected;
  }

  /**
   * Report carbon monoxide detection state.
   *
   * @param value - True when carbonMonoxide is currently detected.
   *
   * @example
   * ```ts
   * carbonMonoxide.setDetected(true);
   * ```
   */
  setDetected(value: boolean): void {
    this._writeState({ [CarbonMonoxideProperty.Detected]: value });
  }

  /**
   * Read-only sensor: external writes are ignored.
   *
   * @internal
   */
  updateValue(_property: string, _value: unknown): void {}
}

/** Registry metadata for {@link CarbonMonoxideSensor}. */
export const carbonMonoxideMeta = defineSensor({
  type: SensorType.CarbonMonoxide,
  category: SensorCategory.Sensor,
  assignmentKey: 'carbonMonoxide',
  multiProvider: true,
  isDetectionType: false,
  properties: {
    [CarbonMonoxideProperty.Detected]: { type: 'boolean', writable: true },
  },
  shortcutable: true,
  cascadeTrigger: { property: CarbonMonoxideProperty.Detected, value: true, sustained: true },
  virtual: { properties: { [CarbonMonoxideProperty.Detected]: false } },
  semantics: {
    domain: SensorDomain.Binary,
    stateProperty: CarbonMonoxideProperty.Detected,
    commandProperty: CarbonMonoxideProperty.Detected,
    deviceClass: 'carbon_monoxide',
  },
});
