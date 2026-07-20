import type { SensorCategory, SensorType } from './base.js';

/** Condition under which a sensor arms an automation cascade. */
export interface SensorCascadeTrigger {
  readonly property: string;
  readonly value: unknown;
  readonly sustained: boolean;
}

/** Initial property values and capabilities for a user-created virtual sensor. */
export interface SensorVirtualDefaults {
  readonly properties: Readonly<Record<string, unknown>>;
  readonly capabilities?: readonly string[];
}

/** Runtime value type of a sensor property. */
export type SensorPropertyValueType = 'boolean' | 'number' | 'string' | 'enum' | 'object';

/**
 * Per-property value description: what type a property carries, its possible
 * enum values or numeric range, and whether it is a command or an internal
 * detail. Consumers (automation pickers, value editors) render from this
 * instead of hand-maintained tables.
 */
export interface SensorPropertySpec {
  readonly type: SensorPropertyValueType;
  /** Enum properties: value-name → wire value. Names double as i18n key stems. */
  readonly values?: Readonly<Record<string, string | number>>;
  /** Object properties: scalar member keys, exposed as value-path variables. */
  readonly keys?: readonly string[];
  readonly min?: number;
  readonly max?: number;
  readonly unit?: string;
  /** Accepts external writes (commands, target states, virtual sensor state). */
  readonly writable?: boolean;
  /** Not an observable state: hidden from trigger/condition pickers. */
  readonly internal?: boolean;
}

/** The kind of thing a sensor is, used by consumers to pick how to render it. */
export enum SensorDomain {
  Binary = 'binary',
  Measurement = 'measurement',
  Switch = 'switch',
  Light = 'light',
  Siren = 'siren',
  Lock = 'lock',
  Cover = 'cover',
  Alarm = 'alarm',
}

/**
 * What a sensor means, independent of any transport: which property holds its
 * state, which takes commands, its unit and state mapping. Consumers (MQTT
 * discovery, the HA integration) render from this instead of their own switch.
 */
export interface SensorSemantics {
  readonly domain: SensorDomain;
  readonly stateProperty: string;
  readonly commandProperty: string;
  readonly deviceClass?: string;
  readonly unit?: string;
  readonly icon?: string;
  readonly diagnostic?: boolean;
  readonly states?: Readonly<Record<string, number>>;
  readonly brightness?: { readonly property: string; readonly scale: number };
}

/**
 * Metadata for a sensor type, declared alongside its class via {@link defineSensor}.
 *
 * Collected into the sensor registry, from which plugin assignment keys and the
 * host's per-type tables derive, so each type is described once instead of in
 * several parallel tables that drift apart.
 */
export interface SensorMeta {
  readonly type: SensorType;
  readonly category: SensorCategory;
  readonly assignmentKey: string;
  readonly multiProvider: boolean;
  readonly isDetectionType: boolean;
  readonly properties: Readonly<Record<string, SensorPropertySpec>>;
  readonly shortcutable?: boolean;
  readonly cascadeTrigger?: SensorCascadeTrigger;
  readonly propertyCapabilities?: Readonly<Record<string, string>>;
  readonly virtual?: SensorVirtualDefaults;
  readonly semantics?: SensorSemantics | null;
}

/**
 * Declares the metadata for a sensor type: how it is assigned, scheduled, and
 * optionally created as a virtual sensor.
 *
 * @param meta - The sensor's metadata.
 *
 * @returns The same metadata, with `type` and `assignmentKey` preserved as literal
 * types so the registry can be checked for completeness and its keys derived.
 *
 * @example
 * ```ts
 * export const lightMeta = defineSensor({
 *   type: SensorType.Light,
 *   category: SensorCategory.Control,
 *   assignmentKey: 'light',
 *   multiProvider: true,
 *   isDetectionType: false,
 * });
 * ```
 */
export function defineSensor<const M extends SensorMeta>(meta: M): M {
  return meta;
}
