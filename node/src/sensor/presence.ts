import { SensorType, SensorCategory } from './base.js';
import { BinarySensor } from './binary.js';
import { defineSensor, SensorDomain } from './meta.js';

import type { Observable } from '../observable/index.js';
import type { PropertyChangeOf, SensorLike, SensorOptions } from './base.js';

/** Property names of a presence sensor. */
export enum PresenceProperty {
  /** Whether the person is at home. */
  Detected = 'detected',
  /** Name of the zone the person is in while away, empty at home or when unknown. */
  Zone = 'zone',
}

/** Property values of a presence sensor. */
export interface PresenceSensorProperties {
  [PresenceProperty.Detected]: boolean;
  [PresenceProperty.Zone]: string;
}

/** Read-only proxy interface for a presence sensor. */
export interface PresenceSensorLike extends SensorLike {
  readonly type: SensorType.Presence;
  readonly onPropertyChanged: Observable<PropertyChangeOf<PresenceSensorProperties>>;

  getValue(property: PresenceProperty.Detected): boolean | undefined;
  getValue(property: PresenceProperty.Zone): string | undefined;
  getValue(property: string): unknown;
}

/**
 * Whether one person is at home, such as from a phone's location or a tracker.
 * Unlike an occupancy sensor it follows a person, not a room.
 */
export class PresenceSensor<TStorage extends object = Record<string, any>> extends BinarySensor<PresenceSensorProperties, TStorage> {
  readonly type = SensorType.Presence;

  constructor(name = 'Presence', options?: SensorOptions) {
    super(name, options);

    this._writeState({ [PresenceProperty.Zone]: '' });
  }

  /** Name of the zone the person is in while away, empty at home or when unknown. */
  get zone(): string {
    return this.props.zone;
  }

  /**
   * Report the zone the person is in while away.
   *
   * @param zone - Name of the zone, such as `Work`. Empty when the zone is unknown.
   *
   * @example
   * ```ts
   * presence.setDetected(false);
   * presence.setZone('Work');
   * ```
   */
  setZone(zone: string): void {
    this._writeState({ [PresenceProperty.Zone]: zone });
  }
}

/** Registry metadata for {@link PresenceSensor}. */
export const presenceMeta = defineSensor({
  type: SensorType.Presence,
  category: SensorCategory.Sensor,
  assignmentKey: 'presence',
  multiProvider: true,
  isDetectionType: false,
  properties: {
    [PresenceProperty.Detected]: { type: 'boolean', writable: true },
    [PresenceProperty.Zone]: { type: 'string', writable: true },
  },
  shortcutable: true,
  virtual: { properties: { [PresenceProperty.Detected]: false, [PresenceProperty.Zone]: '' } },
  semantics: {
    domain: SensorDomain.Binary,
    stateProperty: PresenceProperty.Detected,
    commandProperty: PresenceProperty.Detected,
    deviceClass: 'presence',
  },
});
