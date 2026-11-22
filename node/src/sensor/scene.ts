import { Sensor, SensorCategory, SensorType } from './base.js';
import { defineSensor, SensorDomain } from './meta.js';

import type { Observable } from '../observable/index.js';
import type { PropertyChangeOf, SensorLike, SensorOptions } from './base.js';

/** Property names of a scene. */
export enum SceneProperty {
  /** `true` for a moment while the scene runs, a command when written `true`. */
  Active = 'active',
}

/** Property values of a scene. */
export interface SceneControlProperties {
  [SceneProperty.Active]: boolean;
}

/** Read-only proxy interface for a scene. */
export interface SceneControlLike extends SensorLike {
  readonly type: SensorType.Scene;
  readonly onPropertyChanged: Observable<PropertyChangeOf<SceneControlProperties>>;

  getValue(property: SceneProperty.Active): boolean | undefined;
  getValue(property: string): unknown;
}

/** How long `active` reads `true` after a scene ran, in milliseconds. */
export const SCENE_AUTO_RESET_MS = 1000;

/**
 * A scene or script that runs on command and has no state of its own.
 * Override `activate()` to run it on the device and call `await super.activate()`
 * after success, which sets `active` for a moment ({@link SCENE_AUTO_RESET_MS}).
 *
 * @example
 * ```ts
 * class GoodNight extends SceneControl {
 *   constructor() {
 *     super('Good night');
 *   }
 *
 *   override async activate(): Promise<void> {
 *     await hub.runScene('good-night');
 *     await super.activate();
 *   }
 * }
 * ```
 */
export class SceneControl<TStorage extends object = Record<string, any>> extends Sensor<SceneControlProperties, TStorage> {
  readonly type = SensorType.Scene;
  readonly category = SensorCategory.Control;

  private _activeResetTimer?: ReturnType<typeof setTimeout>;

  constructor(name = 'Scene', options?: SensorOptions) {
    super(name, options);

    this._writeState({ [SceneProperty.Active]: false });
  }

  /** `true` for a moment after the scene ran. */
  get active(): boolean {
    return this.props.active;
  }

  /**
   * Run the scene. Override to drive hardware and call `await super.activate()`
   * after success. The `active` property reads `true` for a moment and then
   * `false` again, so the next command arrives the same way.
   *
   * @example
   * ```ts
   * await scene.activate();
   * ```
   */
  async activate(): Promise<void> {
    if (this._activeResetTimer) clearTimeout(this._activeResetTimer);
    this._writeState({ [SceneProperty.Active]: true });
    this._activeResetTimer = setTimeout(() => {
      this._activeResetTimer = undefined;
      this._writeState({ [SceneProperty.Active]: false });
    }, SCENE_AUTO_RESET_MS);
  }

  /** @internal */
  async updateValue(property: string, value: unknown): Promise<void> {
    if ((property as SceneProperty) === SceneProperty.Active && value) await this.activate();
  }

  override _cleanup(): void {
    if (this._activeResetTimer) {
      clearTimeout(this._activeResetTimer);
      this._activeResetTimer = undefined;
    }
    super._cleanup();
  }
}

/** Registry metadata for {@link SceneControl}. */
export const sceneMeta = defineSensor({
  type: SensorType.Scene,
  category: SensorCategory.Control,
  assignmentKey: 'scene',
  multiProvider: true,
  isDetectionType: false,
  properties: {
    [SceneProperty.Active]: { type: 'boolean', writable: true },
  },
  shortcutable: true,
  virtual: { properties: { [SceneProperty.Active]: false } },
  semantics: {
    domain: SensorDomain.Scene,
    stateProperty: SceneProperty.Active,
    commandProperty: SceneProperty.Active,
  },
});
