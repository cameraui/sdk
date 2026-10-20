import type { SensorCategory, SensorPropertyType, SensorSourceState, SensorType } from '../sensor/base.js';
import type { ModelSpec } from '../sensor/spec.js';

export interface PropertyChangedEvent {
  sensorId: string;
  sensorType: SensorType;
  property: SensorPropertyType;
  value: unknown;
  /** Not sent by the server. */
  previousValue?: unknown;
  /** Change time in epoch milliseconds. */
  timestamp: number;
}

/** @internal */
export type PropertyUpdateFn = (properties: Record<string, unknown>) => void;

/** @internal */
export type CapabilityUpdateFn = (capabilities: string[]) => void;

export interface SensorSourcePatch {
  sourceState?: SensorSourceState;
  address?: string;
}

export type SourceUpdateFn = (patch: SensorSourcePatch) => void;

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
  origin?: string;
  modelSpec?: ModelSpec;
  sourceState?: SensorSourceState;
  address?: string;
}
