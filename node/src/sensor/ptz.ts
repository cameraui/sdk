import { Sensor, SensorCategory, SensorType } from './base.js';
import { defineSensor } from './meta.js';

import type { Observable } from '../observable/index.js';
import type { PropertyChangeOf, SensorLike } from './base.js';

/** Optional capabilities for PTZ controls. Add to `capabilities` to enable features. */
export enum PTZCapability {
  /** Camera supports panning (horizontal movement) */
  Pan = 'pan',
  /** Camera supports tilting (vertical movement) */
  Tilt = 'tilt',
  /** Camera supports zoom */
  Zoom = 'zoom',
  /** Camera supports named position presets */
  Presets = 'presets',
  /** Camera supports a home position */
  Home = 'home',
  /** Camera executes relative displacement moves */
  RelativeMove = 'relativeMove',
  /** Camera accepts absolute position writes via `setPosition()` */
  AbsolutePosition = 'absolutePosition',
  /** Camera accepts continuous-move commands via `setVelocity()` */
  VelocityControl = 'velocityControl',
}

/**
 * Properties for PTZ controls
 *
 * @internal
 */
export enum PTZProperty {
  /** Current pan/tilt/zoom position */
  Position = 'position',
  /** Whether the camera is currently moving */
  Moving = 'moving',
  /** List of available preset names */
  Presets = 'presets',
  /** Current movement velocity (continuous move) */
  Velocity = 'velocity',
  /** Target preset to move to */
  TargetPreset = 'targetPreset',
  /** Relative displacement move command (write-only) */
  RelativeMove = 'relativeMove',
  /** Move to the home position (write-only command, carries no state) */
  Home = 'home',
}

/** Absolute PTZ position */
export interface PTZPosition {
  pan: number;
  tilt: number;
  zoom: number;
}

/**
 * PTZ movement speed for continuous move commands.
 *
 * Speeds are in normalized range `[-1, 1]` where:
 * - `-1` = maximum speed in negative direction
 * - `0` = stop movement
 * - `1` = maximum speed in positive direction
 *
 * Conventions: positive `panSpeed` = right, positive `tiltSpeed` = up,
 * positive `zoomSpeed` = zoom in. Plugins should clamp values to `[-1, 1]`
 * and map them to hardware-specific speeds.
 */
export interface PTZDirection {
  panSpeed: number;
  tiltSpeed: number;
  zoomSpeed: number;
}

/**
 * Relative displacement for a single PTZ move.
 *
 * Deltas are normalized to the camera's field of view: `panDelta: 1` moves the
 * view by one full frame width, `tiltDelta: 1` by one full frame height.
 * Conventions match {@link PTZDirection}: positive `panDelta` = right,
 * positive `tiltDelta` = up, positive `zoomDelta` = zoom in. Plugins map the
 * deltas to hardware-specific translation spaces (e.g. ONVIF RelativeMove).
 */
export interface PTZRelativeMove {
  panDelta: number;
  tiltDelta: number;
  zoomDelta: number;
}

/**
 * Property value map for PTZ controls.
 *
 * @internal
 */
export interface PTZControlProperties {
  [PTZProperty.Position]: PTZPosition;
  [PTZProperty.Moving]: boolean;
  [PTZProperty.Presets]: string[];
  [PTZProperty.Velocity]?: PTZDirection;
  [PTZProperty.TargetPreset]?: string;
  [PTZProperty.RelativeMove]?: PTZRelativeMove;
}

/** Read-only proxy interface for a PTZ control */
export interface PTZControlLike extends SensorLike {
  readonly type: SensorType.PTZ;
  readonly onPropertyChanged: Observable<PropertyChangeOf<PTZControlProperties>>;
  readonly onCapabilitiesChanged: Observable<PTZCapability[]>;

  getValue(property: PTZProperty.Position): PTZPosition | undefined;
  getValue(property: PTZProperty.Moving): boolean | undefined;
  getValue(property: PTZProperty.Presets): string[] | undefined;
  getValue(property: PTZProperty.Velocity): PTZDirection | undefined;
  getValue(property: PTZProperty.TargetPreset): string | undefined;
  getValue(property: PTZProperty.RelativeMove): PTZRelativeMove | undefined;
  getValue(property: string): unknown;
}

/**
 * Pan-tilt-zoom camera control. Override `setPosition()` / `setVelocity()` /
 * `setTargetPreset()` to drive hardware, then call the corresponding `super.X()`
 * method after success to sync the SDK state. For hardware-pushed state updates
 * (e.g. PTZ position change events), call the `super` methods from your event
 * handler — that bypasses any plugin override and only syncs state.
 *
 * Set `capabilities` to advertise supported axes and features. Use `setPresets()`
 * to publish the discovered preset list and `setMoving()` to publish movement state.
 */
export class PTZControl<TStorage extends object = Record<string, any>> extends Sensor<PTZControlProperties, TStorage, PTZCapability> {
  readonly type = SensorType.PTZ;
  readonly category = SensorCategory.Control;

  constructor(name = 'PTZ') {
    super(name);

    this._writeState({
      [PTZProperty.Position]: { pan: 0, tilt: 0, zoom: 0 },
      [PTZProperty.Moving]: false,
      [PTZProperty.Presets]: [],
    });
  }

