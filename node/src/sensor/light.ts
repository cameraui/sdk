import { Sensor, SensorType, SensorCategory } from './base.js';
import { defineSensor, SensorDomain } from './meta.js';

import type { Observable } from '../observable/index.js';
import type { PropertyChangeOf, SensorLike } from './base.js';

/** Optional capabilities for light controls */
export enum LightCapability {
  /** Light supports brightness adjustment (0-100) */
  Brightness = 'brightness',
}

/**
 * Properties for light controls
 *
 * @internal
 */
export enum LightProperty {
  /** Whether the light is on */
  On = 'on',
  /** Brightness level (0-100) */
  Brightness = 'brightness',
}

/**
 * Property value map for light controls.
 *
 * @internal
 */
export interface LightControlProperties {
  [LightProperty.On]: boolean;
  [LightProperty.Brightness]: number;
}

/** Read-only proxy interface for a light control */
export interface LightControlLike extends SensorLike {
  readonly type: SensorType.Light;
  readonly onPropertyChanged: Observable<PropertyChangeOf<LightControlProperties>>;
  readonly onCapabilitiesChanged: Observable<LightCapability[]>;

  getValue(property: LightProperty.On): boolean | undefined;
  getValue(property: LightProperty.Brightness): number | undefined;
  getValue(property: string): unknown;
}

/**
 * Light control sensor. Override `setOn()`/`setOff()` to drive your hardware,
 * then `await super.setOn()` / `await super.setOff()` to sync the SDK state.
 *
 * Plugins that have no hardware-action use case can leave the methods unoverridden —
 * the base implementation just updates the state.
 *
 * For hardware-pushed updates (someone manually flipped the switch), call
 * `super.setOn()` / `super.setOff()` from your event handler — that bypasses
 * any plugin override and only syncs state.
 */
export class LightControl<TStorage extends object = Record<string, any>> extends Sensor<LightControlProperties, TStorage, LightCapability> {
  readonly type = SensorType.Light;
  readonly category = SensorCategory.Control;

  constructor(name = 'Light') {
    super(name);

    this._writeState({
      [LightProperty.On]: false,
      [LightProperty.Brightness]: 100,
    });
  }

  get on(): boolean {
    return this.props.on;
  }

  get brightness(): number {
    return this.props.brightness;
  }

  /**
   * Turn the light on. Override to drive hardware and call `await super.setOn()`
   * after the hardware call succeeds to sync the SDK state.
   *
   * @example
   * ```ts
   * await light.setOn();
   * ```
   */
  async setOn(): Promise<void> {
    this._writeState({ [LightProperty.On]: true });
  }

  /**
   * Turn the light off. Override to drive hardware and call `await super.setOff()`
   * after the hardware call succeeds to sync the SDK state.
   *
   * @example
   * ```ts
   * await light.setOff();
   * ```
   */
  async setOff(): Promise<void> {
    this._writeState({ [LightProperty.On]: false });
  }

  /**
   * Set brightness. Override to drive hardware and call `await super.setBrightness(value)`
   * after the hardware call succeeds. The default implementation clamps the value to [0, 100].
   *
   * @param value - Brightness level in the range 0-100.
   *
   * @example
   * ```ts
   * await light.setBrightness(75);
   * ```
   */
  async setBrightness(value: number): Promise<void> {
    this._writeState({ [LightProperty.Brightness]: Math.max(0, Math.min(100, value)) });
  }

  /**
   * Cross-process consumer entry point. Dispatches writable properties
   * to semantic methods so plugin overrides (hardware actions) are honored.
   * Unknown properties are ignored — only `On` and `Brightness` are externally writable.
   *
   * @param property - Property name to write.
   *
   * @param value - New value for the property.
   *
   * @internal
   */
  async updateValue(property: string, value: unknown): Promise<void> {
    switch (property as LightProperty) {
      case LightProperty.On:
        if (value) await this.setOn();
        else await this.setOff();
        return;
      case LightProperty.Brightness:
        await this.setBrightness(value as number);
        return;
    }
    // Unknown / non-writable property — ignored.
  }
}

/** Registry metadata for {@link LightControl}. */
export const lightMeta = defineSensor({
  type: SensorType.Light,
  category: SensorCategory.Control,
  assignmentKey: 'light',
  multiProvider: true,
  isDetectionType: false,
  properties: Object.values(LightProperty),
  shortcutable: true,
  cascadeTrigger: { property: LightProperty.On, value: true, sustained: true },
  propertyCapabilities: { [LightProperty.Brightness]: LightCapability.Brightness },
  virtual: {
    properties: { [LightProperty.On]: false, [LightProperty.Brightness]: 100 },
    capabilities: [LightCapability.Brightness],
  },
  semantics: {
    domain: SensorDomain.Light,
    stateProperty: LightProperty.On,
    commandProperty: LightProperty.On,
  },
});
