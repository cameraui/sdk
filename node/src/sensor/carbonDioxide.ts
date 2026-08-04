import { Sensor, SensorType, SensorCategory } from './base.js';
import { defineSensor, SensorDomain } from './meta.js';

import type { Observable } from '../observable/index.js';
import type { PropertyChangeOf, SensorLike, SensorOptions } from './base.js';

/**
 * Property names of a carbon dioxide sensor.
 *
 * @internal
 */
export enum CarbonDioxideProperty {
  /** Current CO2 concentration in parts per million. */
  Current = 'current',
}

/**
 * Property values of a carbon dioxide sensor.
 *
 * @internal
 */
export interface CarbonDioxideInfoProperties {
  [CarbonDioxideProperty.Current]: number;
}

/** Read-only proxy interface for a carbon dioxide sensor. */
export interface CarbonDioxideInfoLike extends SensorLike {
  readonly type: SensorType.CarbonDioxide;
  readonly onPropertyChanged: Observable<PropertyChangeOf<CarbonDioxideInfoProperties>>;

  getValue(property: CarbonDioxideProperty.Current): number | undefined;
  getValue(property: string): unknown;
}

/** Carbon dioxide info sensor. Reports current CO2 concentration in ppm. */
export class CarbonDioxideInfo<TStorage extends object = Record<string, any>> extends Sensor<CarbonDioxideInfoProperties, TStorage> {
  readonly type = SensorType.CarbonDioxide;
  readonly category = SensorCategory.Info;

  constructor(name = 'Carbon Dioxide', options?: SensorOptions) {
    super(name, options);

    this._writeState({ [CarbonDioxideProperty.Current]: 400 });
  }

  get current(): number {
    return this.props.current;
  }

  /**
   * Report a new CO2 reading. Clamped to [0, 40000] ppm.
   *
   * @param value - CO2 reading in parts per million.
   *
   * @example
   * ```ts
   * carbonDioxide.setCurrent(600);
   * ```
   */
  setCurrent(value: number): void {
    this._writeState({ [CarbonDioxideProperty.Current]: Math.max(0, Math.min(40000, value)) });
  }

  /**
   * Read-only sensor: external writes are ignored.
   *
   * @internal
   */
  updateValue(_property: string, _value: unknown): void {}
}

/** Registry metadata for {@link CarbonDioxideInfo}. */
export const carbonDioxideMeta = defineSensor({
  type: SensorType.CarbonDioxide,
  category: SensorCategory.Info,
  assignmentKey: 'carbonDioxide',
  multiProvider: true,
  isDetectionType: false,
  properties: {
    [CarbonDioxideProperty.Current]: { type: 'number', unit: 'ppm', writable: true },
  },
  shortcutable: true,
  virtual: { properties: { [CarbonDioxideProperty.Current]: 20 } },
  semantics: {
    domain: SensorDomain.Measurement,
    stateProperty: CarbonDioxideProperty.Current,
    commandProperty: CarbonDioxideProperty.Current,
    deviceClass: 'carbon_dioxide',
    unit: 'ppm',
  },
});