  get position(): PTZPosition {
    return this.props.position;
  }

  get moving(): boolean {
    return this.props.moving;
  }

  get presets(): string[] {
    return this.props.presets;
  }

  get velocity(): PTZDirection | undefined {
    return this.props.velocity;
  }

  get targetPreset(): string | undefined {
    return this.props.targetPreset;
  }

  /**
   * Move to an absolute pan/tilt/zoom position. Override to drive hardware and
   * call `await super.setPosition(value)` after success to sync the SDK state.
   *
   * @param value - Absolute pan/tilt/zoom target position.
   *
   * @example
   * ```ts
   * await ptz.setPosition({ pan: 0.25, tilt: -0.1, zoom: 0.5 });
   * ```
   */
  async setPosition(value: PTZPosition): Promise<void> {
    this._writeState({ [PTZProperty.Position]: value });
  }

  /**
   * Continuous-move command. Override to drive hardware and call
   * `await super.setVelocity(value)` after success to sync the SDK state.
   *
   * @param value - Per-axis speeds in `[-1, 1]`. Stop is zero on every axis.
   * `undefined` is ignored and the published `velocity` keeps its last value.
   *
   * @example
   * ```ts
   * await ptz.setVelocity({ panSpeed: 0.5, tiltSpeed: 0, zoomSpeed: 0 });
   * await ptz.setVelocity({ panSpeed: 0, tiltSpeed: 0, zoomSpeed: 0 }); // stop
   * ```
   */
  async setVelocity(value: PTZDirection | undefined): Promise<void> {
    this._writeState({ [PTZProperty.Velocity]: value });
  }

  /**
   * Relative displacement move. Override to drive hardware (e.g. ONVIF
   * RelativeMove in a translation space) and call
   * `await super.setRelativeMove(value)` after success to sync the SDK state.
   * Advertise {@link PTZCapability.RelativeMove} when the camera supports it.
   *
   * @param value - Per-axis displacement, normalized to the field of view.
   *
   * @example
   * ```ts
   * // move the view a third of a frame to the right, a tenth down
   * await ptz.setRelativeMove({ panDelta: 0.33, tiltDelta: -0.1, zoomDelta: 0 });
   * ```
   */
  async setRelativeMove(value: PTZRelativeMove): Promise<void> {
    this._writeState({ [PTZProperty.RelativeMove]: value });
  }

  /**
   * Preset-move command. Override to drive hardware and call
   * `await super.setTargetPreset(value)` after success to sync the SDK state.
   *
   * @param value - Preset name to move to. `undefined` is ignored and the
   * published `targetPreset` keeps its last value.
   *
   * @example
   * ```ts
   * await ptz.setTargetPreset('Driveway');
   * ```
   */
  async setTargetPreset(value: string | undefined): Promise<void> {
    this._writeState({ [PTZProperty.TargetPreset]: value });
  }

  /**
   * Publish the discovered preset list (typically called once at startup).
   *
   * @param value - List of preset names supported by the camera.
   *
   * @example
   * ```ts
   * ptz.setPresets(['Home', 'Driveway', 'Backyard']);
   * ```
   */
  setPresets(value: string[]): void {
    this._writeState({ [PTZProperty.Presets]: value });
  }

  /**
   * Publish movement state (e.g. when continuous-move starts/stops).
   *
   * @param value - True while the camera is moving.
   *
   * @example
   * ```ts
   * ptz.setMoving(true);
   * ```
   */
  setMoving(value: boolean): void {
    this._writeState({ [PTZProperty.Moving]: value });
  }

  /**
   * Move the camera to the home position (pan=0, tilt=0, zoom=0).
   *
   * @example
   * ```ts
   * await ptz.goHome();
   * ```
   */
  async goHome(): Promise<void> {
    await this.setPosition({ pan: 0, tilt: 0, zoom: 0 });
  }

  /**
   * Cross-process consumer entry point. Dispatches writable properties
   * to semantic methods so plugin overrides (hardware actions) are honored.
   * `moving` and `presets` are observed/discovered state and not externally writable;
   * only `Position`, `Velocity`, `TargetPreset`, `RelativeMove` and `Home` may be set.
   *
   * @param property - Property name to write.
   *
   * @param value - New value for the property.
   *
   * @internal
   */
  async updateValue(property: string, value: unknown): Promise<void> {
    switch (property as PTZProperty) {
      case PTZProperty.Position:
        await this.setPosition(value as PTZPosition);
        return;
      case PTZProperty.Velocity:
        await this.setVelocity(value as PTZDirection | undefined);
        return;
      case PTZProperty.TargetPreset:
        await this.setTargetPreset(value as string | undefined);
        return;
      case PTZProperty.RelativeMove:
        await this.setRelativeMove(value as PTZRelativeMove);
        return;
      case PTZProperty.Home:
        await this.goHome();
        return;
    }
    // Unknown / non-writable property (incl. moving, presets) — ignored.
  }
}

/** Registry metadata for {@link PTZControl}. */
export const ptzMeta = defineSensor({
  type: SensorType.PTZ,
  category: SensorCategory.Control,
  assignmentKey: 'ptz',
  multiProvider: false,
  isDetectionType: false,
  properties: Object.values(PTZProperty),
  semantics: null,
});
