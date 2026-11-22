import { Sensor, SensorType, SensorCategory } from './base.js';
import { defineSensor, SensorDomain } from './meta.js';

import type { Observable } from '../observable/index.js';
import type { PropertyChangeOf, SensorLike, SensorOptions } from './base.js';

/** Optional capabilities of a display. */
export enum DisplayCapability {
  /** Display offers preset messages, listed as choices of {@link DisplayProperty.Preset}. */
  Presets = 'presets',
  /** Display shows a message for a set time. */
  Duration = 'duration',
}

/** Property names of a display. */
export enum DisplayProperty {
  /** Text on the display, empty when none is shown. */
  Message = 'message',
  /** Preset message on the display, empty when none is shown. */
  Preset = 'preset',
  /** Seconds a new message stays on the display, 0 until it is cleared. */
  Duration = 'duration',
}

/** Property values of a display. */
export interface DisplayControlProperties {
  [DisplayProperty.Message]: string;
  [DisplayProperty.Preset]: string;
  [DisplayProperty.Duration]: number;
}

/** Read-only proxy interface for a display. */
export interface DisplayControlLike extends SensorLike {
  readonly type: SensorType.Display;
  readonly onPropertyChanged: Observable<PropertyChangeOf<DisplayControlProperties>>;
  readonly onCapabilitiesChanged: Observable<DisplayCapability[]>;

  getValue(property: DisplayProperty.Message | DisplayProperty.Preset): string | undefined;
  getValue(property: DisplayProperty.Duration): number | undefined;
  getValue(property: string): unknown;
}

/**
 * Text display on a device, such as the screen of a doorbell. Set the longest
 * text with `setPropertySpec(DisplayProperty.Message, { maxLength })` and the
 * presets with `setPropertySpec(DisplayProperty.Preset, { choices })`. Override
 * `setMessage()` and `setPreset()` to drive the hardware and call the `super`
 * method after success.
 */
export class DisplayControl<TStorage extends object = Record<string, any>> extends Sensor<DisplayControlProperties, TStorage, DisplayCapability> {
  readonly type = SensorType.Display;
  readonly category = SensorCategory.Control;

  constructor(name = 'Display', options?: SensorOptions) {
    super(name, options);

    this._writeState({ [DisplayProperty.Message]: '', [DisplayProperty.Preset]: '', [DisplayProperty.Duration]: 0 });
  }

  /** Text on the display, empty when none is shown. */
  get message(): string {
    return this.props.message;
  }

  /** Preset message on the display, empty when none is shown. */
  get preset(): string {
    return this.props.preset;
  }

  /** Seconds a new message stays on the display, 0 until it is cleared. */
  get duration(): number {
    return this.props.duration;
  }

  /**
   * Show a text, an empty one clears the display. Override to drive hardware and
   * call `await super.setMessage(value)` after success.
   *
   * @param value - The text to show.
   *
   * @example
   * ```ts
   * await display.setMessage('Back in 5 minutes');
   * ```
   */
  async setMessage(value: string): Promise<void> {
    this._writeState({ [DisplayProperty.Message]: value, [DisplayProperty.Preset]: '' });
  }

  /**
   * Show a preset message, an empty one clears the display. Override to drive
   * hardware and call `await super.setPreset(value)` after success.
   *
   * @param value - One of the presets offered as choices.
   *
   * @example
   * ```ts
   * await display.setPreset('LEAVE_PACKAGE_AT_DOOR');
   * ```
   */
  async setPreset(value: string): Promise<void> {
    this._writeState({ [DisplayProperty.Preset]: value, [DisplayProperty.Message]: '' });
  }

  /**
   * Set how long a new message stays on the display. Override to drive hardware
   * and call `await super.setDuration(value)` after success.
   *
   * @param value - Seconds, 0 keeps the message until it is cleared.
   *
   * @example
   * ```ts
   * await display.setDuration(60);
   * ```
   */
  async setDuration(value: number): Promise<void> {
    this._writeState({ [DisplayProperty.Duration]: Math.max(0, Math.round(value)) });
  }

  /** @internal */
  override async updateValue(property: string, value: unknown): Promise<void> {
    switch (property as DisplayProperty) {
      case DisplayProperty.Message:
        await this.setMessage(typeof value === 'string' ? value : '');
        return;
      case DisplayProperty.Preset:
        await this.setPreset(typeof value === 'string' ? value : '');
        return;
      case DisplayProperty.Duration:
        await this.setDuration(value as number);
        return;
    }
  }
}

/** Registry metadata for {@link DisplayControl}. */
export const displayMeta = defineSensor({
  type: SensorType.Display,
  category: SensorCategory.Control,
  assignmentKey: 'display',
  multiProvider: true,
  isDetectionType: false,
  properties: {
    [DisplayProperty.Message]: { type: 'string', writable: true },
    [DisplayProperty.Preset]: { type: 'string', writable: true },
    [DisplayProperty.Duration]: { type: 'number', min: 0, step: 1, unit: 's', writable: true },
  },
  propertyCapabilities: { [DisplayProperty.Preset]: DisplayCapability.Presets, [DisplayProperty.Duration]: DisplayCapability.Duration },
  semantics: {
    domain: SensorDomain.Text,
    stateProperty: DisplayProperty.Message,
    commandProperty: DisplayProperty.Message,
    configuration: [DisplayProperty.Preset],
  },
});
