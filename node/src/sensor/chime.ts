import { Sensor, SensorType, SensorCategory } from './base.js';
import { defineSensor, SensorDomain } from './meta.js';

import type { Observable } from '../observable/index.js';
import type { PropertyChangeOf, SensorLike, SensorOptions } from './base.js';

/** Optional capabilities of a chime. */
export enum ChimeCapability {
  /** Chime supports volume adjustment (0-100). */
  Volume = 'volume',
  /** Chime can play its tone several times in a row. */
  Repeat = 'repeat',
}

/** Property names of a chime. */
export enum ChimeProperty {
  /** Whether the chime is playing. */
  Active = 'active',
  /** Tone the chime plays, one of the tones the device offers. */
  Tone = 'tone',
  /** Volume level (0-100). */
  Volume = 'volume',
  /** How often the tone plays (1-10). */
  Repeat = 'repeat',
}

/** Property values of a chime. */
export interface ChimeControlProperties {
  [ChimeProperty.Active]: boolean;
  [ChimeProperty.Tone]: string;
  [ChimeProperty.Volume]: number;
  [ChimeProperty.Repeat]: number;
}

/** Read-only proxy interface for a chime. */
export interface ChimeControlLike extends SensorLike {
  readonly type: SensorType.Chime;
  readonly onPropertyChanged: Observable<PropertyChangeOf<ChimeControlProperties>>;
  readonly onCapabilitiesChanged: Observable<ChimeCapability[]>;

  getValue(property: ChimeProperty.Active): boolean | undefined;
  getValue(property: ChimeProperty.Tone): string | undefined;
  getValue(property: ChimeProperty.Volume | ChimeProperty.Repeat): number | undefined;
  getValue(property: string): unknown;
}

/** Time after which a chime counts as done when the plugin does not report the end (ms). */
export const CHIME_AUTO_RESET_MS = 10_000;

/**
 * Chime control, such as a door chime or a speaker that plays ringtones. Offer
 * the device's tones with `setPropertySpec(ChimeProperty.Tone, { choices })`.
 * Override `play()` to drive the hardware and `await super.play()` after it,
 * call `super.stop()` when the device reports the end. Without that the chime
 * counts as done after {@link CHIME_AUTO_RESET_MS}.
 */
export class ChimeControl<TStorage extends object = Record<string, any>> extends Sensor<ChimeControlProperties, TStorage, ChimeCapability> {
  readonly type = SensorType.Chime;
  readonly category = SensorCategory.Control;

  private _playResetTimer?: ReturnType<typeof setTimeout>;

  constructor(name = 'Chime', options?: SensorOptions) {
    super(name, options);

    this._writeState({
      [ChimeProperty.Active]: false,
      [ChimeProperty.Tone]: '',
      [ChimeProperty.Volume]: 100,
      [ChimeProperty.Repeat]: 1,
    });
  }

  /** Whether the chime is playing. */
  get active(): boolean {
    return this.props.active;
  }

  /** Tone the chime plays. */
  get tone(): string {
    return this.props.tone;
  }

  /** Volume level (0-100). */
  get volume(): number {
    return this.props.volume;
  }

  /** How often the tone plays. */
  get repeat(): number {
    return this.props.repeat;
  }

  /**
   * Play the tone. Override to drive hardware and call `await super.play()`
   * after success to sync the SDK state.
   *
   * @example
   * ```ts
   * await chime.play();
   * ```
   */
  async play(): Promise<void> {
    if (this._playResetTimer) clearTimeout(this._playResetTimer);
    this._writeState({ [ChimeProperty.Active]: true });
    this._playResetTimer = setTimeout(() => {
      this._playResetTimer = undefined;
      this._writeState({ [ChimeProperty.Active]: false });
    }, CHIME_AUTO_RESET_MS);
  }

  /**
   * Stop playing. Override to drive hardware and call `await super.stop()`
   * after success, or call it when the device reports the end.
   *
   * @example
   * ```ts
   * await chime.stop();
   * ```
   */
  async stop(): Promise<void> {
    if (this._playResetTimer) {
      clearTimeout(this._playResetTimer);
      this._playResetTimer = undefined;
    }
    this._writeState({ [ChimeProperty.Active]: false });
  }

  /**
   * Choose the tone. Override to drive hardware and call `await super.setTone(value)`
   * after success.
   *
   * @param value - One of the tones offered as choices.
   *
   * @example
   * ```ts
   * await chime.setTone('ding-dong');
   * ```
   */
  async setTone(value: string): Promise<void> {
    this._writeState({ [ChimeProperty.Tone]: value });
  }

  /**
   * Set volume. Override to drive hardware and call `await super.setVolume(value)`
   * after success. The default implementation clamps the value to [0, 100].
   *
   * @param value - Volume level in the range 0-100.
   *
   * @example
   * ```ts
   * await chime.setVolume(60);
   * ```
   */
  async setVolume(value: number): Promise<void> {
    this._writeState({ [ChimeProperty.Volume]: Math.max(0, Math.min(100, value)) });
  }

  /**
   * Set how often the tone plays. Override to drive hardware and call
   * `await super.setRepeat(value)` after success. Clamped to [1, 10].
   *
   * @param value - Number of plays in the range 1-10.
   *
   * @example
   * ```ts
   * await chime.setRepeat(2);
   * ```
   */
  async setRepeat(value: number): Promise<void> {
    this._writeState({ [ChimeProperty.Repeat]: Math.max(1, Math.min(10, Math.round(value))) });
  }

  /** @internal */
  override async updateValue(property: string, value: unknown): Promise<void> {
    switch (property as ChimeProperty) {
      case ChimeProperty.Active:
        if (value) await this.play();
        else await this.stop();
        return;
      case ChimeProperty.Tone:
        await this.setTone(typeof value === 'string' ? value : '');
        return;
      case ChimeProperty.Volume:
        await this.setVolume(value as number);
        return;
      case ChimeProperty.Repeat:
        await this.setRepeat(value as number);
        return;
    }
  }

  override _cleanup(): void {
    if (this._playResetTimer) {
      clearTimeout(this._playResetTimer);
      this._playResetTimer = undefined;
    }
    super._cleanup();
  }
}

/** Registry metadata for {@link ChimeControl}. */
export const chimeMeta = defineSensor({
  type: SensorType.Chime,
  category: SensorCategory.Control,
  assignmentKey: 'chime',
  multiProvider: true,
  isDetectionType: false,
  properties: {
    [ChimeProperty.Active]: { type: 'boolean', writable: true },
    [ChimeProperty.Tone]: { type: 'string', writable: true },
    [ChimeProperty.Volume]: { type: 'number', min: 0, max: 100, unit: '%', writable: true },
    [ChimeProperty.Repeat]: { type: 'number', min: 1, max: 10, step: 1, writable: true },
  },
  shortcutable: true,
  cascadeTrigger: { property: ChimeProperty.Active, values: [true], sustained: true },
  propertyCapabilities: { [ChimeProperty.Volume]: ChimeCapability.Volume, [ChimeProperty.Repeat]: ChimeCapability.Repeat },
  semantics: {
    domain: SensorDomain.Siren,
    stateProperty: ChimeProperty.Active,
    commandProperty: ChimeProperty.Active,
    icon: 'mdi:bell-ring',
    tone: { property: ChimeProperty.Tone },
    volume: { property: ChimeProperty.Volume, scale: 100 },
    configuration: [ChimeProperty.Tone, ChimeProperty.Volume],
  },
});
