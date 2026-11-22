import { SensorCategory, SensorType } from './base.js';
import { defineSensor, SensorDomain } from './meta.js';
import { RobotControl } from './robot.js';

import type { Observable } from '../observable/index.js';
import type { PropertyChangeOf, SensorLike, SensorOptions } from './base.js';

/** What a vacuum does right now. */
export enum VacuumActivity {
  Cleaning = 'cleaning',
  Docked = 'docked',
  Idle = 'idle',
  Paused = 'paused',
  Returning = 'returning',
  Error = 'error',
}

/** Commands a vacuum takes. */
export enum VacuumCommand {
  Start = 'start',
  Pause = 'pause',
  Stop = 'stop',
  Dock = 'dock',
  Locate = 'locate',
  Spot = 'spot',
}

/** Optional capabilities of a vacuum. */
export enum VacuumCapability {
  /** Vacuum cleans with a choice of suction levels. */
  FanSpeed = 'fanSpeed',
}

/** Property names of a vacuum. */
export enum VacuumProperty {
  /** What the vacuum does right now, a {@link VacuumActivity}. */
  Activity = 'activity',
  /** One-off {@link VacuumCommand} when written, empty again right after. */
  Command = 'command',
  /** Suction level, one of the choices the plugin sets. */
  FanSpeed = 'fanSpeed',
}

/** Property values of a vacuum. */
export interface VacuumControlProperties {
  [VacuumProperty.Activity]: VacuumActivity | undefined;
  [VacuumProperty.Command]: VacuumCommand | '';
  [VacuumProperty.FanSpeed]: string | undefined;
}

/** Read-only proxy interface for a vacuum. */
export interface VacuumControlLike extends SensorLike {
  readonly type: SensorType.Vacuum;
  readonly onPropertyChanged: Observable<PropertyChangeOf<VacuumControlProperties>>;
  readonly onCapabilitiesChanged: Observable<VacuumCapability[]>;

  getValue(property: VacuumProperty.Activity): VacuumActivity | undefined;
  getValue(property: VacuumProperty.Command): VacuumCommand | '' | undefined;
  getValue(property: VacuumProperty.FanSpeed): string | undefined;
  getValue(property: string): unknown;
}

/**
 * A robot vacuum. Override `start()`, `pause()`, `stop()`, `dock()`,
 * `locate()`, `spot()` and `setFanSpeed()` to drive hardware and call the
 * `super` method after success. Report what the vacuum does with
 * `setActivity()`.
 *
 * Narrow the commands to those the vacuum takes with
 * `setPropertySpec(VacuumProperty.Command, { values: [...] })`. The suction
 * levels come as choices with the `fanSpeed` capability:
 * `setPropertySpec(VacuumProperty.FanSpeed, { choices })`.
 *
 * @example
 * ```ts
 * class Robot extends VacuumControl {
 *   constructor() {
 *     super('Robot');
 *     this.setPropertySpec(VacuumProperty.Command, { values: [VacuumCommand.Start, VacuumCommand.Pause, VacuumCommand.Dock] });
 *   }
 *
 *   override async start(): Promise<void> {
 *     await device.clean();
 *     await super.start();
 *   }
 * }
 * ```
 */
export class VacuumControl<TStorage extends object = Record<string, any>> extends RobotControl<VacuumControlProperties, TStorage, VacuumCapability> {
  readonly type = SensorType.Vacuum;

  constructor(name = 'Vacuum', options?: SensorOptions) {
    super(name, options);
  }

  /** Suction level. */
  get fanSpeed(): string | undefined {
    return this.props.fanSpeed;
  }

  /**
   * Start or resume cleaning. Override to drive hardware and call
   * `await super.start()` after success.
   *
   * @example
   * ```ts
   * await vacuum.start();
   * ```
   */
  async start(): Promise<void> {
    this._sent(VacuumCommand.Start);
  }

  /**
   * Pause cleaning where the vacuum is. Override to drive hardware and call
   * `await super.pause()` after success.
   *
   * @example
   * ```ts
   * await vacuum.pause();
   * ```
   */
  async pause(): Promise<void> {
    this._sent(VacuumCommand.Pause);
  }

