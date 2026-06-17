import { Sensor, SensorType, SensorCategory } from './base.js';

import type { Observable } from '../observable/index.js';
import type { PropertyChangeOf, SensorLike } from './base.js';

/** Optional capabilities for battery info sensors */
export enum BatteryCapability {
  /** Sensor reports low-battery alerts */
  LowBattery = 'lowBattery',
  /** Sensor reports charging state */
  Charging = 'charging',
}

/**
 * Properties for battery info sensors
 *
 * @internal
 */
export enum BatteryProperty {
  /** Battery level percentage (0–100) */
  Level = 'level',
  /** Current charging state */
  Charging = 'charging',
  /** Whether battery is critically low */
  Low = 'low',
}

/** Battery charging state */
export enum ChargingState {
  /** Device has no rechargeable battery */
  NotChargeable = 'NOT_CHARGEABLE',
  /** Battery is not charging */
  NotCharging = 'NOT_CHARGING',
  /** Battery is currently charging */
  Charging = 'CHARGING',
  /** Battery is fully charged */
  Full = 'FULL',
}

/**
 * Property value map for battery info sensors.
 *
 * @internal
 */
export interface BatteryInfoProperties {
  [BatteryProperty.Level]: number;
  [BatteryProperty.Charging]: ChargingState;
  [BatteryProperty.Low]: boolean;
}

/** Read-only proxy interface for a battery info sensor */
export interface BatteryInfoLike extends SensorLike {
  readonly type: SensorType.Battery;
  readonly onPropertyChanged: Observable<PropertyChangeOf<BatteryInfoProperties>>;
  readonly onCapabilitiesChanged: Observable<BatteryCapability[]>;

  getValue(property: BatteryProperty.Level): number | undefined;
  getValue(property: BatteryProperty.Charging): ChargingState | undefined;
  getValue(property: BatteryProperty.Low): boolean | undefined;
  getValue(property: string): unknown;
}

/**
 * Battery info sensor. Reports battery level, charging state, and low-battery alerts.
 *
 * Plugin authors call `setLevel(value)`, `setCharging(state)`, and `setLow(value)`
 * to push updates from the device.
 */
// prettier-ignore

export class BatteryInfo<TStorage extends object = Record<string, any>> extends Sensor<BatteryInfoProperties, TStorage, BatteryCapability> {
  readonly type = SensorType.Battery;
  readonly category = SensorCategory.Info;

  constructor(name = 'Battery') {
    super(name);

    this._writeState({
      [BatteryProperty.Level]: 100,
      [BatteryProperty.Charging]: ChargingState.NotCharging,
      [BatteryProperty.Low]: false,
    });
  }

  get level(): number {
    return this.props.level;
  }

  get charging(): ChargingState {
    return this.props.charging;
  }

  get low(): boolean {
    return this.props.low;
  }

  /**
   * Report a new battery level (percentage). Clamped to [0, 100].
   *
   * @param value - Battery level percentage in the range 0–100.
   *
   * @example
   * ```ts
   * battery.setLevel(87);
   * ```
   */
  setLevel(value: number): void {
    this._writeState({ [BatteryProperty.Level]: Math.max(0, Math.min(100, value)) });
  }

  /**
   * Report the current charging state.
   *
   * @param value - Current charging state from the {@link ChargingState} enum.
   *
   * @example
   * ```ts
   * import { ChargingState } from '@camera.ui/sdk';
   * battery.setCharging(ChargingState.Charging);
   * ```
   */
  setCharging(value: ChargingState): void {
    this._writeState({ [BatteryProperty.Charging]: value });
  }

  /**
   * Report whether the battery is critically low.
   *
   * @param value - True when the battery has crossed the low-battery threshold.
   *
   * @example
   * ```ts
   * battery.setLow(true);
   * ```
   */
  setLow(value: boolean): void {
    this._writeState({ [BatteryProperty.Low]: value });
  }

  /**
   * Read-only sensor: external writes are ignored. State is reported via `setLevel`/`setCharging`/`setLow`.
   *
   * Called by the cross-process plugin host when a generic property write is received.
   * Battery sensors have no externally writable properties, so the parameters are
   * unused (underscore-prefixed) and the call is a no-op.
   *
   * @param _property - Unused — battery sensors expose no writable properties.
   *
   * @param _value - Unused — battery sensors expose no writable properties.
   *
   * @internal
   */
  updateValue(_property: string, _value: unknown): void {
    // No-op — battery state is reported by the plugin, not set externally.
  }
}
