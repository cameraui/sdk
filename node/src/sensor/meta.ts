import type { SensorCategory, SensorType } from './base.js';

/** Condition under which a sensor arms an automation cascade. */
export interface SensorCascadeTrigger {
  /** Property watched for the arming condition. */
  readonly property: string;
  /** Values that arm the cascade, any other value disarms a sustained one. */
  readonly values: readonly unknown[];
  /** Whether the value must hold, instead of firing once. */
  readonly sustained: boolean;
}

/** Initial property values and capabilities for a user-created virtual sensor. */
export interface SensorVirtualDefaults {
  /** Property values the sensor starts with, whatever capabilities it has. */
  readonly properties: Readonly<Record<string, unknown>>;
  /** Capabilities a new virtual sensor has unless the user picks others. */
  readonly capabilities?: readonly string[];
  /** Capabilities the user can pick, each with the start values of the properties it adds. */
  readonly optionalCapabilities?: Readonly<Record<string, Readonly<Record<string, unknown>>>>;
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
  /** Numeric properties: accepted increment, commands are rounded to it. */
  readonly step?: number;
  /** Display unit of the value, e.g. `%` or `°C`. */
  readonly unit?: string;
  /** Values the device offers with their names at the device, for a property without a fixed enum. */
  readonly choices?: readonly SensorPropertyChoice[];
  /** String properties: longest accepted text. */
  readonly maxLength?: number;
  /** Accepts external writes (commands, target states, virtual sensor state). */
  readonly writable?: boolean;
  /** Not an observable state: hidden from trigger/condition pickers. */
  readonly internal?: boolean;
}

/** A value a device offers for a property, such as a chime tone or a TV input. */
export interface SensorPropertyChoice {
  /** Value written to the property. */
  readonly value: string | number;
  /** Name of the value at the device, shown as it comes. */
  readonly label: string;
}

/**
 * What a plugin narrows or describes on one property of its sensor, on top of
 * the type's spec: a thermostat's range, a chime's tones, an alarm without
 * night mode. The host rejects a command outside it before it reaches the
 * plugin, readings the plugin reports are not checked.
 */
export interface PropertySpecOverride {
  /** Lowest accepted value, inside the type's range. */
  min?: number;
  /** Highest accepted value, inside the type's range. */
  max?: number;
  /** Accepted increment, commands are rounded to it. */
  step?: number;
  /** Display unit, only for a property whose type sets none. */
  unit?: string;
  /** Enum properties: the values the device supports, a subset of the type's. */
  values?: (string | number)[];
  /** Values the device offers with their names at the device, for a property without a fixed enum. */
  choices?: SensorPropertyChoice[];
  /** String properties: longest accepted text. */
  maxLength?: number;
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
  /** Heating and cooling to a target temperature. */
  Climate = 'climate',
  /** Switchable fan with optional speed, direction and swing. */
  Fan = 'fan',
  /** Opening and closing a flow, like a water valve. */
  Valve = 'valve',
  /** Runs on command, no state of its own. */
  Scene = 'scene',
  /** Works toward a target humidity. */
  Humidifier = 'humidifier',
  /** Switchable air purifier with optional speed. */
  AirPurifier = 'airPurifier',
  /** Heats water to a target temperature. */
  WaterHeater = 'waterHeater',
  /** Robot that cleans floors on command. */
  Vacuum = 'vacuum',
  /** Robot that mows the lawn on command. */
  LawnMower = 'lawnMower',
  /** TV, speaker or receiver that plays media. */
  MediaPlayer = 'mediaPlayer',
  /** Armable alarm with several arm modes. */
  Alarm = 'alarm',
  /** Momentary happening of a kind, such as a button press, empty between happenings. */
  Event = 'event',
  /** Writable text, such as the message on a display. */
  Text = 'text',
}

/** A reading a sensor carries next to its state, exported as a measurement of its own. */
export interface SensorReading {
  /** Name of the property that carries the reading. */
  readonly property: string;
  /** Device class, where one applies. */
  readonly deviceClass?: string;
  /** Unit of the reading. */
  readonly unit?: string;
}

/** An on/off reading a sensor carries next to its state, exported as a binary sensor of its own. */
export interface SensorIndicator {
  /** Name of the property that carries the reading, `true` while it applies. */
  readonly property: string;
  /** Device class, where one applies. */
  readonly deviceClass?: string;
}

/** A current and a target value, as a cover's position or tilt. */
export interface SensorPosition {
  /** Name of the property that carries the current value. */
  readonly current: string;
  /** Name of the property that carries the target value. */
  readonly target: string;
}

/** Properties of a thermostat, named in {@link SensorSemantics.climate}. */
export interface SensorClimate {
  /** Name of the property that carries the current temperature. */
  readonly current: string;
  /** Name of the property that carries the target temperature. */
  readonly target: string;
  /** Name of the property that carries the lower end of the target range. */
  readonly targetLow?: string;
  /** Name of the property that carries the upper end of the target range. */
  readonly targetHigh?: string;
  /** Name of the property that carries the mode. */
  readonly mode: string;
  /** Name of the property that carries what the device does right now. */
  readonly action?: string;
  /** Name of the property that carries the current humidity. */
  readonly humidity?: string;
  /** Name of the property that carries the target humidity. */
  readonly targetHumidity?: string;
}

