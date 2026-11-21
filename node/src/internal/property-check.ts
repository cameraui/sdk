import type { SensorPropertySpec } from '../sensor/meta.js';

/** @internal */
export function checkPropertyWrite(specs: Readonly<Record<string, SensorPropertySpec>>, property: string, value: unknown): unknown {
  const spec = specs[property];
  if (!spec) return value;

  if (typeof value === 'number') {
    if (spec.min !== undefined && value < spec.min) throw new Error(`${property} must be at least ${spec.min}, got ${value}`);
    if (spec.max !== undefined && value > spec.max) throw new Error(`${property} must be at most ${spec.max}, got ${value}`);
    if (spec.step) value = roundToStep(value, spec);
  }
  if (spec.values && !Object.values(spec.values).includes(value as string | number)) {
    throw new Error(`${property} does not support ${String(value)}`);
  }
  if (spec.choices && !spec.choices.some((choice) => choice.value === value)) {
    throw new Error(`${property} has no choice ${String(value)}`);
  }
  if (typeof value === 'string' && spec.maxLength !== undefined && value.length > spec.maxLength) {
    throw new Error(`${property} is longer than ${spec.maxLength} characters`);
  }
  return value;
}

/** @internal */
function roundToStep(value: number, spec: SensorPropertySpec): number {
  const step = spec.step!;
  const base = spec.min ?? 0;
  const digits = String(step).split('.')[1]?.length ?? 0;
  const rounded = Number((base + Math.round((value - base) / step) * step).toFixed(digits));
  return Math.min(Math.max(rounded, spec.min ?? -Infinity), spec.max ?? Infinity);
}
