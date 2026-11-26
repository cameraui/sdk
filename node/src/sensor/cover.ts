import { Sensor, SensorCategory, SensorType } from './base.js';
import { defineSensor, SensorDomain } from './meta.js';
import { PERCENT } from '../internal/shared-utils.js';

import type { Observable } from '../observable/index.js';
import type { PropertyChangeOf, SensorLike, SensorOptions } from './base.js';

/** State of a cover. A target takes `Open` and `Closed`. */
export enum CoverState {
  /** Cover is open, fully or part-way. */
  Open = 0,
  /** Cover is fully closed. */
  Closed = 1,
  /** Cover is moving towards open. */
  Opening = 2,
  /** Cover is moving towards closed. */
  Closing = 3,
  /** Cover stopped part-way. */
  Stopped = 4,
}

/** What a cover is, it decides how smart homes show it. */
export enum CoverKind {
  /** An awning. */
  Awning = 'awning',
  /** A blind of slats, such as a Venetian blind. */
  Blind = 'blind',
  /** A curtain or drape. */
  Curtain = 'curtain',
  /** A damper that controls the airflow in a duct. */
  Damper = 'damper',
  /** A door or gate. */
  Door = 'door',
  /** A shade of one piece of fabric, such as a roller shade. */
  Shade = 'shade',
  /** A shutter, such as a roller shutter. */
  Shutter = 'shutter',
  /** A window that opens and closes. */
  Window = 'window',
}

/** Optional capabilities of a cover. */
export enum CoverCapability {
  /** Cover moves to a position between closed and open. */
  Position = 'position',
  /** Cover tilts its slats. */
  Tilt = 'tilt',
  /** Cover stops while it moves. */
  Stop = 'stop',
}

/** Property names of a cover. */
export enum CoverProperty {
  /** Current state, a {@link CoverState}. */
  CurrentState = 'currentState',
  /** Target state, `Open` or `Closed`. */
  TargetState = 'targetState',
  /** Current position, 0 (closed) to 100 (open). */
  CurrentPosition = 'currentPosition',
  /** Target position, 0 (closed) to 100 (open). */
  TargetPosition = 'targetPosition',
  /** Current tilt of the slats, 0 (closed) to 100 (open). */
  CurrentTilt = 'currentTilt',
  /** Target tilt of the slats, 0 (closed) to 100 (open). */
  TargetTilt = 'targetTilt',
  /** Command that stops the cover, it reads `false` again once handled. */
  Stop = 'stop',
  /** Whether something blocks the cover. */
  ObstructionDetected = 'obstructionDetected',
  /** What the cover is, a {@link CoverKind}. */
  Kind = 'kind',
}

/** Property values of a cover. */
export interface CoverControlProperties {
  [CoverProperty.CurrentState]: CoverState;
  [CoverProperty.TargetState]: CoverState;
  [CoverProperty.CurrentPosition]: number;
  [CoverProperty.TargetPosition]: number;
  [CoverProperty.CurrentTilt]: number;
  [CoverProperty.TargetTilt]: number;
  [CoverProperty.Stop]: boolean;
  [CoverProperty.ObstructionDetected]: boolean;
  [CoverProperty.Kind]: CoverKind | undefined;
}

/** Read-only proxy interface for a cover. */
export interface CoverControlLike extends SensorLike {
  readonly type: SensorType.Cover;
  readonly onPropertyChanged: Observable<PropertyChangeOf<CoverControlProperties>>;
  readonly onCapabilitiesChanged: Observable<CoverCapability[]>;

  getValue(property: CoverProperty.CurrentState): CoverState | undefined;
  getValue(property: CoverProperty.TargetState): CoverState | undefined;
  getValue(property: CoverProperty.CurrentPosition): number | undefined;
  getValue(property: CoverProperty.TargetPosition): number | undefined;
  getValue(property: CoverProperty.CurrentTilt): number | undefined;
  getValue(property: CoverProperty.TargetTilt): number | undefined;
  getValue(property: CoverProperty.Stop): boolean | undefined;
  getValue(property: CoverProperty.ObstructionDetected): boolean | undefined;
  getValue(property: CoverProperty.Kind): CoverKind | undefined;
  getValue(property: string): unknown;
}

/**
 * A blind, shutter, awning, curtain or other cover. Override `setTargetState()`,
 * `setTargetPosition()` and `setTargetTilt()` to drive hardware and call the
 * `super` method after success to sync the SDK state. Report what the hardware
 * does with `setCurrentState()`, `setCurrentPosition()` and `setCurrentTilt()`.
 *
 * A cover that moves to positions adds {@link CoverCapability.Position}, one
 * with slats {@link CoverCapability.Tilt}, one that stops on command
 * {@link CoverCapability.Stop} and overrides `stop()`. `setKind()` says what
 * the cover is.
 *
 * When the device refuses a command, throw from the override instead of calling
 * `super`: the write fails for whoever sent it and the state stays as it was.
 *
 * @example
 * ```ts
 * class Blind extends CoverControl {
 *   constructor() {
 *     super('Living room blind');
 *     this.setKind(CoverKind.Blind);
 *     this.capabilities = [CoverCapability.Position];
 *   }
 *
 *   override async setTargetPosition(position: number): Promise<void> {
 *     await motor.moveTo(position);
 *     await super.setTargetPosition(position);
 *   }
 * }
 * ```
 */
