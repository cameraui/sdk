import { Sensor, SensorType, SensorCategory } from './base.js';
import { defineSensor, SensorDomain } from './meta.js';

import type { Observable } from '../observable/index.js';
import type { PropertyChangeOf, SensorLike, SensorOptions } from './base.js';

/** Property names of an access reader. */
export enum AccessProperty {
  /** Result of the attempt in progress, empty between attempts. */
  Result = 'result',
  /** How the last attempt was made. */
  Method = 'method',
  /** Who made the last attempt, empty when unknown. */
  User = 'user',
}

/** Result of an access attempt. */
export enum AccessResult {
  /** Access was granted. */
  Granted = 'granted',
  /** Access was denied. */
  Denied = 'denied',
}

/** How an access attempt was made. */
export enum AccessMethod {
  /** Fingerprint. */
  Fingerprint = 'fingerprint',
  /** NFC card or tag. */
  Nfc = 'nfc',
  /** PIN code. */
  Pin = 'pin',
  /** Face recognition at the device. */
  Face = 'face',
  /** App on a phone. */
  App = 'app',
}

/** Property values of an access reader. */
export interface AccessTriggerProperties {
  [AccessProperty.Result]: AccessResult | '';
  [AccessProperty.Method]: AccessMethod | '';
  [AccessProperty.User]: string;
}

/** Details of an access attempt, as the device reports them. */
export interface AccessAttempt {
  /** How the attempt was made. */
  method?: AccessMethod;
  /** Who made it, when the device knows. */
  user?: string;
}

/** Read-only proxy interface for an access reader. */
export interface AccessTriggerLike extends SensorLike {
  readonly type: SensorType.Access;
  readonly onPropertyChanged: Observable<PropertyChangeOf<AccessTriggerProperties>>;

  getValue(property: AccessProperty.Result): AccessResult | '' | undefined;
  getValue(property: AccessProperty.Method): AccessMethod | '' | undefined;
  getValue(property: AccessProperty.User): string | undefined;
  getValue(property: string): unknown;
}

/** Time a result stays set before the reader is idle again (ms). */
export const ACCESS_AUTO_RESET_MS = 2000;

/**
 * Access reader, such as a fingerprint or NFC reader on a doorbell or a keypad.
 * Call `report()` for each attempt: `result` is set and goes back to empty after
 * {@link ACCESS_AUTO_RESET_MS}, method and user stay until the next attempt.
 */
export class AccessTrigger<TStorage extends object = Record<string, any>> extends Sensor<AccessTriggerProperties, TStorage> {
  readonly type = SensorType.Access;
  readonly category = SensorCategory.Trigger;

  private _resultResetTimer?: ReturnType<typeof setTimeout>;

  constructor(name = 'Access', options?: SensorOptions) {
    super(name, options);

    this._writeState({ [AccessProperty.Result]: '', [AccessProperty.Method]: '', [AccessProperty.User]: '' });
  }

  /** Result of the attempt in progress, empty between attempts. */
  get result(): AccessResult | '' {
    return this.props.result;
  }

  /** How the last attempt was made. */
  get method(): AccessMethod | '' {
    return this.props.method;
  }

  /** Who made the last attempt, empty when unknown. */
  get user(): string {
    return this.props.user;
  }

  /**
   * Report an access attempt. An attempt while the last result is still set
   * counts as a new one.
   *
   * @param result - Whether access was granted.
   *
   * @param attempt - How the attempt was made and by whom.
   *
   * @example
   * ```ts
   * reader.report(AccessResult.Granted, { method: AccessMethod.Fingerprint, user: 'Anna' });
   * ```
   */
  report(result: AccessResult, attempt: AccessAttempt = {}): void {
    if (this._resultResetTimer) clearTimeout(this._resultResetTimer);
    if (this.props.result) this._writeState({ [AccessProperty.Result]: '' });
    this._writeState({ [AccessProperty.Method]: attempt.method ?? '', [AccessProperty.User]: attempt.user ?? '' });
    this._writeState({ [AccessProperty.Result]: result });
    this._resultResetTimer = setTimeout(() => {
      this._resultResetTimer = undefined;
      this._writeState({ [AccessProperty.Result]: '' });
    }, ACCESS_AUTO_RESET_MS);
  }

  /** @internal */
  updateValue(_property: string, _value: unknown): void {}

  override _cleanup(): void {
    if (this._resultResetTimer) {
      clearTimeout(this._resultResetTimer);
      this._resultResetTimer = undefined;
    }
    super._cleanup();
  }
}

/** Registry metadata for {@link AccessTrigger}. */
export const accessMeta = defineSensor({
  type: SensorType.Access,
  category: SensorCategory.Trigger,
  assignmentKey: 'access',
  multiProvider: true,
  isDetectionType: false,
  properties: {
    [AccessProperty.Result]: { type: 'enum', values: { granted: AccessResult.Granted, denied: AccessResult.Denied } },
    [AccessProperty.Method]: {
      type: 'enum',
      values: {
        fingerprint: AccessMethod.Fingerprint,
        nfc: AccessMethod.Nfc,
        pin: AccessMethod.Pin,
        face: AccessMethod.Face,
        app: AccessMethod.App,
      },
    },
    [AccessProperty.User]: { type: 'string' },
  },
  shortcutable: true,
  cascadeTrigger: { property: AccessProperty.Result, values: [AccessResult.Granted], sustained: false },
  semantics: {
    domain: SensorDomain.Event,
    stateProperty: AccessProperty.Result,
    commandProperty: AccessProperty.Result,
  },
});
