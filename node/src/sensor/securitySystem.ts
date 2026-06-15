import { Sensor, SensorType, SensorCategory } from './base.js';

import type { Observable } from '../observable/index.js';
import type { PropertyChangeOf, SensorLike } from './base.js';

/** Security system arm/disarm states (HomeKit-compatible values) */
export enum SecuritySystemState {
  StayArm = 0,
  AwayArm = 1,
  NightArm = 2,
  Disarmed = 3,
  AlarmTriggered = 4,
}

/**
 * Properties for security system controls
 *
 * @internal
 */
export enum SecuritySystemProperty {
  /** The actual current state of the security system */
  CurrentState = 'currentState',
  /** The desired target state (set by user, transitions to currentState) */
  TargetState = 'targetState',
}

/**
 * Property value map for security system controls.
 *
 * @internal
 */
export interface SecuritySystemProperties {
  [SecuritySystemProperty.CurrentState]: SecuritySystemState;
  [SecuritySystemProperty.TargetState]: SecuritySystemState;
}

/** Read-only proxy interface for a security system control */
export interface SecuritySystemLike extends SensorLike {
  readonly type: SensorType.SecuritySystem;
  readonly onPropertyChanged: Observable<PropertyChangeOf<SecuritySystemProperties>>;

  getValue(property: SecuritySystemProperty.CurrentState): SecuritySystemState | undefined;
  getValue(property: SecuritySystemProperty.TargetState): SecuritySystemState | undefined;
  getValue(property: string): unknown;
}

/**
 * Security system control. Override `setTargetState()` to drive hardware and call
 * `await super.setTargetState(value)` once the hardware confirms — the base
 * implementation updates both `targetState` and `currentState`.
 */
export class SecuritySystem<TStorage extends object = Record<string, any>> extends Sensor<SecuritySystemProperties, TStorage, string> {
  readonly type = SensorType.SecuritySystem;
  readonly category = SensorCategory.Control;

  constructor(name = 'Security System') {
    super(name);

    this._writeState({
      [SecuritySystemProperty.CurrentState]: SecuritySystemState.Disarmed,
      [SecuritySystemProperty.TargetState]: SecuritySystemState.Disarmed,
    });
  }

  get currentState(): SecuritySystemState {
    return this.props.currentState;
  }

  get targetState(): SecuritySystemState {
    return this.props.targetState;
  }

  /**
   * Set the target state. Override to drive hardware and call
   * `await super.setTargetState(value)` after success — the base implementation
   * syncs both `targetState` and `currentState` to the new value.
   *
   * @param value - Desired armed/disarmed state from {@link SecuritySystemState}.
   *
   * @example
   * ```ts
   * import { SecuritySystemState } from '@camera.ui/sdk';
   * await alarm.setTargetState(SecuritySystemState.AwayArm);
   * ```
   */
  async setTargetState(value: SecuritySystemState): Promise<void> {
    this._writeState({
      [SecuritySystemProperty.TargetState]: value,
      [SecuritySystemProperty.CurrentState]: value,
    });
  }

  /**
   * Publish the actual security system state. Use this to drive transitions
   * that diverge from the user-requested target — most notably the
   * `AlarmTriggered` state when an intruder is detected, or arming-delay
   * intermediate states. Read-only from cross-process consumers
   * (`updateValue` ignores it).
   *
   * @param value - Current security system state from {@link SecuritySystemState}.
   *
   * @example
   * ```ts
   * import { SecuritySystemState } from '@camera.ui/sdk';
   * alarm.setCurrentState(SecuritySystemState.AlarmTriggered);
   * ```
   */
  setCurrentState(value: SecuritySystemState): void {
    this._writeState({ [SecuritySystemProperty.CurrentState]: value });
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
    if ((property as SecuritySystemProperty) === SecuritySystemProperty.TargetState) {
      await this.setTargetState(value as SecuritySystemState);
    }
    // Unknown / non-writable property (incl. currentState) — ignored.
  }
}
