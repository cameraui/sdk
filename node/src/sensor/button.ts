import { Sensor, SensorType, SensorCategory } from './base.js';
import { defineSensor, SensorDomain } from './meta.js';

import type { Observable } from '../observable/index.js';
import type { PropertyChangeOf, SensorLike, SensorOptions } from './base.js';

/** Property names of a button. */
export enum ButtonProperty {
  /** Kind of the press in progress, empty between presses. */
  Press = 'press',
  /** Position of the button on its device, from 1. 0 leaves the order to the creation order. */
  Index = 'index',
}

/** How a button was pressed. */
export enum ButtonPress {
  /** One short press. */
  Single = 'single',
  /** Two short presses in a row. */
  Double = 'double',
  /** A press held down. */
  Long = 'long',
}

/** Property values of a button. */
export interface ButtonTriggerProperties {
  [ButtonProperty.Press]: ButtonPress | '';
  [ButtonProperty.Index]: number;
}

/** Options of a button, on top of the common sensor options. */
export interface ButtonOptions extends SensorOptions {
  /** Position of the button on its device, from 1, e.g. for HomeKit's button order. */
  index?: number;
  /** Kinds of press the button reports besides a single press. */
  presses?: ButtonPress[];
}

/** Read-only proxy interface for a button. */
export interface ButtonTriggerLike extends SensorLike {
  readonly type: SensorType.Button;
  readonly onPropertyChanged: Observable<PropertyChangeOf<ButtonTriggerProperties>>;

  getValue(property: ButtonProperty.Press): ButtonPress | '' | undefined;
  getValue(property: ButtonProperty.Index): number | undefined;
  getValue(property: string): unknown;
}

/** Time a press stays set before the button is idle again (ms). */
export const PRESS_AUTO_RESET_MS = 2000;

/**
 * A physical button, such as one on a remote or a wall switch. Call `press()`
 * when the device reports a press: `press` is set to its kind and goes back to
 * empty after {@link PRESS_AUTO_RESET_MS}. A single press is always offered,
 * double and long presses only when passed as `presses`.
 */
export class ButtonTrigger<TStorage extends object = Record<string, any>> extends Sensor<ButtonTriggerProperties, TStorage> {
  readonly type = SensorType.Button;
  readonly category = SensorCategory.Trigger;

  private readonly _presses: ReadonlySet<ButtonPress>;
  private _pressResetTimer?: ReturnType<typeof setTimeout>;

  constructor(name = 'Button', options?: ButtonOptions) {
    super(name, options);

    this._presses = new Set([ButtonPress.Single, ...(options?.presses ?? [])]);
    this.setPropertySpec(ButtonProperty.Press, { values: [...this._presses] });
    this._writeState({ [ButtonProperty.Press]: '', [ButtonProperty.Index]: options?.index ?? 0 });
  }

  /** Kind of the press in progress, empty between presses. */
  get pressed(): ButtonPress | '' {
    return this.props.press;
  }

  /** Position of the button on its device, 0 when not set. */
  get index(): number {
    return this.props.index;
  }

  /**
   * Report a press. A press while the last one is still set counts as a new one.
   *
   * @param kind - How the button was pressed, a single press by default.
   *
   * @throws {Error} When the button does not offer this kind of press.
   *
   * @example
   * ```ts
   * button.press(ButtonPress.Double);
   * ```
   */
  press(kind: ButtonPress = ButtonPress.Single): void {
    if (!this._presses.has(kind)) throw new Error(`Button "${this.name}" does not offer a ${kind} press`);

    if (this._pressResetTimer) clearTimeout(this._pressResetTimer);
    if (this.props.press) this._writeState({ [ButtonProperty.Press]: '' });
    this._writeState({ [ButtonProperty.Press]: kind });
    this._pressResetTimer = setTimeout(() => {
      this._pressResetTimer = undefined;
      this._writeState({ [ButtonProperty.Press]: '' });
    }, PRESS_AUTO_RESET_MS);
  }

  /** @internal */
  updateValue(_property: string, _value: unknown): void {}

  override _cleanup(): void {
    if (this._pressResetTimer) {
      clearTimeout(this._pressResetTimer);
      this._pressResetTimer = undefined;
    }
    super._cleanup();
  }
}

/** Registry metadata for {@link ButtonTrigger}. */
export const buttonMeta = defineSensor({
  type: SensorType.Button,
  category: SensorCategory.Trigger,
  assignmentKey: 'button',
  multiProvider: true,
  isDetectionType: false,
  properties: {
    [ButtonProperty.Press]: {
      type: 'enum',
      values: { single: ButtonPress.Single, double: ButtonPress.Double, long: ButtonPress.Long },
    },
    [ButtonProperty.Index]: { type: 'number', min: 0, step: 1, internal: true },
  },
  shortcutable: true,
  cascadeTrigger: { property: ButtonProperty.Press, values: Object.values(ButtonPress), sustained: false },
  semantics: {
    domain: SensorDomain.Event,
    stateProperty: ButtonProperty.Press,
    commandProperty: ButtonProperty.Press,
    deviceClass: 'button',
  },
});
