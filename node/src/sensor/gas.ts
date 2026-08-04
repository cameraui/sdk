import { Sensor, SensorType, SensorCategory } from './base.js';
import { defineSensor, SensorDomain } from './meta.js';

import type { Observable } from '../observable/index.js';
import type { PropertyChangeOf, SensorLike, SensorOptions } from './base.js';

/**
 * Property names of a gas sensor.
 *
 * @internal
 */
export enum GasProperty {
  /** Whether gas is detected. */
  Detected = 'detected',
}

/**
 * Property values of a gas sensor.
 *
 * @internal
 */
export interface GasSensorProperties {
  [GasProperty.Detected]: boolean;
}

/** Read-only proxy interface for a gas sensor. */
export interface GasSensorLike extends SensorLike {
  readonly type: SensorType.Gas;
  readonly onPropertyChanged: Observable<PropertyChangeOf<GasSensorProperties>>;

  getValue(property: GasProperty.Detected): boolean | undefined;
  getValue(property: string): unknown;
}

/** Gas detector sensor. */
export class GasSensor<TStorage extends object = Record<string, any>> extends Sensor<GasSensorProperties, TStorage> {
  readonly type = SensorType.Gas;
  readonly category = SensorCategory.Sensor;

  constructor(name = 'Gas Sensor', options?: SensorOptions) {
    super(name, options);

    this._writeState({ [GasProperty.Detected]: false });
  }

  get detected(): boolean {
    return this.props.detected;
  }

  /**
   * Report gas detection state.
   *
   * @param value - True when gas is currently detected.
   *
   * @example
   * ```ts
   * gas.setDetected(true);
   * ```
   */
  setDetected(value: boolean): void {
    this._writeState({ [GasProperty.Detected]: value });
  }

  /**
   * Read-only sensor: external writes are ignored.
   *
   * @internal
   */
  updateValue(_property: string, _value: unknown): void {}
}

/** Registry metadata for {@link GasSensor}. */
export const gasMeta = defineSensor({
  type: SensorType.Gas,
  category: SensorCategory.Sensor,
  assignmentKey: 'gas',
  multiProvider: true,
  isDetectionType: false,
  properties: {
    [GasProperty.Detected]: { type: 'boolean', writable: true },
  },
  shortcutable: true,
  cascadeTrigger: { property: GasProperty.Detected, value: true, sustained: true },
  virtual: { properties: { [GasProperty.Detected]: false } },
  semantics: {
    domain: SensorDomain.Binary,
    stateProperty: GasProperty.Detected,
    commandProperty: GasProperty.Detected,
    deviceClass: 'gas',
  },
});
