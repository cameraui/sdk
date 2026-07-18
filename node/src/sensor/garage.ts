import { Sensor, SensorType, SensorCategory } from './base.js';
import { defineSensor, SensorDomain } from './meta.js';

import type { Observable } from '../observable/index.js';
import type { PropertyChangeOf, SensorLike } from './base.js';

/** Garage door states (HomeKit-compatible values) */
export enum GarageState {
  Open = 0,
  Closed = 1,
  Opening = 2,
  Closing = 3,
  Stopped = 4,
}

/**
 * Properties for garage controls
 *
 * @internal
 */
export enum GarageProperty {
  /** The actual current state of the garage door */
  CurrentState = 'currentState',
  /** The desired target state (set by user, transitions to currentState) */
  TargetState = 'targetState',
  /** Whether an obstruction is detected */
  ObstructionDetected = 'obstructionDetected',
}

/**
 * Property value map for garage controls.
 *
 * @internal
 */
export interface GarageControlProperties {
  [GarageProperty.CurrentState]: GarageState;
  [GarageProperty.TargetState]: GarageState;
  [GarageProperty.ObstructionDetected]: boolean;
}

/** Read-only proxy interface for a garage control */
export interface GarageControlLike extends SensorLike {
  readonly type: SensorType.Garage;
  readonly onPropertyChanged: Observable<PropertyChangeOf<GarageControlProperties>>;

  getValue(property: GarageProperty.CurrentState): GarageState | undefined;
  getValue(property: GarageProperty.TargetState): GarageState | undefined;
  getValue(property: GarageProperty.ObstructionDetected): boolean | undefined;
  getValue(property: string): unknown;
}

/**
 * Garage door control. Override `setTargetState()` to drive hardware and call
 * `await super.setTargetState(value)` once the hardware confirms — the base
 * implementation updates both `targetState` and `currentState`.
 *
 * For long-running transitions (Opening/Closing intermediate states), override
 * `setTargetState` and write `currentState` separately as the door moves.
 */
export class GarageControl<TStorage extends object = Record<string, any>> extends Sensor<GarageControlProperties, TStorage, string> {
  readonly type = SensorType.Garage;
  readonly category = SensorCategory.Control;

  constructor(name = 'Garage') {
    super(name);

    this._writeState({
      [GarageProperty.CurrentState]: GarageState.Closed,
      [GarageProperty.TargetState]: GarageState.Closed,
      [GarageProperty.ObstructionDetected]: false,
    });
  }

  get currentState(): GarageState {
    return this.props.currentState;
  }

  get targetState(): GarageState {
    return this.props.targetState;
  }

  get obstructionDetected(): boolean {
    return this.props.obstructionDetected;
  }

  /**
   * Set the target state. Override to drive hardware and call
   * `await super.setTargetState(value)` after success — the base implementation
   * syncs both `targetState` and `currentState` to the new value.
   *
   * @param value - Desired target state from the {@link GarageState} enum.
   *
   * @example
   * ```ts
   * import { GarageState } from '@camera.ui/sdk';
   * await garage.setTargetState(GarageState.Open);
   * ```
   */
  async setTargetState(value: GarageState): Promise<void> {
    this._writeState({
      [GarageProperty.TargetState]: value,
      [GarageProperty.CurrentState]: value,
    });
  }

  /**
   * Publish the actual door state. Use this to drive long-running transitions
   * (e.g. Open → Closing → Closed) independently of the user-requested target
   * state. Read-only from cross-process consumers (`updateValue` ignores it).
   *
   * @param value - Current physical door state from the {@link GarageState} enum.
   *
   * @example
   * ```ts
   * import { GarageState } from '@camera.ui/sdk';
   * garage.setCurrentState(GarageState.Closing);
   * ```
   */
  setCurrentState(value: GarageState): void {
    this._writeState({ [GarageProperty.CurrentState]: value });
  }

  /**
   * Publish the obstruction-detected state. Read-only from the consumer side
   * (`updateValue` ignores it) — plugin code calls this when its hardware
   * reports an obstruction sensor change.
   *
   * @param value - True when an obstruction is currently detected.
   *
   * @example
   * ```ts
   * garage.setObstructionDetected(true);
   * ```
   */
  setObstructionDetected(value: boolean): void {
    this._writeState({ [GarageProperty.ObstructionDetected]: value });
  }

  /**
   * Cross-process consumer entry point. Dispatches writable properties
   * to semantic methods so plugin overrides (hardware actions) are honored.
   * `currentState` and `obstructionDetected` are observed-only and not externally writable;
   * only `targetState` may be set.
   *
   * @param property - Property name to write.
   *
   * @param value - New value for the property.
   *
   * @internal
   */
  async updateValue(property: string, value: unknown): Promise<void> {
    if ((property as GarageProperty) === GarageProperty.TargetState) {
      await this.setTargetState(value as GarageState);
    }
    // Unknown / non-writable property (incl. currentState, obstructionDetected) — ignored.
  }
}

/** Registry metadata for {@link GarageControl}. */
export const garageMeta = defineSensor({
  type: SensorType.Garage,
  category: SensorCategory.Control,
  assignmentKey: 'garage',
  multiProvider: true,
  isDetectionType: false,
  properties: Object.values(GarageProperty),
  shortcutable: true,
  cascadeTrigger: { property: GarageProperty.CurrentState, value: 0, sustained: true },
  virtual: { properties: { [GarageProperty.CurrentState]: 1, [GarageProperty.TargetState]: 1 } },
  semantics: {
    domain: SensorDomain.Cover,
    stateProperty: GarageProperty.CurrentState,
    commandProperty: GarageProperty.TargetState,
    deviceClass: 'garage',
    states: {
      open: GarageState.Open,
      closed: GarageState.Closed,
      opening: GarageState.Opening,
      closing: GarageState.Closing,
      stopped: GarageState.Stopped,
    },
  },
});
