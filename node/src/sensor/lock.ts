import { Sensor, SensorType, SensorCategory } from './base.js';

import type { Observable } from '../observable/index.js';
import type { PropertyChangeOf, SensorLike } from './base.js';

/** Lock states (HomeKit-compatible values) */
export enum LockState {
  Secured = 0,
  Unsecured = 1,
  Unknown = 2,
}

/**
 * Properties for lock controls
 *
 * @internal
 */
export enum LockProperty {
  /** The actual current state of the lock */
  CurrentState = 'currentState',
  /** The desired target state (set by user, transitions to currentState) */
  TargetState = 'targetState',
}

/**
 * Property value map for lock controls.
 *
 * @internal
 */
export interface LockControlProperties {
  [LockProperty.CurrentState]: LockState;
  [LockProperty.TargetState]: LockState;
}

/** Read-only proxy interface for a lock control */
export interface LockControlLike extends SensorLike {
  readonly type: SensorType.Lock;
  readonly onPropertyChanged: Observable<PropertyChangeOf<LockControlProperties>>;

  getValue(property: LockProperty.CurrentState): LockState | undefined;
  getValue(property: LockProperty.TargetState): LockState | undefined;
  getValue(property: string): unknown;
}

/**
 * Lock control. Override `setTargetState()` to drive hardware and call
 * `await super.setTargetState(value)` once the hardware confirms — the base
 * implementation updates both `targetState` and `currentState` to the new value.
 *
 * For asymmetric flows (long-running unlock with intermediate state) override
 * `setTargetState` and write `currentState` separately when transitions complete.
 */
export class LockControl<TStorage extends object = Record<string, any>> extends Sensor<LockControlProperties, TStorage, string> {
  readonly type = SensorType.Lock;
  readonly category = SensorCategory.Control;

  constructor(name = 'Lock') {
    super(name);

    this._writeState({
      [LockProperty.CurrentState]: LockState.Secured,
      [LockProperty.TargetState]: LockState.Secured,
    });
  }

  get currentState(): LockState {
    return this.props.currentState;
  }

  get targetState(): LockState {
    return this.props.targetState;
  }

  /**
   * Set the target state. Override to drive hardware and call
   * `await super.setTargetState(value)` after success — the base implementation
   * syncs both `targetState` and `currentState` to the new value.
   *
   * @param value - Desired lock state from the {@link LockState} enum.
   *
   * @example
   * ```ts
   * import { LockState } from '@camera.ui/sdk';
   * await lock.setTargetState(LockState.Secured);
   * ```
   */
  async setTargetState(value: LockState): Promise<void> {
    this._writeState({
      [LockProperty.TargetState]: value,
      [LockProperty.CurrentState]: value,
    });
  }

  /**
   * Publish the actual lock state. Use this to drive transitions where the
   * physical state diverges from the user-requested target — e.g. motorized
   * smart locks that take time to rotate (publish `Unknown` while moving),
   * or hardware reporting an out-of-band state change. Read-only from
   * cross-process consumers (`updateValue` ignores it).
   *
   * @param value - Current physical lock state from the {@link LockState} enum.
   *
   * @example
   * ```ts
   * import { LockState } from '@camera.ui/sdk';
   * lock.setCurrentState(LockState.Unknown);
   * ```
   */
  setCurrentState(value: LockState): void {
    this._writeState({ [LockProperty.CurrentState]: value });
  }

  /**
   * Cross-process consumer entry point. Dispatches writable properties
   * to semantic methods so plugin overrides (hardware actions) are honored.
   * `currentState` is observed-only and not externally writable; only `targetState` may be set.
   *
   * @param property - Property name to write.
   *
   * @param value - New value for the property.
   *
   * @internal
   */
  async updateValue(property: string, value: unknown): Promise<void> {
    if ((property as LockProperty) === LockProperty.TargetState) {
      await this.setTargetState(value as LockState);
    }
    // Unknown / non-writable property (incl. currentState) — ignored.
  }
}