  /**
   * Stop cleaning. Override to drive hardware and call `await super.stop()`
   * after success.
   *
   * @example
   * ```ts
   * await vacuum.stop();
   * ```
   */
  async stop(): Promise<void> {
    this._sent(VacuumCommand.Stop);
  }

  /**
   * Send the vacuum back to its dock. Override to drive hardware and call
   * `await super.dock()` after success.
   *
   * @example
   * ```ts
   * await vacuum.dock();
   * ```
   */
  async dock(): Promise<void> {
    this._sent(VacuumCommand.Dock);
  }

  /**
   * Make the vacuum beep so it can be found. Override to drive hardware and
   * call `await super.locate()` after success.
   *
   * @example
   * ```ts
   * await vacuum.locate();
   * ```
   */
  async locate(): Promise<void> {
    this._sent(VacuumCommand.Locate);
  }

  /**
   * Clean the spot around the vacuum. Override to drive hardware and call
   * `await super.spot()` after success.
   *
   * @example
   * ```ts
   * await vacuum.spot();
   * ```
   */
  async spot(): Promise<void> {
    this._sent(VacuumCommand.Spot);
  }

  /**
   * Set the suction level. Override to drive hardware and call
   * `await super.setFanSpeed(value)` after success to sync the SDK state.
   *
   * @param value - One of the suction level choices.
   *
   * @example
   * ```ts
   * await vacuum.setFanSpeed('turbo');
   * ```
   */
  async setFanSpeed(value: string): Promise<void> {
    this._writeState({ [VacuumProperty.FanSpeed]: value });
  }

  /** @internal */
  async updateValue(property: string, value: unknown): Promise<void> {
    if ((property as VacuumProperty) === VacuumProperty.FanSpeed) {
      await this.setFanSpeed(String(value));
      return;
    }
    if ((property as VacuumProperty) !== VacuumProperty.Command) return;
    switch (value as VacuumCommand) {
      case VacuumCommand.Start:
        return await this.start();
      case VacuumCommand.Pause:
        return await this.pause();
      case VacuumCommand.Stop:
        return await this.stop();
      case VacuumCommand.Dock:
        return await this.dock();
      case VacuumCommand.Locate:
        return await this.locate();
      case VacuumCommand.Spot:
        return await this.spot();
    }
  }
}

const VACUUM_COMMANDS = {
  start: VacuumCommand.Start,
  pause: VacuumCommand.Pause,
  stop: VacuumCommand.Stop,
  dock: VacuumCommand.Dock,
  locate: VacuumCommand.Locate,
  spot: VacuumCommand.Spot,
};

/** Registry metadata for {@link VacuumControl}. */
export const vacuumMeta = defineSensor({
  type: SensorType.Vacuum,
  category: SensorCategory.Control,
  assignmentKey: 'vacuum',
  multiProvider: true,
  isDetectionType: false,
  properties: {
    [VacuumProperty.Activity]: {
      type: 'enum',
      values: {
        cleaning: VacuumActivity.Cleaning,
        docked: VacuumActivity.Docked,
        idle: VacuumActivity.Idle,
        paused: VacuumActivity.Paused,
        returning: VacuumActivity.Returning,
        error: VacuumActivity.Error,
      },
    },
    [VacuumProperty.Command]: { type: 'enum', values: VACUUM_COMMANDS, writable: true },
    [VacuumProperty.FanSpeed]: { type: 'string', writable: true },
  },
  shortcutable: true,
  propertyCapabilities: {
    [VacuumProperty.FanSpeed]: VacuumCapability.FanSpeed,
  },
  virtual: { properties: { [VacuumProperty.Activity]: VacuumActivity.Docked } },
  semantics: {
    domain: SensorDomain.Vacuum,
    stateProperty: VacuumProperty.Activity,
    commandProperty: VacuumProperty.Command,
    commands: VACUUM_COMMANDS,
    fanSpeed: { property: VacuumProperty.FanSpeed },
  },
});
