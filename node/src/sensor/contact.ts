import { Sensor, SensorType, SensorCategory } from './base.js';
import { defineSensor, SensorDomain } from './meta.js';

import type { Observable } from '../observable/index.js';
import type { PropertyChangeOf, SensorLike } from './base.js';

/**
 * Properties for contact sensors
 *
 * @internal
 */
export enum ContactProperty {
  /** Whether the contact is open (true = open, false = closed) */
  Detected = 'detected',
}

/**
 * Property value map for contact sensors.
 *
 * @internal
 */
export interface ContactSensorProperties {
  [ContactProperty.Detected]: boolean;
}

/** Read-only proxy interface for a contact sensor */
export interface ContactSensorLike extends SensorLike {
  readonly type: SensorType.Contact;
  readonly onPropertyChanged: Observable<PropertyChangeOf<ContactSensorProperties>>;

  getValue(property: ContactProperty.Detected): boolean | undefined;
  getValue(property: string): unknown;
}

/** Contact sensor for door/window open-close state */
export class ContactSensor<TStorage extends object = Record<string, any>> extends Sensor<ContactSensorProperties, TStorage> {
  readonly type = SensorType.Contact;
  readonly category = SensorCategory.Sensor;

  constructor(name = 'Contact Sensor') {
    super(name);

    this._writeState({ [ContactProperty.Detected]: false });
  }

  get detected(): boolean {
    return this.props.detected;
  }

  /**
   * Report contact state (true = open, false = closed).
   *
   * @param value - True when the contact is open, false when closed.
   *
   * @example
   * ```ts
   * contact.setDetected(true);
   * ```
   */
  setDetected(value: boolean): void {
    this._writeState({ [ContactProperty.Detected]: value });
  }

  /**
   * Read-only sensor: external writes are ignored. State is reported via `setDetected`.
   *
   * Called by the cross-process plugin host when a generic property write is received.
   * Contact sensors have no externally writable properties, so the parameters are
   * unused (underscore-prefixed) and the call is a no-op.
   *
   * @param _property - Unused — contact sensors expose no writable properties.
   *
   * @param _value - Unused — contact sensors expose no writable properties.
   *
   * @internal
   */
  updateValue(_property: string, _value: unknown): void {
    // No-op — contact state is reported by the plugin, not set externally.
  }
}

/** Registry metadata for {@link ContactSensor}. */
export const contactMeta = defineSensor({
  type: SensorType.Contact,
  category: SensorCategory.Sensor,
  assignmentKey: 'contact',
  multiProvider: true,
  isDetectionType: false,
  properties: Object.values(ContactProperty),
  shortcutable: true,
  cascadeTrigger: { property: ContactProperty.Detected, value: true, sustained: true },
  virtual: { properties: { [ContactProperty.Detected]: false } },
  semantics: {
    domain: SensorDomain.Binary,
    stateProperty: ContactProperty.Detected,
    commandProperty: ContactProperty.Detected,
    deviceClass: 'opening',
  },
});
