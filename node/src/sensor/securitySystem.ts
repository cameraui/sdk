import { Sensor, SensorCategory, SensorType } from './base.js';
import { defineSensor, SensorDomain } from './meta.js';

import type { Observable } from '../observable/index.js';
import type { PropertyChangeOf, SensorLike, SensorOptions } from './base.js';

/** Security system arm/disarm states. */
export enum SecuritySystemState {
  /** Armed, occupants home. */
  StayArm = 0,
  /** Armed, occupants away. */
  AwayArm = 1,
  /** Armed for night mode. */
  NightArm = 2,
  /** System disarmed. */
  Disarmed = 3,
  /** Alarm is triggered. */
  AlarmTriggered = 4,
}

/**
 * Property names of a security system control.
 *
 * @internal
 */
export enum SecuritySystemProperty {
  /** The actual current state of the security system. */
  CurrentState = 'currentState',
  /** The desired target state (set by user, transitions to currentState). Never `AlarmTriggered`. */
  TargetState = 'targetState',
}

/**
 * Property values of a security system control.
 *
 * @internal
 */
export interface SecuritySystemProperties {
  [SecuritySystemProperty.CurrentState]: SecuritySystemState;
  [SecuritySystemProperty.TargetState]: SecuritySystemState;
}

/** Read-only proxy interface for a security system control. */
export interface SecuritySystemLike extends SensorLike {
  readonly type: SensorType.SecuritySystem;
  readonly onPropertyChanged: Observable<PropertyChangeOf<SecuritySystemProperties>>;

  getValue(property: SecuritySystemProperty.CurrentState): SecuritySystemState | undefined;
  getValue(property: SecuritySystemProperty.TargetState): SecuritySystemState | undefined;
  getValue(property: string): unknown;
}

/**
 * Security system control. Override `setTargetState()` to drive hardware and call
 * `await super.setTargetState(value)` once the hardware confirms. The base
 * implementation updates both `targetState` and `currentState`.
 */
export class SecuritySystem<TStorage extends object = Record<string, any>> extends Sensor<SecuritySystemProperties, TStorage, string> {
  readonly type = SensorType.SecuritySystem;
  readonly category = SensorCategory.Control;

  constructor(name = 'Security System', options?: SensorOptions) {
    super(name, options);

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
   * `await super.setTargetState(value)` after success. The base implementation
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
   * Publish the actual security system state. Use this for transitions that
   * diverge from the user-requested target: `AlarmTriggered` when an intruder
   * is detected, or arming-delay intermediate states. Read-only from
   * cross-process consumers (`updateValue` ignores it).
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
   * Routes generic property writes to the semantic setters.
   *
   * @internal
   */
  async updateValue(property: string, value: unknown): Promise<void> {
    if ((property as SecuritySystemProperty) === SecuritySystemProperty.TargetState) {
      await this.setTargetState(value as SecuritySystemState);
    }
  }
}

/** Registry metadata for {@link SecuritySystem}. */
export const securitySystemMeta = defineSensor({
  type: SensorType.SecuritySystem,
  category: SensorCategory.Control,
  assignmentKey: 'securitySystem',
  multiProvider: true,
  isDetectionType: false,
  properties: {
    [SecuritySystemProperty.CurrentState]: {
      type: 'enum',
      values: {
        stay_arm: SecuritySystemState.StayArm,
        away_arm: SecuritySystemState.AwayArm,
        night_arm: SecuritySystemState.NightArm,
        disarmed: SecuritySystemState.Disarmed,
        alarm_triggered: SecuritySystemState.AlarmTriggered,
      },
    },
    [SecuritySystemProperty.TargetState]: {
      type: 'enum',
      values: {
        stay_arm: SecuritySystemState.StayArm,
        away_arm: SecuritySystemState.AwayArm,
        night_arm: SecuritySystemState.NightArm,
        disarmed: SecuritySystemState.Disarmed,
      },
      writable: true,
    },
  },
  shortcutable: true,
  cascadeTrigger: { property: SecuritySystemProperty.CurrentState, value: 4, sustained: true },
  virtual: { properties: { [SecuritySystemProperty.CurrentState]: 3, [SecuritySystemProperty.TargetState]: 3 } },
  semantics: {
    domain: SensorDomain.Alarm,
    stateProperty: SecuritySystemProperty.CurrentState,
    commandProperty: SecuritySystemProperty.TargetState,
    states: {
      armed_home: SecuritySystemState.StayArm,
      armed_away: SecuritySystemState.AwayArm,
      armed_night: SecuritySystemState.NightArm,
      disarmed: SecuritySystemState.Disarmed,
      triggered: SecuritySystemState.AlarmTriggered,
    },
  },
});
