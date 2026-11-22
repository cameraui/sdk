import { Sensor, SensorCategory } from './base.js';

import type { SensorOptions } from './base.js';

/** How long a sent command stays in `command` before it reads empty again. */
export const COMMAND_AUTO_RESET_MS = 1000;

/** Property values every robot carries. */
export interface RobotControlProperties {
  /** What the robot does right now. */
  activity: string | undefined;
  /** The command sent last, empty again right after. */
  command: string;
}

/**
 * Base of the robots that run on their own and take one-off commands, such as a
 * vacuum or a lawn mower. A command reads in `command` for a moment
 * ({@link COMMAND_AUTO_RESET_MS}) and then empty again, so the history records
 * each one and the next arrives the same way.
 */
export abstract class RobotControl<
  TProperties extends RobotControlProperties,
  TStorage extends object = Record<string, any>,
  TCapability extends string = string,
> extends Sensor<TProperties, TStorage, TCapability> {
  readonly category = SensorCategory.Control;

  private _commandResetTimer?: ReturnType<typeof setTimeout>;

  constructor(name: string, options?: SensorOptions) {
    super(name, options);

    this._writeState({ command: '' } as Partial<TProperties>);
  }

  /** What the robot does right now. */
  get activity(): TProperties['activity'] {
    return this.props.activity;
  }

  /**
   * Report what the robot does right now.
   *
   * @param value - One of the type's activities.
   *
   * @example
   * ```ts
   * robot.setActivity('docked');
   * ```
   */
  setActivity(value: NonNullable<TProperties['activity']>): void {
    this._writeState({ activity: value } as Partial<TProperties>);
  }

  override _cleanup(): void {
    if (this._commandResetTimer) {
      clearTimeout(this._commandResetTimer);
      this._commandResetTimer = undefined;
    }
    super._cleanup();
  }

  /** @internal */
  protected _sent(value: TProperties['command']): void {
    if (this._commandResetTimer) clearTimeout(this._commandResetTimer);
    if (this.props.command) this._writeState({ command: '' } as Partial<TProperties>);
    this._writeState({ command: value } as Partial<TProperties>);
    this._commandResetTimer = setTimeout(() => {
      this._commandResetTimer = undefined;
      this._writeState({ command: '' } as Partial<TProperties>);
    }, COMMAND_AUTO_RESET_MS);
  }
}
