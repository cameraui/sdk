import { describe, expect, it } from 'vitest';

import { checkPropertyWrite } from '../internal/property-check.js';
import { SecuritySystem, SecuritySystemProperty, SecuritySystemState } from './securitySystem.js';

import type { SensorSourcePatch } from '../internal/sensor-rpc.js';
import type { SensorPropertySpec } from './meta.js';

const noNight = { values: [SecuritySystemState.AwayArm, SecuritySystemState.StayArm, SecuritySystemState.Disarmed] };

describe('property specs', () => {
  it('registers with the specs from the constructor and sends only changes', () => {
    const alarm = new SecuritySystem('Alarm', { propertySpecs: { [SecuritySystemProperty.TargetState]: noNight } });
    expect(alarm.toJSON().propertySpecs).toEqual({ targetState: noNight });

    const patches: SensorSourcePatch[] = [];
    alarm._initSource((patch) => patches.push(patch));

    alarm.setPropertySpec(SecuritySystemProperty.TargetState, { values: [...noNight.values] });
    expect(patches).toEqual([]);

    alarm.setPropertySpec(SecuritySystemProperty.CurrentState, { values: [SecuritySystemState.Disarmed] });
    alarm.setPropertySpec(SecuritySystemProperty.TargetState, undefined);
    alarm.setPropertySpec(SecuritySystemProperty.TargetState, undefined);
    expect(patches).toEqual([
      { propertySpecs: { targetState: noNight, currentState: { values: [SecuritySystemState.Disarmed] } } },
      { propertySpecs: { currentState: { values: [SecuritySystemState.Disarmed] } } },
    ]);
  });

  it('registers an empty map when the plugin set none', () => {
    expect(new SecuritySystem('Alarm').toJSON().propertySpecs).toEqual({});
  });

  it('takes the resolved specs from the host and emits once per change', () => {
    const alarm = new SecuritySystem('Alarm');
    const events: unknown[] = [];
    alarm.onPropertySpecsChanged.subscribe((specs) => events.push(specs));
    expect(alarm.propertySpecs).toEqual({});

    const resolved: Record<string, SensorPropertySpec> = { targetState: { type: 'enum', values: { away_arm: 1, disarmed: 3 }, writable: true } };
    alarm._applyPropertySpecs(resolved);
    alarm._applyPropertySpecs({ targetState: { type: 'enum', values: { away_arm: 1, disarmed: 3 }, writable: true } });
    expect(events).toEqual([resolved]);
    expect(alarm.propertySpecs).toEqual(resolved);
  });
});

describe('checkPropertyWrite', () => {
  const specs: Record<string, SensorPropertySpec> = {
    target: { type: 'number', min: 10, max: 30, step: 0.5 },
    targetState: { type: 'enum', values: { away_arm: 1, disarmed: 3 } },
    tone: { type: 'string', choices: [{ value: 'ding', label: 'Ding Dong' }] },
    text: { type: 'string', maxLength: 4 },
    coarse: { type: 'number', min: 0, max: 10, step: 4 },
  };

  it('passes properties without a spec', () => {
    expect(checkPropertyWrite(specs, 'on', true)).toBe(true);
  });

  it('rejects numbers outside the range and rounds to the step', () => {
    expect(() => checkPropertyWrite(specs, 'target', 9.9)).toThrow(/at least 10/);
    expect(() => checkPropertyWrite(specs, 'target', 30.1)).toThrow(/at most 30/);
    expect(checkPropertyWrite(specs, 'target', 21.3)).toBe(21.5);
    expect(checkPropertyWrite(specs, 'target', 21.2)).toBe(21);
    expect(checkPropertyWrite(specs, 'coarse', 10)).toBe(10);
  });

  it('rejects values and choices the device does not offer', () => {
    expect(checkPropertyWrite(specs, 'targetState', 1)).toBe(1);
    expect(() => checkPropertyWrite(specs, 'targetState', 2)).toThrow(/does not support 2/);
    expect(checkPropertyWrite(specs, 'tone', 'ding')).toBe('ding');
    expect(() => checkPropertyWrite(specs, 'tone', 'xmas')).toThrow(/no choice xmas/);
  });

  it('rejects text over the limit', () => {
    expect(checkPropertyWrite(specs, 'text', 'Hall')).toBe('Hall');
    expect(() => checkPropertyWrite(specs, 'text', 'Hallway')).toThrow(/longer than 4/);
  });
});
