import { Sensor, SensorType, SensorCategory } from './base.js';
import { defineSensor, SensorDomain } from './meta.js';

import type { Observable } from '../observable/index.js';
import type { PropertyChangeOf, SensorLike, SensorOptions } from './base.js';

/** Optional capabilities of a light control. */
export enum LightCapability {
  /** Light supports brightness adjustment (0-100). */
  Brightness = 'brightness',
  /** Light supports a white color temperature, in Kelvin. */
  ColorTemperature = 'colorTemperature',
  /** Light supports a color, as hue and saturation. */
  Color = 'color',
}

/** Property names of a light control. */
export enum LightProperty {
  /** Whether the light is on. */
  On = 'on',
  /** Brightness level (0-100). */
  Brightness = 'brightness',
  /** White color temperature in Kelvin. */
  ColorTemperature = 'colorTemperature',
  /** Color as hue and saturation, see {@link LightColor}. */
  Color = 'color',
  /** Whether the light shows its color temperature or its color, see {@link LightColorMode}. */
  ColorMode = 'colorMode',
}

/** Which of its two color settings a light shows. */
export enum LightColorMode {
  /** The white color temperature. */
  Temperature = 'temperature',
  /** The color from hue and saturation. */
  Color = 'color',
}

/** Color of a light. */
export interface LightColor {
  /** Hue in degrees (0-360). */
  hue: number;
  /** Saturation in percent (0-100). */
  saturation: number;
}

/** Property values of a light control. */
export interface LightControlProperties {
  [LightProperty.On]: boolean;
  [LightProperty.Brightness]: number;
  [LightProperty.ColorTemperature]: number;
  [LightProperty.Color]: LightColor;
  [LightProperty.ColorMode]: LightColorMode;
}

/** Read-only proxy interface for a light control. */
export interface LightControlLike extends SensorLike {
  readonly type: SensorType.Light;
  readonly onPropertyChanged: Observable<PropertyChangeOf<LightControlProperties>>;
  readonly onCapabilitiesChanged: Observable<LightCapability[]>;

  getValue(property: LightProperty.On): boolean | undefined;
  getValue(property: LightProperty.Brightness): number | undefined;
  getValue(property: LightProperty.ColorTemperature): number | undefined;
  getValue(property: LightProperty.Color): LightColor | undefined;
  getValue(property: LightProperty.ColorMode): LightColorMode | undefined;
  getValue(property: string): unknown;
}

/**
 * Light control sensor. Override `setOn()`/`setOff()` to drive your hardware,
 * then `await super.setOn()` / `await super.setOff()` to sync the SDK state.
 *
 * Plugins with no hardware-action use case can leave the methods unoverridden,
 * the base implementation just updates the state.
 *
 * For hardware-pushed updates (someone manually flipped the switch), call
 * `super.setOn()` / `super.setOff()` from your event handler. That bypasses any
 * plugin override and only syncs state.
 *
 * A light with {@link LightCapability.ColorTemperature} or
 * {@link LightCapability.Color} overrides `setColorTemperature()` and
 * `setColor()` the same way. A command switches the color mode to the setting
 * it changed. When the device reports its state, sync both settings and call
 * `setColorMode()` with the one it shows.
 */
export class LightControl<TStorage extends object = Record<string, any>> extends Sensor<LightControlProperties, TStorage, LightCapability> {
  readonly type = SensorType.Light;
  readonly category = SensorCategory.Control;

  constructor(name = 'Light', options?: SensorOptions) {
    super(name, options);

    this._writeState({
      [LightProperty.On]: false,
      [LightProperty.Brightness]: 100,
      [LightProperty.ColorTemperature]: 2700,
      [LightProperty.Color]: { hue: 0, saturation: 0 },
      [LightProperty.ColorMode]: LightColorMode.Temperature,
    });
  }

  /** Whether the light is on. */
  get on(): boolean {
    return this.props.on;
  }

  /** Brightness level (0-100). */
  get brightness(): number {
    return this.props.brightness;
  }

  /** White color temperature in Kelvin. */
  get colorTemperature(): number {
    return this.props.colorTemperature;
  }

  /** Color as hue and saturation. */
  get color(): LightColor {
    return this.props.color;
  }

  /** Whether the light shows its color temperature or its color. */
  get colorMode(): LightColorMode {
    return this.props.colorMode;
  }

  /**
   * Turn the light on. Override to drive hardware and call `await super.setOn()`
   * after the hardware call succeeds to sync the SDK state.
   *
   * @example
   * ```ts
   * await light.setOn();
   * ```
   */
  async setOn(): Promise<void> {
    this._writeState({ [LightProperty.On]: true });
  }

