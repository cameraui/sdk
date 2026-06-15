import { Sensor, SensorType, SensorCategory } from './base.js';

import type { Observable } from '../observable/index.js';
import type { PropertyChangeOf, SensorLike } from './base.js';

/**
 * Properties for doorbell triggers
 *
 * @internal
 */
export enum DoorbellProperty {
  /** Whether the doorbell is currently ringing */
  Ring = 'ring',
}

/**
 * Property value map for doorbell triggers.
 *
 * @internal
 */
export interface DoorbellTriggerProperties {
  [DoorbellProperty.Ring]: boolean;
}

/** Read-only proxy interface for a doorbell trigger */
export interface DoorbellTriggerLike extends SensorLike {
  readonly type: SensorType.Doorbell;
  readonly onPropertyChanged: Observable<PropertyChangeOf<DoorbellTriggerProperties>>;

  getValue(property: DoorbellProperty.Ring): boolean | undefined;
  getValue(property: string): unknown;
}

/** Auto-reset duration after `trigger()` is called (ms). */
export const RING_AUTO_RESET_MS = 2000;

/**
 * Doorbell trigger sensor.
 *
 * Plugin authors call `trigger()` to fire a doorbell event. The `ring` property
 * is set to true and automatically reset to false after a short delay
 * ({@link RING_AUTO_RESET_MS}). Calling `trigger()` again while still ringing
 * resets the timer (extends the ring phase).
 */
export class DoorbellTrigger<TStorage extends object = Record<string, any>> extends Sensor<DoorbellTriggerProperties, TStorage> {
  readonly type = SensorType.Doorbell;
  readonly category = SensorCategory.Trigger;

  private _ringResetTimer?: ReturnType<typeof setTimeout>;

  constructor(name = 'Doorbell') {
    super(name);

    this._writeState({ [DoorbellProperty.Ring]: false });
  }

  get ring(): boolean {
    return this.props.ring;
  }

  /**
   * Trigger a doorbell ring. Sets `ring = true` and auto-resets after a
   * short delay. Re-triggering while still ringing extends the ring phase.
   *
   * @example
   * ```ts
   * doorbell.trigger();
   * ```
   */
  trigger(): void {
    if (this._ringResetTimer) {
      clearTimeout(this._ringResetTimer);
    }
    this._writeState({ [DoorbellProperty.Ring]: true });
    this._ringResetTimer = setTimeout(() => {
      this._ringResetTimer = undefined;
      this._writeState({ [DoorbellProperty.Ring]: false });
    }, RING_AUTO_RESET_MS);
  }

  /**
   * Cross-process consumer entry point. Writing `ring=true` (any truthy value)
   * dispatches to `trigger()` so a UI test button or external automation can
   * fire the doorbell using the same flow as a real hardware ring (auto-reset
   * included). Writing `ring=false` is ignored — the auto-reset timer owns
   * the off transition.
   *
   * @param property - Property name to write.
   *
   * @param value - New value for the property.
   *
   * @internal
   */
  updateValue(property: string, value: unknown): void {
    if ((property as DoorbellProperty) === DoorbellProperty.Ring && value) {
      this.trigger();
    }
  }

  override _cleanup(): void {
    if (this._ringResetTimer) {
      clearTimeout(this._ringResetTimer);
      this._ringResetTimer = undefined;
    }
    super._cleanup();
  }
}
