import { SensorCategory, SensorType } from './base.js';
import { defineSensor, SensorDomain } from './meta.js';
import { RobotControl } from './robot.js';

import type { Observable } from '../observable/index.js';
import type { PropertyChangeOf, SensorLike, SensorOptions } from './base.js';

/** What a lawn mower does right now. */
export enum LawnMowerActivity {
  /** Mower is mowing. */
  Mowing = 'mowing',
  /** Mower is in its dock. */
  Docked = 'docked',
  /** Mower paused where it is. */
  Paused = 'paused',
  /** Mower drives back to its dock. */
  Returning = 'returning',
  /** Mower reports an error. */
  Error = 'error',
}

/** Commands a lawn mower takes. */
export enum LawnMowerCommand {
  /** Start or resume mowing. */
  Start = 'start',
  /** Pause mowing where the mower is. */
  Pause = 'pause',
  /** Stop mowing and send the mower back to its dock. */
  Dock = 'dock',
}

/** Property names of a lawn mower. */
export enum LawnMowerProperty {
  /** What the mower does right now, a {@link LawnMowerActivity}. */
  Activity = 'activity',
  /** One-off {@link LawnMowerCommand} when written, empty again right after. */
  Command = 'command',
}

/** Property values of a lawn mower. */
export interface LawnMowerControlProperties {
  [LawnMowerProperty.Activity]: LawnMowerActivity | undefined;
  [LawnMowerProperty.Command]: LawnMowerCommand | '';
}

/** Read-only proxy interface for a lawn mower. */
export interface LawnMowerControlLike extends SensorLike {
  readonly type: SensorType.LawnMower;
  readonly onPropertyChanged: Observable<PropertyChangeOf<LawnMowerControlProperties>>;

  getValue(property: LawnMowerProperty.Activity): LawnMowerActivity | undefined;
  getValue(property: LawnMowerProperty.Command): LawnMowerCommand | '' | undefined;
  getValue(property: string): unknown;
}

/**
 * A robot lawn mower. Override `start()`, `pause()` and `dock()` to drive
 * hardware and call the `super` method after success. Report what the mower
 * does with `setActivity()`.
 *
 * Narrow the commands to those the mower takes with
 * `setPropertySpec(LawnMowerProperty.Command, { values: [...] })`.
 *
 * When the device refuses a command, throw from the override instead of calling
 * `super`: the write fails for whoever sent it and the state stays as it was.
 *
 * @example
 * ```ts
 * class Mower extends LawnMowerControl {
 *   override async dock(): Promise<void> {
 *     await device.goHome();
 *     await super.dock();
 *   }
 * }
 * ```
 */
export class LawnMowerControl<TStorage extends object = Record<string, any>> extends RobotControl<LawnMowerControlProperties, TStorage> {
  readonly type = SensorType.LawnMower;

  constructor(name = 'Lawn Mower', options?: SensorOptions) {
    super(name, options);
  }

  /**
   * Start or resume mowing. Override to drive hardware and call
   * `await super.start()` after success.
   *
   * @example
   * ```ts
   * await mower.start();
   * ```
   */
  async start(): Promise<void> {
    this._sent(LawnMowerCommand.Start);
  }

  /**
   * Pause mowing where the mower is. Override to drive hardware and call
   * `await super.pause()` after success.
   *
   * @example
   * ```ts
   * await mower.pause();
   * ```
   */
  async pause(): Promise<void> {
    this._sent(LawnMowerCommand.Pause);
  }

  /**
   * Stop mowing and send the mower back to its dock. Override to drive
   * hardware and call `await super.dock()` after success.
   *
   * @example
   * ```ts
   * await mower.dock();
   * ```
   */
  async dock(): Promise<void> {
    this._sent(LawnMowerCommand.Dock);
  }

  /** @internal */
  protected override _isCommand(property: string): boolean {
    return (property as LawnMowerProperty) === LawnMowerProperty.Command;
  }

  /** @internal */
  protected override async _applyValue(property: string, value: unknown): Promise<void> {
    if ((property as LawnMowerProperty) !== LawnMowerProperty.Command) return;
    switch (value as LawnMowerCommand) {
      case LawnMowerCommand.Start:
        return await this.start();
      case LawnMowerCommand.Pause:
        return await this.pause();
      case LawnMowerCommand.Dock:
        return await this.dock();
    }
  }
}

const LAWN_MOWER_COMMANDS = { start: LawnMowerCommand.Start, pause: LawnMowerCommand.Pause, dock: LawnMowerCommand.Dock };

/** Registry metadata for {@link LawnMowerControl}. */
export const lawnMowerMeta = defineSensor({
  type: SensorType.LawnMower,
  category: SensorCategory.Control,
  assignmentKey: 'lawnMower',
  multiProvider: true,
  isDetectionType: false,
  properties: {
    [LawnMowerProperty.Activity]: {
      type: 'enum',
      values: {
        mowing: LawnMowerActivity.Mowing,
        docked: LawnMowerActivity.Docked,
        paused: LawnMowerActivity.Paused,
        returning: LawnMowerActivity.Returning,
        error: LawnMowerActivity.Error,
      },
    },
    [LawnMowerProperty.Command]: { type: 'enum', values: LAWN_MOWER_COMMANDS, writable: true, command: true },
  },
  shortcutable: true,
  cascadeTrigger: { property: LawnMowerProperty.Activity, values: [LawnMowerActivity.Mowing], sustained: true },
  virtual: { properties: { [LawnMowerProperty.Activity]: LawnMowerActivity.Docked } },
  semantics: {
    domain: SensorDomain.LawnMower,
    stateProperty: LawnMowerProperty.Activity,
    commandProperty: LawnMowerProperty.Command,
    commands: LAWN_MOWER_COMMANDS,
  },
});