  /**
   * Turn the light off. Override to drive hardware and call `await super.setOff()`
   * after the hardware call succeeds to sync the SDK state.
   *
   * @example
   * ```ts
   * await light.setOff();
   * ```
   */
  async setOff(): Promise<void> {
    this._writeState({ [LightProperty.On]: false });
  }

  /**
   * Set brightness. Override to drive hardware and call `await super.setBrightness(value)`
   * after the hardware call succeeds. The default implementation clamps the value to [0, 100].
   *
   * @param value - Brightness level in the range 0-100.
   *
   * @example
   * ```ts
   * await light.setBrightness(75);
   * ```
   */
  async setBrightness(value: number): Promise<void> {
    this._writeState({ [LightProperty.Brightness]: Math.max(0, Math.min(100, value)) });
  }

  /**
   * Set the white color temperature. Override to drive hardware and call
   * `await super.setColorTemperature(kelvin)` after the hardware call succeeds.
   * The default implementation rounds the value and clamps it to 1000-10000 K.
   *
   * @param kelvin - Color temperature in Kelvin.
   *
   * @example
   * ```ts
   * await light.setColorTemperature(2700);
   * ```
   */
  async setColorTemperature(kelvin: number): Promise<void> {
    this._writeState({ [LightProperty.ColorTemperature]: Math.round(Math.max(1000, Math.min(10000, kelvin))) });
  }

  /**
   * Set the color. Override to drive hardware and call
   * `await super.setColor(hue, saturation)` after the hardware call succeeds.
   * The default implementation clamps hue to 0-360 and saturation to 0-100.
   *
   * @param hue - Hue in degrees (0-360).
   *
   * @param saturation - Saturation in percent (0-100).
   *
   * @example
   * ```ts
   * await light.setColor(240, 100);
   * ```
   */
  async setColor(hue: number, saturation: number): Promise<void> {
    this._writeState({
      [LightProperty.Color]: { hue: Math.max(0, Math.min(360, hue)), saturation: Math.max(0, Math.min(100, saturation)) },
    });
  }

  /**
   * Report which of its two color settings the light shows.
   *
   * @param mode - The color temperature or the color.
   *
   * @example
   * ```ts
   * light.setColorMode(LightColorMode.Color);
   * ```
   */
  setColorMode(mode: LightColorMode): void {
    this._writeState({ [LightProperty.ColorMode]: mode });
  }

  /** @internal */
  async updateValue(property: string, value: unknown): Promise<void> {
    switch (property as LightProperty) {
      case LightProperty.On:
        if (value) await this.setOn();
        else await this.setOff();
        return;
      case LightProperty.Brightness:
        await this.setBrightness(value as number);
        return;
      case LightProperty.ColorTemperature:
        await this.setColorTemperature(value as number);
        this.setColorMode(LightColorMode.Temperature);
        return;
      case LightProperty.Color: {
        const { hue, saturation } = value as LightColor;
        await this.setColor(hue, saturation);
        this.setColorMode(LightColorMode.Color);
        return;
      }
    }
  }
}

/** Registry metadata for {@link LightControl}. */
export const lightMeta = defineSensor({
  type: SensorType.Light,
  category: SensorCategory.Control,
  assignmentKey: 'light',
  multiProvider: true,
  isDetectionType: false,
  properties: {
    [LightProperty.On]: { type: 'boolean', writable: true },
    [LightProperty.Brightness]: { type: 'number', min: 0, max: 100, unit: '%', writable: true },
    [LightProperty.ColorTemperature]: { type: 'number', min: 1000, max: 10000, unit: 'K', writable: true },
    [LightProperty.Color]: { type: 'object', keys: ['hue', 'saturation'], writable: true },
    [LightProperty.ColorMode]: { type: 'enum', values: { temperature: LightColorMode.Temperature, color: LightColorMode.Color } },
  },
  shortcutable: true,
  cascadeTrigger: { property: LightProperty.On, values: [true], sustained: true },
  propertyCapabilities: {
    [LightProperty.Brightness]: LightCapability.Brightness,
    [LightProperty.ColorTemperature]: LightCapability.ColorTemperature,
    [LightProperty.Color]: LightCapability.Color,
    [LightProperty.ColorMode]: LightCapability.Color,
  },
  virtual: {
    properties: { [LightProperty.On]: false, [LightProperty.Brightness]: 100 },
    capabilities: [LightCapability.Brightness],
  },
  semantics: {
    domain: SensorDomain.Light,
    stateProperty: LightProperty.On,
    commandProperty: LightProperty.On,
    brightness: { property: LightProperty.Brightness, scale: 100 },
    color: { temperature: LightProperty.ColorTemperature, hueSaturation: LightProperty.Color, mode: LightProperty.ColorMode },
  },
});
