import { Sensor, SensorCategory, SensorType } from './base.js';
import { defineSensor, SensorDomain } from './meta.js';

import type { Observable } from '../observable/index.js';
import type { PropertyChangeOf, SensorLike, SensorOptions } from './base.js';

/** State of a valve. A target takes `Open` and `Closed`. */
export enum ValveState {
  Open = 0,
  Closed = 1,
  Opening = 2,
  Closing = 3,
}

/** What a valve controls, it decides how smart homes show it. */
export enum ValveKind {
  Water = 'water',
  Gas = 'gas',
  Irrigation = 'irrigation',
}

/** Optional capabilities of a valve. */
export enum ValveCapability {
  /** Valve opens to a position between closed and open. */
  Position = 'position',
  /** Valve closes by itself after a set time. */
  Duration = 'duration',
}

/** Property names of a valve. */
export enum ValveProperty {
  /** Current state, a {@link ValveState}. */
  CurrentState = 'currentState',
  /** Target state, `Open` or `Closed`. */
  TargetState = 'targetState',
  /** Current position, 0 (closed) to 100 (open). */
  CurrentPosition = 'currentPosition',
  /** Target position, 0 (closed) to 100 (open). */
  TargetPosition = 'targetPosition',
  /** Seconds the valve stays open before it closes by itself. */
  Duration = 'duration',
  /** Seconds left until the open valve closes by itself. */
  Remaining = 'remaining',
  /** What the valve controls, a {@link ValveKind}. */
  Kind = 'kind',
  /** Position of the valve on its device, from 1. */
  Index = 'index',
}

/** Property values of a valve. */
export interface ValveControlProperties {
  [ValveProperty.CurrentState]: ValveState;
  [ValveProperty.TargetState]: ValveState;
  [ValveProperty.CurrentPosition]: number;
  [ValveProperty.TargetPosition]: number;
  [ValveProperty.Duration]: number;
  [ValveProperty.Remaining]: number;
  [ValveProperty.Kind]: ValveKind | undefined;
  [ValveProperty.Index]: number;
}

/** Options of a valve, on top of the common sensor options. */
export interface ValveOptions extends SensorOptions {
  /** Position of the valve on its device, from 1, e.g. the zone of an irrigation controller. */
  index?: number;
}

/** Read-only proxy interface for a valve. */
export interface ValveControlLike extends SensorLike {
  readonly type: SensorType.Valve;
  readonly onPropertyChanged: Observable<PropertyChangeOf<ValveControlProperties>>;
  readonly onCapabilitiesChanged: Observable<ValveCapability[]>;

  getValue(property: ValveProperty.CurrentState): ValveState | undefined;
  getValue(property: ValveProperty.TargetState): ValveState | undefined;
  getValue(property: ValveProperty.CurrentPosition): number | undefined;
  getValue(property: ValveProperty.TargetPosition): number | undefined;
  getValue(property: ValveProperty.Duration): number | undefined;
  getValue(property: ValveProperty.Remaining): number | undefined;
  getValue(property: ValveProperty.Kind): ValveKind | undefined;
  getValue(property: ValveProperty.Index): number | undefined;
  getValue(property: string): unknown;
}

/**
 * A water or gas valve, or an irrigation zone. Override `setTargetState()`,
 * `setTargetPosition()` and `setDuration()` to drive hardware and call the
 * `super` method after success to sync the SDK state. Report what the hardware
 * does with `setCurrentState()`, `setCurrentPosition()` and `setRemaining()`.
 *
 * A valve that opens part way adds {@link ValveCapability.Position}, one that
 * closes by itself after a set time {@link ValveCapability.Duration}.
 * `setKind()` says what the valve controls, `index` in the options orders the
 * zones of one irrigation controller.
 *
 * @example
 * ```ts
 * class Zone extends ValveControl {
 *   constructor(zone: number) {
 *     super(`Zone ${zone}`, { index: zone });
 *     this.setKind(ValveKind.Irrigation);
 *     this.capabilities = [ValveCapability.Duration];
 *   }
 *
 *   override async setTargetState(value: ValveState): Promise<void> {
 *     await controller.run(this.index, value === ValveState.Open ? this.duration : 0);
 *     await super.setTargetState(value);
 *   }
 * }
 * ```
 */
