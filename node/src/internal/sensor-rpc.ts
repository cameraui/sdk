import type { SensorCategory, SensorPropertyType, SensorSourceState, SensorType } from '../sensor/base.js';
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
  /** Not sent by the server, keep the last value yourself if you need it. */
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

export interface SensorSourcePatch {
  sourceState?: SensorSourceState;
  address?: string;
}

export type SourceUpdateFn = (patch: SensorSourcePatch) => void;

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
  /** Source system the sensor was imported from, e.g. `'homeassistant'`. */
  origin?: string;
  /** Model the sensor runs, for ML-backed sensors. */
  modelSpec?: ModelSpec;
  /** The plugin's view of the source behind an adopted sensor. */
  sourceState?: SensorSourceState;
  /** Current address at the source, e.g. a Home Assistant entity id. */
  address?: string;
}
