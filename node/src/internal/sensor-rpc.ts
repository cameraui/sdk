import type { SensorCategory, SensorPropertyType, SensorType } from '../sensor/base.js';
import type { ModelSpec } from '../sensor/spec.js';

/** Emitted when a sensor property value changes. */
export interface PropertyChangedEvent {
  /** Sensor that changed. */
  sensorId: string;
  /** Type of the sensor that changed. */
  sensorType: SensorType;
  /** Property key that changed. */
  property: SensorPropertyType;
  /** New value. */
  value: unknown;
  /** Value before the change, absent on the first write. */
  previousValue?: unknown;
  /** Change time in epoch milliseconds. */
  timestamp: number;
}

/**
 * Receives a partial-state delta, one call per `_writeState`.
 *
 * @internal
 */
export type PropertyUpdateFn = (properties: Record<string, unknown>) => void;

/**
 * Receives the full capability list whenever it changes.
 *
 * @internal
 */
export type CapabilityUpdateFn = (capabilities: string[]) => void;

/** JSON-serializable representation of a sensor for RPC transport. */
export interface SensorJSON {
  /** Sensor ID. */
  id: string;
  /** Sensor type. */
  type: SensorType;
  /** Internal name. */
  name: string;
  /** Name shown in the UI. */
  displayName: string;
  /** Category the sensor belongs to. */
  category: SensorCategory;
  /** Device ID assigned by the plugin. */
  nativeId?: string;
  /** Plugin that owns the sensor. */
  pluginId?: string;
  /** Current property values. */
  properties: Record<string, unknown>;
  /** Capability keys the sensor reports. */
  capabilities?: string[];
  /** Sensor needs a frame feed to work. */
  requiresFrames?: boolean;
  /** Model the sensor runs, for ML-backed sensors. */
  modelSpec?: ModelSpec;
}