export class CoverControl<TStorage extends object = Record<string, any>> extends Sensor<CoverControlProperties, TStorage, CoverCapability> {
  readonly type = SensorType.Cover;
  readonly category = SensorCategory.Control;

  constructor(name = 'Cover', options?: SensorOptions) {
    super(name, options);

    this._writeState({
      [CoverProperty.CurrentState]: CoverState.Closed,
      [CoverProperty.TargetState]: CoverState.Closed,
      [CoverProperty.CurrentPosition]: 0,
      [CoverProperty.TargetPosition]: 0,
      [CoverProperty.CurrentTilt]: 0,
      [CoverProperty.TargetTilt]: 0,
      [CoverProperty.Stop]: false,
      [CoverProperty.ObstructionDetected]: false,
    });
  }

  /** Current state, a {@link CoverState}. */
  get currentState(): CoverState {
    return this.props.currentState;
  }

  /** Target state, `Open` or `Closed`. */
  get targetState(): CoverState {
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

  /** Current tilt of the slats, 0 (closed) to 100 (open). */
  get currentTilt(): number {
    return this.props.currentTilt;
  }

  /** Target tilt of the slats, 0 (closed) to 100 (open). */
  get targetTilt(): number {
    return this.props.targetTilt;
  }

  /** Whether something blocks the cover. */
  get obstructionDetected(): boolean {
    return this.props.obstructionDetected;
  }

  /** What the cover is, a {@link CoverKind}. */
  get kind(): CoverKind | undefined {
    return this.props.kind;
  }

  /**
   * Open, close or stop the cover. Override to drive hardware and call
   * `await super.setTargetState(value)` after success to sync the SDK state.
   *
   * @param value - `CoverState.Open` or `CoverState.Closed`.
   *
   * @example
   * ```ts
   * await cover.setTargetState(CoverState.Open);
   * ```
   */
  async setTargetState(value: CoverState): Promise<void> {
    this._writeState({ [CoverProperty.TargetState]: value, [CoverProperty.CurrentState]: value });
  }

  /**
   * Stop the cover. Override to drive hardware and call `await super.stop()`
   * after success, which reports the cover as stopped. The `stop` property is
   * a command and stays `false`.
   *
   * @example
   * ```ts
   * await cover.stop();
   * ```
   */
  async stop(): Promise<void> {
    this._writeState({ [CoverProperty.CurrentState]: CoverState.Stopped });
  }

  /**
   * Report the state of the cover.
   *
   * @param value - What the cover does right now.
   *
   * @example
   * ```ts
   * cover.setCurrentState(CoverState.Opening);
   * ```
   */
  setCurrentState(value: CoverState): void {
    this._writeState({ [CoverProperty.CurrentState]: value });
  }

  /**
   * Move the cover to a position. Override to drive hardware and call
   * `await super.setTargetPosition(position)` after success to sync the SDK state.
   *
   * @param position - 0 (closed) to 100 (open).
   *
   * @example
   * ```ts
   * await cover.setTargetPosition(50);
   * ```
   */
  async setTargetPosition(position: number): Promise<void> {
    const value = Math.max(0, Math.min(100, Math.round(position)));
    this._writeState({ [CoverProperty.TargetPosition]: value, [CoverProperty.CurrentPosition]: value });
  }

  /**
   * Report the position of the cover.
   *
   * @param position - 0 (closed) to 100 (open).
   *
   * @example
   * ```ts
   * cover.setCurrentPosition(30);
   * ```
   */
  setCurrentPosition(position: number): void {
    this._writeState({ [CoverProperty.CurrentPosition]: Math.max(0, Math.min(100, Math.round(position))) });
  }

  /**
   * Tilt the slats. Override to drive hardware and call
   * `await super.setTargetTilt(tilt)` after success to sync the SDK state.
   *
   * @param tilt - 0 (closed) to 100 (open).
   *
   * @example
   * ```ts
   * await cover.setTargetTilt(100);
   * ```
   */
  async setTargetTilt(tilt: number): Promise<void> {
    const value = Math.max(0, Math.min(100, Math.round(tilt)));
    this._writeState({ [CoverProperty.TargetTilt]: value, [CoverProperty.CurrentTilt]: value });
  }

  /**
   * Report the tilt of the slats.
   *
   * @param tilt - 0 (closed) to 100 (open).
   *
   * @example
   * ```ts
   * cover.setCurrentTilt(40);
   * ```
   */
  setCurrentTilt(tilt: number): void {
    this._writeState({ [CoverProperty.CurrentTilt]: Math.max(0, Math.min(100, Math.round(tilt))) });
  }

  /**
   * Report whether something blocks the cover.
   *
   * @param value - `true` while something blocks it.
   *
   * @example
   * ```ts
   * cover.setObstructionDetected(true);
   * ```
   */
  setObstructionDetected(value: boolean): void {
    this._writeState({ [CoverProperty.ObstructionDetected]: value });
  }

  /**
   * Say what the cover is. Smart homes show it by its kind, a window or a
   * door for example, and Home Assistant takes it as the device class.
   *
   * @param kind - What the cover is.
   *
   * @example
   * ```ts
   * cover.setKind(CoverKind.Shutter);
   * ```
   */
  setKind(kind: CoverKind): void {
    this._writeState({ [CoverProperty.Kind]: kind });
    this.setPropertySpec(CoverProperty.Kind, { values: [kind] });
  }

  /** @internal */
  protected override _isCommand(property: string): boolean {
    return (property as CoverProperty) === CoverProperty.Stop;
  }

  /** @internal */
  protected override async _applyValue(property: string, value: unknown): Promise<void> {
    switch (property as CoverProperty) {
      case CoverProperty.TargetState:
        await this.setTargetState(value as CoverState);
        return;
      case CoverProperty.TargetPosition:
        await this.setTargetPosition(Number(value));
        return;
      case CoverProperty.TargetTilt:
        await this.setTargetTilt(Number(value));
        return;
      case CoverProperty.Stop:
        if (value) await this.stop();
        return;
    }
  }
}

const COVER_STATES = {
  open: CoverState.Open,
  closed: CoverState.Closed,
  opening: CoverState.Opening,
  closing: CoverState.Closing,
  stopped: CoverState.Stopped,
};

/** Registry metadata for {@link CoverControl}. */
export const coverMeta = defineSensor({
  type: SensorType.Cover,
  category: SensorCategory.Control,
  assignmentKey: 'cover',
  multiProvider: true,
  isDetectionType: false,
  properties: {
    [CoverProperty.CurrentState]: { type: 'enum', values: COVER_STATES },
    [CoverProperty.TargetState]: {
      type: 'enum',
      values: { open: CoverState.Open, closed: CoverState.Closed },
      writable: true,
    },
    [CoverProperty.CurrentPosition]: PERCENT,
    [CoverProperty.TargetPosition]: { ...PERCENT, writable: true },
    [CoverProperty.CurrentTilt]: PERCENT,
    [CoverProperty.TargetTilt]: { ...PERCENT, writable: true },
    [CoverProperty.Stop]: { type: 'boolean', writable: true, internal: true, command: true },
    [CoverProperty.ObstructionDetected]: { type: 'boolean' },
    [CoverProperty.Kind]: {
      type: 'enum',
      values: {
        awning: CoverKind.Awning,
        blind: CoverKind.Blind,
        curtain: CoverKind.Curtain,
        damper: CoverKind.Damper,
        door: CoverKind.Door,
        shade: CoverKind.Shade,
        shutter: CoverKind.Shutter,
        window: CoverKind.Window,
      },
      internal: true,
    },
  },
  shortcutable: true,
  cascadeTrigger: { property: CoverProperty.CurrentState, values: [CoverState.Open], sustained: true },
  propertyCapabilities: {
    [CoverProperty.CurrentPosition]: CoverCapability.Position,
    [CoverProperty.TargetPosition]: CoverCapability.Position,
    [CoverProperty.CurrentTilt]: CoverCapability.Tilt,
    [CoverProperty.TargetTilt]: CoverCapability.Tilt,
    [CoverProperty.Stop]: CoverCapability.Stop,
  },
  virtual: {
    properties: { [CoverProperty.CurrentState]: CoverState.Closed, [CoverProperty.TargetState]: CoverState.Closed },
    optionalCapabilities: {
      [CoverCapability.Position]: { [CoverProperty.CurrentPosition]: 0, [CoverProperty.TargetPosition]: 0 },
      [CoverCapability.Tilt]: { [CoverProperty.CurrentTilt]: 0, [CoverProperty.TargetTilt]: 0 },
    },
  },
  semantics: {
    domain: SensorDomain.Cover,
    stateProperty: CoverProperty.CurrentState,
    commandProperty: CoverProperty.TargetState,
    deviceClassProperty: CoverProperty.Kind,
    states: COVER_STATES,
    position: { current: CoverProperty.CurrentPosition, target: CoverProperty.TargetPosition },
    tilt: { current: CoverProperty.CurrentTilt, target: CoverProperty.TargetTilt },
    stop: { property: CoverProperty.Stop },
  },
});
