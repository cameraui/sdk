import { describe, expect, it } from 'vitest';

import { fromUnitSystem, toUnitSystem, UnitSystem } from './units.js';

describe('unit system conversion', () => {
  it('converts metric readings for an imperial installation and back', () => {
    expect(toUnitSystem(21.5, '°C', UnitSystem.Imperial)).toEqual({ value: 70.7, unit: '°F' });
    expect(fromUnitSystem(70.7, '°C', UnitSystem.Imperial)).toBe(21.5);
    expect(toUnitSystem(1013, 'hPa', UnitSystem.Imperial)).toEqual({ value: 29.91, unit: 'inHg' });
  });

  it('converts imperial readings for a metric installation and back', () => {
    expect(toUnitSystem(70.7, '°F', UnitSystem.Metric)).toEqual({ value: 21.5, unit: '°C' });
    expect(fromUnitSystem(21.5, '°F', UnitSystem.Metric)).toBe(70.7);
    expect(toUnitSystem(1, 'in', UnitSystem.Metric)).toEqual({ value: 25.4, unit: 'mm' });
  });

  it('keeps readings already in the shown system or without a counterpart', () => {
    expect(toUnitSystem(20, '°C', UnitSystem.Metric)).toEqual({ value: 20, unit: '°C' });
    expect(toUnitSystem(68, '°F', UnitSystem.Imperial)).toEqual({ value: 68, unit: '°F' });
    expect(toUnitSystem(230, 'V', UnitSystem.Imperial)).toEqual({ value: 230, unit: 'V' });
    expect(fromUnitSystem(230, 'V', UnitSystem.Imperial)).toBe(230);
  });
});
