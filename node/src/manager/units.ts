/** Units the admin picked for the installation under Settings, System. */
export enum UnitSystem {
  /** Metric units, such as °C, km and kg. */
  Metric = 'metric',
  /** Imperial units as used in the US, such as °F, mi and lb. */
  Imperial = 'imperial',
}

/** A reading with its unit, as {@link toUnitSystem} returns it. */
export interface UnitValue {
  /** The reading. */
  value: number;
  /** Unit of the reading. */
  unit: string;
}

interface Conversion {
  to: string;
  factor: number;
  offset?: number;
}

// the first metric unit for an imperial one wins on the way back, so mm comes before cm
const TO_IMPERIAL: Readonly<Record<string, Conversion>> = {
  '°C': { to: '°F', factor: 9 / 5, offset: 32 },
  km: { to: 'mi', factor: 0.621371 },
  m: { to: 'ft', factor: 3.28084 },
  mm: { to: 'in', factor: 0.0393701 },
  cm: { to: 'in', factor: 0.393701 },
  'km/h': { to: 'mph', factor: 0.621371 },
  'm/s': { to: 'mph', factor: 2.23694 },
  'mm/h': { to: 'in/h', factor: 0.0393701 },
  'mm/d': { to: 'in/d', factor: 0.0393701 },
  L: { to: 'gal', factor: 0.264172 },
  mL: { to: 'fl. oz.', factor: 0.033814 },
  'm³': { to: 'ft³', factor: 35.3147 },
  'L/min': { to: 'gal/min', factor: 0.264172 },
  'L/h': { to: 'gal/h', factor: 0.264172 },
  kg: { to: 'lb', factor: 2.20462 },
  g: { to: 'oz', factor: 0.035274 },
  hPa: { to: 'inHg', factor: 0.02953 },
  mbar: { to: 'inHg', factor: 0.02953 },
  kPa: { to: 'psi', factor: 0.145038 },
  bar: { to: 'psi', factor: 14.5038 },
};

const TO_METRIC: Readonly<Record<string, Conversion>> = Object.entries(TO_IMPERIAL).reduce<Record<string, Conversion>>((metric, [unit, { to, factor, offset }]) => {
  metric[to] ??= { to: unit, factor: 1 / factor, offset: offset === undefined ? undefined : -offset / factor };
  return metric;
}, {});

/**
 * Convert a reading to the unit the installation shows for its quantity, such
 * as °C to °F for {@link UnitSystem.Imperial}. A reading already in that unit
 * system, or in a unit without a counterpart, comes back unchanged.
 *
 * @param value - The reading.
 *
 * @param unit - Unit of the reading, such as `°C`.
 *
 * @param system - The installation's unit system, from `coreManager.getUnitSystem()`.
 *
 * @returns The reading in the shown unit, rounded to two decimals.
 *
 * @example
 * ```typescript
 * const system = await api.coreManager.getUnitSystem();
 * const shown = toUnitSystem(21.5, '°C', system); // { value: 70.7, unit: '°F' } for imperial
 * ```
 */
export function toUnitSystem(value: number, unit: string, system: UnitSystem): UnitValue {
  const conversion = (system === UnitSystem.Imperial ? TO_IMPERIAL : TO_METRIC)[unit];
  return conversion ? { value: convert(value, conversion), unit: conversion.to } : { value, unit };
}

/**
 * Convert a value entered in the shown unit back to the unit it is stored in,
 * the reverse of {@link toUnitSystem}.
 *
 * @param value - The value as entered.
 *
 * @param unit - Unit the value is stored in, such as `°C`.
 *
 * @param system - The installation's unit system, from `coreManager.getUnitSystem()`.
 *
 * @returns The value in the stored unit, rounded to two decimals.
 *
 * @example
 * ```typescript
 * const stored = fromUnitSystem(70.7, '°C', UnitSystem.Imperial); // 21.5
 * ```
 */
export function fromUnitSystem(value: number, unit: string, system: UnitSystem): number {
  const conversion = (system === UnitSystem.Imperial ? TO_IMPERIAL : TO_METRIC)[unit];
  if (!conversion) return value;
  return round((value - (conversion.offset ?? 0)) / conversion.factor);
}

/** @internal */
function convert(value: number, { factor, offset }: Conversion): number {
  return round(value * factor + (offset ?? 0));
}

/** @internal */
function round(value: number): number {
  return Math.round(value * 100) / 100;
}