/** Properties of a fan, named in {@link SensorSemantics.fan}. */
export interface SensorFan {
  /** Name of the property that carries the speed in percent. */
  readonly speed?: string;
  /** Name of the property that carries the direction. */
  readonly direction?: string;
  /** Name of the property that says whether the fan swings. */
  readonly oscillating?: string;
}

/** Properties of a humidifier, named in {@link SensorSemantics.humidifier}. */
export interface SensorHumidifier {
  /** Name of the property that carries the target humidity. */
  readonly target: string;
  /** Name of the property that carries the measured humidity. */
  readonly current?: string;
  /** Name of the property that carries what the device does right now. */
  readonly action?: string;
  /** Name of the property that carries the mode. */
  readonly mode?: string;
}

/** Properties of a media player, named in {@link SensorSemantics.mediaPlayer}. */
export interface SensorMediaPlayer {
  /** Name of the property that turns the player on and off. */
  readonly power?: string;
  /** Name of the property that carries the volume, 0 to 100. */
  readonly volume?: string;
  /** Name of the property that carries whether the sound is muted. */
  readonly muted?: string;
  /** Name of the property that carries the selected input, its choices are the inputs. */
  readonly source?: string;
  /** Name of the property that carries the title of what plays. */
  readonly title?: string;
  /** Name of the property that carries the artist of what plays. */
  readonly artist?: string;
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
  /** Device class, where one applies. */
  readonly deviceClass?: string;
  /**
   * Enum property that says per sensor what it is, such as the kind of a cover.
   * The host sets `deviceClass` from the one value the sensor offers for it.
   */
  readonly deviceClassProperty?: string;
  /** Unit of the state value, e.g. `%` or `°C`. */
  readonly unit?: string;
  /** Material Design icon name, e.g. `mdi:door`. */
  readonly icon?: string;
  /** Whether consumers should file it under diagnostics instead of controls. */
  readonly diagnostic?: boolean;
  /**
   * State-name to wire-value mapping for multi-state sensors. The host fills it
   * from the enum values of the state property when the type sets none, limited
   * to the values the sensor offers.
   */
  readonly states?: Readonly<Record<string, string | number>>;
  /** Property carrying brightness, plus the scale factor a consumer applies to it. */
  readonly brightness?: {
    /** Name of the property that carries the value. */
    readonly property: string;
    /** Factor a consumer applies to the value. */
    readonly scale: number;
  };
  /** Property carrying volume, plus the scale factor a consumer applies to it. */
  readonly volume?: {
    /** Name of the property that carries the value. */
    readonly property: string;
    /** Factor a consumer applies to the value. */
    readonly scale: number;
  };
  /** Properties carrying a light's color, each only when the sensor offers it. */
  readonly color?: {
    /** Name of the property that carries the white color temperature in Kelvin. */
    readonly temperature?: string;
    /** Name of the property that carries hue and saturation. */
    readonly hueSaturation?: string;
    /** Name of the property that says which of the two the light shows. */
    readonly mode?: string;
  };
  /** Property carrying the tone, its choices are the tones the device offers. */
  readonly tone?: {
    /** Name of the property that carries the value. */
    readonly property: string;
  };
  /** Properties carrying the position of a cover or valve, 0 closed to 100 open. */
  readonly position?: SensorPosition;
  /** Properties carrying the tilt of a cover's slats, 0 closed to 100 open. */
  readonly tilt?: SensorPosition;
  /** Property that stops a moving cover when written `true`. */
  readonly stop?: {
    /** Name of the property that carries the command. */
    readonly property: string;
  };
  /** Properties of a thermostat or water heater in °C, the optional ones only when the sensor offers them. */
  readonly climate?: SensorClimate;
  /** Properties of a fan or an air purifier, each only when the sensor offers it. */
  readonly fan?: SensorFan;
  /** Properties of a humidifier, the optional ones only when the sensor offers them. */
  readonly humidifier?: SensorHumidifier;
  /** Properties of a valve that closes by itself after a set time, in seconds. */
  readonly duration?: {
    /** Name of the property that carries how long the valve stays open. */
    readonly property: string;
    /** Name of the property that carries the time left. */
    readonly remaining: string;
  };
  /** Readings next to the state, each exported as a measurement of its own. */
  readonly readings?: readonly SensorReading[];
  /**
   * On/off readings next to the state, such as a filter that needs a change,
   * each exported as a binary sensor of its own. Only those the sensor offers.
   */
  readonly indicators?: readonly SensorIndicator[];
  /**
   * Writable properties besides the command whose value is one of a list of
   * choices, such as a tone or a preset. The host fills it per sensor from the
   * property specs it offers.
   */
  readonly choices?: readonly string[];
  /**
   * Writable on/off settings besides the command, such as a child lock, each
   * exported as a switch of its own. Only those the sensor offers.
   */
  readonly toggles?: readonly string[];
  /**
   * Properties among the choices, toggles and volume that set the device up
   * instead of operating it, such as a child lock or a tone. Consumers file
   * them under configuration. Only those the sensor offers.
   */
  readonly configuration?: readonly string[];
  /**
   * One-off commands a robot such as a vacuum takes through its command
   * property, name to wire value. The host narrows it to the commands the
   * sensor offers.
   */
  readonly commands?: Readonly<Record<string, string>>;
  /** Property carrying a vacuum's suction level, its choices are the levels the device offers. */
  readonly fanSpeed?: {
    /** Name of the property that carries the value. */
    readonly property: string;
  };
  /** Power, sound, input and what plays of a media player, as far as it offers them. */
  readonly mediaPlayer?: SensorMediaPlayer;
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
