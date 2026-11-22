import { CommandControl } from './command.js';

import type { CommandControlProperties } from './command.js';

/** Property values every robot carries. */
export interface RobotControlProperties extends CommandControlProperties {
  /** What the robot does right now. */
  activity: string | undefined;
}

/**
 * Base of the robots that run on their own and take one-off commands, such as a
 * vacuum or a lawn mower.
 */
export abstract class RobotControl<
  TProperties extends RobotControlProperties,
  TStorage extends object = Record<string, any>,
  TCapability extends string = string,
> extends CommandControl<TProperties, TStorage, TCapability> {
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
}