export class ValveControl<TStorage extends object = Record<string, any>> extends Sensor<ValveControlProperties, TStorage, ValveCapability> {
  readonly type = SensorType.Valve;
  readonly category = SensorCategory.Control;

  constructor(name = 'Valve', options?: ValveOptions) {
    super(name, options);

    this._writeState({
      [ValveProperty.CurrentState]: ValveState.Closed,
      [ValveProperty.TargetState]: ValveState.Closed,
      [ValveProperty.CurrentPosition]: 0,
      [ValveProperty.TargetPosition]: 0,
      [ValveProperty.Duration]: 600,
      [ValveProperty.Remaining]: 0,
      [ValveProperty.Index]: options?.index ?? 0,
    });
  }

  /** Current state. */
  get currentState(): ValveState {
    return this.props.currentState;
  }

  /** Target state. */
  get targetState(): ValveState {
    return this.props.targetState;
  }

  /** Current position, 0 (closed) to 100 (open). */
  get currentPosition(): number {
    return this.props.currentPosition;
  }

  /** Target position, 0 (closed) to 100 (open). */
  get targetPosition(): number {
    return this.props.targetPosition;
  }

  /** Seconds the valve stays open before it closes by itself. */
  get duration(): number {
    return this.props.duration;
  }

  /** Seconds left until the open valve closes by itself. */
  get remaining(): number {
    return this.props.remaining;
  }

  /** What the valve controls. */
  get kind(): ValveKind | undefined {
    return this.props.kind;
  }

  /** Position of the valve on its device, 0 when not set. */
  get index(): number {
    return this.props.index;
  }

  /**
   * Open or close the valve. Override to drive hardware and call
   * `await super.setTargetState(value)` after success to sync the SDK state.
   *
   * @param value - `ValveState.Open` or `ValveState.Closed`.
   *
   * @example
   * ```ts
   * await valve.setTargetState(ValveState.Open);
   * ```
   */
  async setTargetState(value: ValveState): Promise<void> {
    this._writeState({ [ValveProperty.TargetState]: value, [ValveProperty.CurrentState]: value });
  }

  /**
   * Report the state of the valve.
   *
   * @param value - What the valve does right now.
   *
   * @example
   * ```ts
   * valve.setCurrentState(ValveState.Opening);
   * ```
   */
  setCurrentState(value: ValveState): void {
    this._writeState({ [ValveProperty.CurrentState]: value });
  }

  /**
   * Open the valve to a position. Override to drive hardware and call
   * `await super.setTargetPosition(position)` after success to sync the SDK state.
   *
   * @param position - 0 (closed) to 100 (open).
   *
   * @example
   * ```ts
   * await valve.setTargetPosition(50);
   * ```
   */
  async setTargetPosition(position: number): Promise<void> {
    const value = Math.max(0, Math.min(100, Math.round(position)));
    this._writeState({ [ValveProperty.TargetPosition]: value, [ValveProperty.CurrentPosition]: value });
  }

  /**
   * Report the position of the valve.
   *
   * @param position - 0 (closed) to 100 (open).
   *
   * @example
   * ```ts
   * valve.setCurrentPosition(30);
   * ```
   */
  setCurrentPosition(position: number): void {
    this._writeState({ [ValveProperty.CurrentPosition]: Math.max(0, Math.min(100, Math.round(position))) });
  }

