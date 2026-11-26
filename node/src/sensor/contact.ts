import { SensorType } from './base.js';
import { BinarySensor, defineBinarySensor } from './binary.js';

import type { Observable } from '../observable/index.js';
import type { PropertyChangeOf, SensorLike, SensorOptions } from './base.js';

/** What a contact guards, it decides how smart homes show it. */
export enum ContactKind {
  /** A door. */
  Door = 'door',
  /** A garage door. */
  GarageDoor = 'garage_door',
  /** A window. */
  Window = 'window',
}

/** Property names of a contact sensor. */
export enum ContactProperty {
  /** Whether the contact is open (true = open, false = closed). */
  Detected = 'detected',
  /** What the contact guards, a {@link ContactKind}. */
  Kind = 'kind',
}

/** Property values of a contact sensor. */
export interface ContactSensorProperties {
  [ContactProperty.Detected]: boolean;
  [ContactProperty.Kind]: ContactKind | undefined;
}

/** Read-only proxy interface for a contact sensor. */
export interface ContactSensorLike extends SensorLike {
  readonly type: SensorType.Contact;
  readonly onPropertyChanged: Observable<PropertyChangeOf<ContactSensorProperties>>;

  getValue(property: ContactProperty.Detected): boolean | undefined;
  getValue(property: ContactProperty.Kind): ContactKind | undefined;
  getValue(property: string): unknown;
}

/** Contact sensor for door/window open-close state. */
export class ContactSensor<TStorage extends object = Record<string, any>> extends BinarySensor<ContactSensorProperties, TStorage> {
  readonly type = SensorType.Contact;

  constructor(name = 'Contact Sensor', options?: SensorOptions) {
    super(name, options);
  }

  /** What the contact guards, a {@link ContactKind}. */
  get kind(): ContactKind | undefined {
    return this.props.kind;
  }

  /**
   * Say what the contact guards. Smart homes show it by its kind, a window or a
   * door for example, and Home Assistant takes it as the device class.
   *
   * @param kind - What the contact guards.
   *
   * @example
   * ```ts
   * contact.setKind(ContactKind.Window);
   * ```
   */
  setKind(kind: ContactKind): void {
    this._writeState({ [ContactProperty.Kind]: kind });
    this.setPropertySpec(ContactProperty.Kind, { values: [kind] });
  }
}

/** Registry metadata for {@link ContactSensor}. */
export const contactMeta = defineBinarySensor(SensorType.Contact, 'contact', 'opening', {
  door: ContactKind.Door,
  garage_door: ContactKind.GarageDoor,
  window: ContactKind.Window,
});
