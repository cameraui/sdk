import { Sensor, SensorCategory } from './base.js';
import { defineSensor, SensorDomain } from './meta.js';

import type { SensorOptions, SensorType } from './base.js';

/** Property values every binary sensor carries. */
export interface BinarySensorProperties {
  /** Whether the sensor currently detects its condition. */
  detected: boolean;
}

/**
 * Base of the sensors that report one condition as on or off, such as smoke, a
 * leak or an open contact. A subclass only sets its `type`.
 */
export abstract class BinarySensor<TProperties extends BinarySensorProperties = BinarySensorProperties, TStorage extends object = Record<string, any>> extends Sensor<
  TProperties,
  TStorage
> {
  readonly category = SensorCategory.Sensor;

  constructor(name: string, options?: SensorOptions) {
    super(name, options);

    this._writeState({ detected: false } as Partial<TProperties>);
  }

  /** Whether the sensor currently detects its condition. */
  get detected(): boolean {
    return this.props.detected;
  }

  /**
   * Report whether the condition is currently detected.
   *
   * @param value - True while the condition is detected.
   *
   * @example
   * ```ts
   * sensor.setDetected(true);
   * ```
   */
  setDetected(value: boolean): void {
    this._writeState({ detected: value } as Partial<TProperties>);
  }
}

/**
 * Declares the metadata of a binary sensor type: a `detected` flag that arms the
 * automation cascade for as long as it is set.
 *
 * @param type - The sensor type.
 *
 * @param assignmentKey - Key under which a camera stores its assignment for the type.
 *
 * @param deviceClass - Device class consumers such as Home Assistant use for the type.
 *
 * @param kinds - What a sensor of the type can be, a door or a window for example. With
 * kinds the type gets a `kind` property, and a sensor that sets one replaces the device
 * class with it.
 *
 * @returns The metadata, with `type` and `assignmentKey` preserved as literal types.
 *
 * @example
 * ```ts
 * export const smokeMeta = defineBinarySensor(SensorType.Smoke, 'smoke', 'smoke');
 * ```
 */
export function defineBinarySensor<const T extends SensorType, const K extends string>(
  type: T,
  assignmentKey: K,
  deviceClass: string,
  kinds?: Readonly<Record<string, string>>,
) {
  return defineSensor({
    type,
    category: SensorCategory.Sensor,
    assignmentKey,
    multiProvider: true,
    isDetectionType: false,
    properties: {
      detected: { type: 'boolean', writable: true },
      ...(kinds && { kind: { type: 'enum', values: kinds, internal: true } }),
    },
    shortcutable: true,
    cascadeTrigger: { property: 'detected', values: [true], sustained: true },
    virtual: { properties: { detected: false } },
    semantics: {
      domain: SensorDomain.Binary,
      stateProperty: 'detected',
      commandProperty: 'detected',
      deviceClass,
      ...(kinds && { deviceClassProperty: 'kind' }),
    },
  });
}
