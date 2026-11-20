import { Sensor, SensorCategory } from './base.js';
import { defineSensor, SensorDomain } from './meta.js';

import type { SensorOptions, SensorType } from './base.js';
import type { SensorMeta, SensorPropertySpec } from './meta.js';

/** Property values every measurement sensor carries. */
export interface MeasurementInfoProperties {
  /** Current reading, in the unit of the sensor type. */
  current: number;
}

/** What sets one measurement type apart from another, passed to {@link defineMeasurement}. */
export interface MeasurementDefinition {
  /** Unit of the reading, e.g. `°C`. */
  readonly unit: string;
  /** Device class consumers such as Home Assistant use for the type. */
  readonly deviceClass: string;
  /** Reading a new sensor starts with, real or virtual. */
  readonly initial: number;
  /** Lowest reading the quantity can have. */
  readonly min?: number;
  /** Highest reading the quantity can have. */
  readonly max?: number;
}

/** Metadata of a measurement type, as {@link defineMeasurement} returns it. */
export interface MeasurementMeta extends SensorMeta {
  /** Value description of the reading. */
  readonly properties: { readonly current: SensorPropertySpec };
  /** Reading a new sensor starts with. */
  readonly virtual: { readonly properties: { readonly current: number } };
}

/**
 * Base of the sensors that report one reading, such as a temperature or a CO2
 * level. A subclass sets its `type` and passes its metadata, which holds the
 * unit, the range and the starting value.
 */
export abstract class MeasurementInfo<
  TProperties extends MeasurementInfoProperties = MeasurementInfoProperties,
  TStorage extends object = Record<string, any>,
> extends Sensor<TProperties, TStorage> {
  readonly category = SensorCategory.Info;

  readonly #min: number;
  readonly #max: number;

  constructor(name: string, meta: MeasurementMeta, options?: SensorOptions) {
    super(name, options);

    this.#min = meta.properties.current.min ?? -Infinity;
    this.#max = meta.properties.current.max ?? Infinity;
    this._writeState({ current: meta.virtual.properties.current } as Partial<TProperties>);
  }

  /** Current reading, in the unit of the sensor type. */
  get current(): number {
    return this.props.current;
  }

  /**
   * Report a new reading. A value outside the range of the quantity is clamped
   * to it, a value that is not a finite number is ignored.
   *
   * @param value - The reading, in the unit of the sensor type.
   *
   * @example
   * ```ts
   * temperature.setCurrent(21.5);
   * ```
   */
  setCurrent(value: number): void {
    if (!Number.isFinite(value)) return;

    this._writeState({ current: Math.min(this.#max, Math.max(this.#min, value)) } as Partial<TProperties>);
  }

  /** @internal */
  updateValue(_property: string, _value: unknown): void {}
}

/**
 * Declares the metadata of a measurement type: one `current` reading with a
 * unit and the range the quantity can have.
 *
 * @param type - The sensor type.
 *
 * @param assignmentKey - Key under which a camera stores its assignment for the type.
 *
 * @param definition - Unit, device class, starting value and range of the reading.
 *
 * @returns The metadata, with `type` and `assignmentKey` preserved as literal types.
 *
 * @example
 * ```ts
 * export const humidityMeta = defineMeasurement(SensorType.Humidity, 'humidity', {
 *   unit: '%',
 *   deviceClass: 'humidity',
 *   initial: 50,
 *   min: 0,
 *   max: 100,
 * });
 * ```
 */
export function defineMeasurement<const T extends SensorType, const K extends string>(type: T, assignmentKey: K, definition: MeasurementDefinition) {
  const { unit, deviceClass, initial, min, max } = definition;

  return defineSensor({
    type,
    category: SensorCategory.Info,
    assignmentKey,
    multiProvider: true,
    isDetectionType: false,
    properties: {
      current: { type: 'number', unit, writable: true, ...(min !== undefined && { min }), ...(max !== undefined && { max }) },
    },
    shortcutable: true,
    virtual: { properties: { current: initial } },
    semantics: {
      domain: SensorDomain.Measurement,
      stateProperty: 'current',
      commandProperty: 'current',
      deviceClass,
      unit,
    },
  });
}
