import { Sensor, SensorType, SensorCategory } from './base.js';
import { defineSensor, SensorDomain } from './meta.js';

import type { Observable } from '../observable/index.js';
import type { PropertyChangeOf, SensorLike } from './base.js';

/** Optional capabilities for siren controls */
export enum SirenCapability {
  /** Siren supports volume adjustment (0-100) */
  Volume = 'volume',
}

/**
 * Properties for siren controls
 *
 * @internal
 */
export enum SirenProperty {
  /** Whether the siren is currently active */
  Active = 'active',
  /** Volume level (0-100) */
  Volume = 'volume',
}

/**
 * Property value map for siren controls.
 *
 * @internal
 */
export interface SirenControlProperties {
  [SirenProperty.Active]: boolean;
  [SirenProperty.Volume]: number;
}

/** Read-only proxy interface for a siren control */
export interface SirenControlLike extends SensorLike {
  readonly type: SensorType.Siren;
  readonly onPropertyChanged: Observable<PropertyChangeOf<SirenControlProperties>>;
  readonly onCapabilitiesChanged: Observable<SirenCapability[]>;

  getValue(property: SirenProperty.Active): boolean | undefined;
  getValue(property: SirenProperty.Volume): number | undefined;
  getValue(property: string): unknown;
}

/**
 * Siren control sensor. Override `setActive()`/`setInactive()` to drive your
 * hardware, then `await super.setActive()` / `await super.setInactive()` to sync
 * the SDK state. For hardware-pushed updates, call the `super` methods from your
 * event handler — that bypasses any plugin override and only syncs state.
 */
export class SirenControl<TStorage extends object = Record<string, any>> extends Sensor<SirenControlProperties, TStorage, SirenCapability> {
  readonly type = SensorType.Siren;
  readonly category = SensorCategory.Control;

  constructor(name = 'Siren') {
    super(name);

    this._writeState({
      [SirenProperty.Active]: false,
      [SirenProperty.Volume]: 100,
    });
  }

  get active(): boolean {
    return this.props.active;
  }

  get volume(): number {
    return this.props.volume;
  }

  /**
   * Activate the siren. Override to drive hardware and call `await super.setActive()`
   * after success to sync the SDK state.
   *
   * @example
   * ```ts
   * await siren.setActive();
   * ```
   */
  async setActive(): Promise<void> {
    this._writeState({ [SirenProperty.Active]: true });
  }

  /**
   * Deactivate the siren. Override to drive hardware and call `await super.setInactive()`
   * after success to sync the SDK state.
   *
   * @example
   * ```ts
   * await siren.setInactive();
   * ```
   */
  async setInactive(): Promise<void> {
    this._writeState({ [SirenProperty.Active]: false });
  }

  /**
   * Set volume. Override to drive hardware and call `await super.setVolume(value)`
   * after success. The default implementation clamps the value to [0, 100].
   *
   * @param value - Volume level in the range 0-100.
   *
   * @example
   * ```ts
   * await siren.setVolume(80);
   * ```
   */
  async setVolume(value: number): Promise<void> {
    this._writeState({ [SirenProperty.Volume]: Math.max(0, Math.min(100, value)) });
  }

  /**
   * Cross-process consumer entry point. Dispatches writable properties
   * to semantic methods so plugin overrides (hardware actions) are honored.
   * Unknown properties are ignored — only `Active` and `Volume` are externally writable.
   *
   * @param property - Property name to write.
   *
   * @param value - New value for the property.
   *
   * @internal
   */
  override async updateValue(property: string, value: unknown): Promise<void> {
    switch (property as SirenProperty) {
      case SirenProperty.Active:
        if (value) await this.setActive();
        else await this.setInactive();
        return;
      case SirenProperty.Volume:
        await this.setVolume(value as number);
        return;
    }
    // Unknown / non-writable property — ignored.
  }
}

/** Registry metadata for {@link SirenControl}. */
export const sirenMeta = defineSensor({
  type: SensorType.Siren,
  category: SensorCategory.Control,
  assignmentKey: 'siren',
  multiProvider: true,
  isDetectionType: false,
  properties: {
    [SirenProperty.Active]: { type: 'boolean', writable: true },
    [SirenProperty.Volume]: { type: 'number', min: 0, max: 100, unit: '%', writable: true },
  },
  shortcutable: true,
  cascadeTrigger: { property: SirenProperty.Active, value: true, sustained: true },
  propertyCapabilities: { [SirenProperty.Volume]: SirenCapability.Volume },
  virtual: { properties: { [SirenProperty.Active]: false, [SirenProperty.Volume]: 100 }, capabilities: [SirenCapability.Volume] },
  semantics: {
    domain: SensorDomain.Siren,
    stateProperty: SirenProperty.Active,
    commandProperty: SirenProperty.Active,
  },
});
