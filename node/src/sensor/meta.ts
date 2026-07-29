import type { SensorCategory, SensorType } from './base.js';

/** Condition under which a sensor arms an automation cascade. */
export interface SensorCascadeTrigger {
  /** Property watched for the arming condition. */
  readonly property: string;
  /** Value that arms the cascade. */
  readonly value: unknown;
  /** Whether the value must hold, instead of firing once. */
  readonly sustained: boolean;
}

/** Initial property values and capabilities for a user-created virtual sensor. */
export interface SensorVirtualDefaults {
  /** Property values the sensor starts with. */
  readonly properties: Readonly<Record<string, unknown>>;
  /** Capabilities the virtual sensor advertises. */
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
  /** Runtime type of the value. */
  readonly type: SensorPropertyValueType;
  /** Enum properties: value-name → wire value. Names double as i18n key stems. */
  readonly values?: Readonly<Record<string, string | number>>;
  /** Object properties: scalar member keys, exposed as value-path variables. */
  readonly keys?: readonly string[];
  /** Numeric properties: lowest accepted value. */
  readonly min?: number;
  /** Numeric properties: highest accepted value. */
  readonly max?: number;
  /** Display unit of the value, e.g. `%` or `°C`. */
  readonly unit?: string;
  /** Accepts external writes (commands, target states, virtual sensor state). */
  readonly writable?: boolean;
  /** Not an observable state: hidden from trigger/condition pickers. */
  readonly internal?: boolean;
}

/** The kind of thing a sensor is, used by consumers to pick how to render it. */
export enum SensorDomain {
  /** On/off state, no further detail. */
  Binary = 'binary',
  /** Numeric reading with a unit. */
  Measurement = 'measurement',
  /** Switchable on/off. */
  Switch = 'switch',
  /** Switchable with optional brightness. */
  Light = 'light',
  /** Switchable with optional volume. */
  Siren = 'siren',
  /** Locked/unlocked with a target state. */
  Lock = 'lock',
  /** Opening and closing, like a garage door. */
  Cover = 'cover',
  /** Armable alarm with several arm modes. */
  Alarm = 'alarm',
}

/**
 * What a sensor means, independent of any transport: which property holds its
 * state, which takes commands, its unit and state mapping. Consumers (MQTT
 * discovery, the HA integration) render from this instead of their own switch.
 */
export interface SensorSemantics {
  /** Which kind of thing the sensor is. */
  readonly domain: SensorDomain;
  /** Property holding the sensor's state. */
  readonly stateProperty: string;
  /** Property that takes commands. */
  readonly commandProperty: string;
  /** Home Assistant device class, where one applies. */
  readonly deviceClass?: string;
  /** Unit of the state value, e.g. `%` or `°C`. */
  readonly unit?: string;
  /** Material Design icon name, e.g. `mdi:door`. */
  readonly icon?: string;
  /** Whether consumers should file it under diagnostics instead of controls. */
  readonly diagnostic?: boolean;
  /** State-name to wire-value mapping for multi-state sensors. */
  readonly states?: Readonly<Record<string, number>>;
  /** Property carrying brightness, plus the scale factor a consumer applies to it. */
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
  /** Sensor type this metadata describes. */
  readonly type: SensorType;
  /** Role the sensor plays: read-only, control, trigger or info. */
  readonly category: SensorCategory;
  /** Key under which a camera stores its assignment for this type. */
  readonly assignmentKey: string;
  /** Whether a camera can have several sensors of this type at once. */
  readonly multiProvider: boolean;
  /** Whether the sensor analyzes frames and reports detections. */
  readonly isDetectionType: boolean;
  /** Value description per property, keyed by property name. */
  readonly properties: Readonly<Record<string, SensorPropertySpec>>;
  /** Sensor only makes sense attached to a camera, never standalone. */
  readonly cameraBound?: boolean;
  /** Sensor can be pinned as a UI shortcut. */
  readonly shortcutable?: boolean;
  /** Condition under which this sensor arms an automation cascade. */
  readonly cascadeTrigger?: SensorCascadeTrigger;
  /** Property name to the capability that has to be present for it. */
  readonly propertyCapabilities?: Readonly<Record<string, string>>;
  /** Defaults used when the user creates a virtual sensor of this type. */
  readonly virtual?: SensorVirtualDefaults;
  /** Transport-independent meaning, or `null` when the type has none. */
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
