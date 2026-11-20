import { SensorType } from './base.js';
import { BinarySensor, defineBinarySensor } from './binary.js';

import type { Observable } from '../observable/index.js';
import type { PropertyChangeOf, SensorLike, SensorOptions } from './base.js';

/** Property names of a contact sensor. */
export enum ContactProperty {
  /** Whether the contact is open (true = open, false = closed). */
  Detected = 'detected',
}

/** Property values of a contact sensor. */
export interface ContactSensorProperties {
  [ContactProperty.Detected]: boolean;
}

/** Read-only proxy interface for a contact sensor. */
export interface ContactSensorLike extends SensorLike {
  readonly type: SensorType.Contact;
  readonly onPropertyChanged: Observable<PropertyChangeOf<ContactSensorProperties>>;

  getValue(property: ContactProperty.Detected): boolean | undefined;
  getValue(property: string): unknown;
}

/** Contact sensor for door/window open-close state. */
export class ContactSensor<TStorage extends object = Record<string, any>> extends BinarySensor<ContactSensorProperties, TStorage> {
  readonly type = SensorType.Contact;

  constructor(name = 'Contact Sensor', options?: SensorOptions) {
    super(name, options);
  }
}

/** Registry metadata for {@link ContactSensor}. */
export const contactMeta = defineBinarySensor(SensorType.Contact, 'contact', 'opening');
