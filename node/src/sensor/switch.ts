import { Sensor, SensorType, SensorCategory } from './base.js';
import { defineSensor, SensorDomain } from './meta.js';

import type { Observable } from '../observable/index.js';
import type { PropertyChangeOf, SensorLike } from './base.js';

/**
 * Properties for switch controls
 *
 * @internal
 */
export enum SwitchProperty {
  /** Whether the switch is on */
  On = 'on',
}

/**
 * Property value map for switch controls.
 *
 * @internal
 */
export interface SwitchControlProperties {
  [SwitchProperty.On]: boolean;
}

/** Read-only proxy interface for a switch control */
export interface SwitchControlLike extends SensorLike {
  readonly type: SensorType.Switch;
  readonly onPropertyChanged: Observable<PropertyChangeOf<SwitchControlProperties>>;

  getValue(property: SwitchProperty.On): boolean | undefined;
  getValue(property: string): unknown;
}

/**
 * Generic on/off switch control. Override `setOn()` / `setOff()` to drive
 * hardware and call `await super.setOn()` / `await super.setOff()` after
 * success to sync the SDK state. For hardware-pushed updates, call the `super`
 * methods from your event handler.
 */
export class SwitchControl<TStorage extends object = Record<string, any>> extends Sensor<SwitchControlProperties, TStorage> {
  readonly type = SensorType.Switch;
  readonly category = SensorCategory.Control;

  constructor(name = 'Switch') {
    super(name);

    this._writeState({ [SwitchProperty.On]: false });
  }

  get on(): boolean {
    return this.props.on;
  }

  /**
   * Turn the switch on. Override to drive hardware and call `await super.setOn()`
   * after success to sync the SDK state.
   *
   * @example
   * ```ts
   * await sw.setOn();
   * ```
   */
  async setOn(): Promise<void> {
    this._writeState({ [SwitchProperty.On]: true });
  }

  /**
   * Turn the switch off. Override to drive hardware and call `await super.setOff()`
   * after success to sync the SDK state.
   *
   * @example
   * ```ts
   * await sw.setOff();
   * ```
   */
  async setOff(): Promise<void> {
    this._writeState({ [SwitchProperty.On]: false });
  }

  /**
   * Cross-process consumer entry point. Dispatches writable properties
   * to semantic methods so plugin overrides (hardware actions) are honored.
   * Unknown properties are ignored — only `On` is externally writable.
   *
   * @param property - Property name to write.
   *
   * @param value - New value for the property.
   *
   * @internal
   */
  async updateValue(property: string, value: unknown): Promise<void> {
    if ((property as SwitchProperty) === SwitchProperty.On) {
      if (value) await this.setOn();
      else await this.setOff();
    }
    // Unknown / non-writable property — ignored.
  }
}

/** Registry metadata for {@link SwitchControl}. */
export const switchMeta = defineSensor({
  type: SensorType.Switch,
  category: SensorCategory.Control,
  assignmentKey: 'switch',
  multiProvider: true,
  isDetectionType: false,
  properties: {
    [SwitchProperty.On]: { type: 'boolean', writable: true },
  },
  shortcutable: true,
  cascadeTrigger: { property: SwitchProperty.On, value: true, sustained: true },
  virtual: { properties: { [SwitchProperty.On]: false } },
  semantics: {
    domain: SensorDomain.Switch,
    stateProperty: SwitchProperty.On,
    commandProperty: SwitchProperty.On,
  },
});
