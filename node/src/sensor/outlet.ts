import { Sensor, SensorType, SensorCategory } from './base.js';
import { defineSensor, SensorDomain } from './meta.js';

import type { Observable } from '../observable/index.js';
import type { PropertyChangeOf, SensorLike, SensorOptions } from './base.js';

/** Optional capabilities of an outlet. */
export enum OutletCapability {
  /** Outlet reports whether the device plugged into it draws power. */
  InUse = 'inUse',
}

/** Property names of an outlet. */
export enum OutletProperty {
  /** Whether the outlet is on. */
  On = 'on',
  /** Whether the device plugged into the outlet draws power. */
  InUse = 'inUse',
}

/** Property values of an outlet. */
export interface OutletControlProperties {
  [OutletProperty.On]: boolean;
  [OutletProperty.InUse]: boolean;
}

/** Read-only proxy interface for an outlet. */
export interface OutletControlLike extends SensorLike {
  readonly type: SensorType.Outlet;
  readonly onPropertyChanged: Observable<PropertyChangeOf<OutletControlProperties>>;
  readonly onCapabilitiesChanged: Observable<OutletCapability[]>;

  getValue(property: OutletProperty.On): boolean | undefined;
  getValue(property: OutletProperty.InUse): boolean | undefined;
  getValue(property: string): unknown;
}

/**
 * A power outlet or smart plug. Override `setOn()` / `setOff()` to drive
 * hardware and call `await super.setOn()` / `await super.setOff()` after
 * success to sync the SDK state. For hardware-pushed updates, call the `super`
 * methods from your event handler.
 *
 * An outlet that measures its load adds {@link OutletCapability.InUse} and
 * reports it with `setInUse()`.
 */
export class OutletControl<TStorage extends object = Record<string, any>> extends Sensor<OutletControlProperties, TStorage, OutletCapability> {
  readonly type = SensorType.Outlet;
  readonly category = SensorCategory.Control;

  constructor(name = 'Outlet', options?: SensorOptions) {
    super(name, options);

    this._writeState({ [OutletProperty.On]: false, [OutletProperty.InUse]: false });
  }

  /** Whether the outlet is on. */
  get on(): boolean {
    return this.props.on;
  }

  /** Whether the device plugged into the outlet draws power. */
  get inUse(): boolean {
    return this.props.inUse;
  }

  /**
   * Turn the outlet on. Override to drive hardware and call `await super.setOn()`
   * after success to sync the SDK state.
   *
   * @example
   * ```ts
   * await outlet.setOn();
   * ```
   */
  async setOn(): Promise<void> {
    this._writeState({ [OutletProperty.On]: true });
  }

  /**
   * Turn the outlet off. Override to drive hardware and call `await super.setOff()`
   * after success to sync the SDK state.
   *
   * @example
   * ```ts
   * await outlet.setOff();
   * ```
   */
  async setOff(): Promise<void> {
    this._writeState({ [OutletProperty.On]: false });
  }

  /**
   * Report whether the device plugged into the outlet draws power.
   *
   * @param inUse - `true` while it draws power.
   *
   * @example
   * ```ts
   * outlet.setInUse(watts > 1);
   * ```
   */
  setInUse(inUse: boolean): void {
    this._writeState({ [OutletProperty.InUse]: inUse });
  }

  /** @internal */
  async updateValue(property: string, value: unknown): Promise<void> {
    if ((property as OutletProperty) === OutletProperty.On) {
      if (value) await this.setOn();
      else await this.setOff();
    }
  }
}

/** Registry metadata for {@link OutletControl}. */
export const outletMeta = defineSensor({
  type: SensorType.Outlet,
  category: SensorCategory.Control,
  assignmentKey: 'outlet',
  multiProvider: true,
  isDetectionType: false,
  properties: {
    [OutletProperty.On]: { type: 'boolean', writable: true },
    [OutletProperty.InUse]: { type: 'boolean' },
  },
  shortcutable: true,
  cascadeTrigger: { property: OutletProperty.On, values: [true], sustained: true },
  propertyCapabilities: { [OutletProperty.InUse]: OutletCapability.InUse },
  virtual: { properties: { [OutletProperty.On]: false } },
  semantics: {
    domain: SensorDomain.Switch,
    stateProperty: OutletProperty.On,
    commandProperty: OutletProperty.On,
    deviceClass: 'outlet',
  },
});
