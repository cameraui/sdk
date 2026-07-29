import type { SensorCategory, SensorPropertyType, SensorType } from '../sensor/base.js';
import type { ModelSpec } from '../sensor/spec.js';

/** Emitted when a sensor property value changes */
export interface PropertyChangedEvent {
  sensorId: string;
  sensorType: SensorType;
  property: SensorPropertyType;
  value: unknown;
  previousValue?: unknown;
  timestamp: number;
}

/**
 * Receives a partial-state delta (only properties that actually changed). One callback
 * invocation per `_writeState` call — atomic from the receiver's perspective.
 *
 * @internal
 */
export type PropertyUpdateFn = (properties: Record<string, unknown>) => void;

/**
 * @internal
 */
export type CapabilityUpdateFn = (capabilities: string[]) => void;

/** JSON-serializable representation of a sensor for RPC transport */
export interface SensorJSON {
  id: string;
  type: SensorType;
  name: string;
  displayName: string;
  category: SensorCategory;
  nativeId?: string;
  pluginId?: string;
  properties: Record<string, unknown>;
  capabilities?: string[];
  requiresFrames?: boolean;
  modelSpec?: ModelSpec;
}