  /**
   * Set how long the valve stays open. Override to drive hardware and call
   * `await super.setDuration(seconds)` after success to sync the SDK state.
   *
   * @param seconds - Seconds until the open valve closes by itself.
   *
   * @example
   * ```ts
   * await valve.setDuration(900);
   * ```
   */
  async setDuration(seconds: number): Promise<void> {
    this._writeState({ [ValveProperty.Duration]: Math.max(0, Math.round(seconds)) });
  }

  /**
   * Report how long the open valve has left.
   *
   * @param seconds - Seconds until it closes by itself, 0 when closed.
   *
   * @example
   * ```ts
   * valve.setRemaining(420);
   * ```
   */
  setRemaining(seconds: number): void {
    this._writeState({ [ValveProperty.Remaining]: Math.max(0, Math.round(seconds)) });
  }

  /**
   * Say what the valve controls. Smart homes show it by its kind, and Home
   * Assistant takes it as the device class.
   *
   * @param kind - What the valve controls.
   *
   * @example
   * ```ts
   * valve.setKind(ValveKind.Gas);
   * ```
   */
  setKind(kind: ValveKind): void {
    this._writeState({ [ValveProperty.Kind]: kind });
    this.setPropertySpec(ValveProperty.Kind, { values: [kind] });
  }

  /** @internal */
  async updateValue(property: string, value: unknown): Promise<void> {
    switch (property as ValveProperty) {
      case ValveProperty.TargetState:
        await this.setTargetState(value as ValveState);
        return;
      case ValveProperty.TargetPosition:
        await this.setTargetPosition(Number(value));
        return;
      case ValveProperty.Duration:
        await this.setDuration(Number(value));
        return;
    }
  }
}

const VALVE_STATES = {
  open: ValveState.Open,
  closed: ValveState.Closed,
  opening: ValveState.Opening,
  closing: ValveState.Closing,
};

const PERCENT = { type: 'number', min: 0, max: 100, step: 1, unit: '%' } as const;

/** Registry metadata for {@link ValveControl}. */
export const valveMeta = defineSensor({
  type: SensorType.Valve,
  category: SensorCategory.Control,
  assignmentKey: 'valve',
  multiProvider: true,
  isDetectionType: false,
  properties: {
    [ValveProperty.CurrentState]: { type: 'enum', values: VALVE_STATES },
    [ValveProperty.TargetState]: {
      type: 'enum',
      values: { open: ValveState.Open, closed: ValveState.Closed },
      writable: true,
    },
    [ValveProperty.CurrentPosition]: PERCENT,
    [ValveProperty.TargetPosition]: { ...PERCENT, writable: true },
    [ValveProperty.Duration]: { type: 'number', min: 0, max: 3600, step: 1, unit: 's', writable: true },
    [ValveProperty.Remaining]: { type: 'number', min: 0, unit: 's' },
    [ValveProperty.Kind]: {
      type: 'enum',
      values: { water: ValveKind.Water, gas: ValveKind.Gas, irrigation: ValveKind.Irrigation },
      internal: true,
    },
    [ValveProperty.Index]: { type: 'number', min: 0, step: 1, internal: true },
  },
  shortcutable: true,
  propertyCapabilities: {
    [ValveProperty.CurrentPosition]: ValveCapability.Position,
    [ValveProperty.TargetPosition]: ValveCapability.Position,
    [ValveProperty.Duration]: ValveCapability.Duration,
    [ValveProperty.Remaining]: ValveCapability.Duration,
  },
  virtual: { properties: { [ValveProperty.CurrentState]: ValveState.Closed, [ValveProperty.TargetState]: ValveState.Closed } },
  semantics: {
    domain: SensorDomain.Valve,
    stateProperty: ValveProperty.CurrentState,
    commandProperty: ValveProperty.TargetState,
    deviceClassProperty: ValveProperty.Kind,
    states: VALVE_STATES,
    position: { current: ValveProperty.CurrentPosition, target: ValveProperty.TargetPosition },
    duration: { property: ValveProperty.Duration, remaining: ValveProperty.Remaining },
  },
});
