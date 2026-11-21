import { describe, expect, it } from 'vitest';

import { ContactSensor } from './contact.js';
import { TemperatureInfo } from './temperature.js';

import type { SensorSourcePatch } from '../internal/sensor-rpc.js';
import type { DeviceInfo } from './device.js';

const hallway: DeviceInfo = { id: 'dev-1', name: 'Hallway sensor', manufacturer: 'Acme' };

describe('sensor device', () => {
  it('registers with the device from the constructor and sends only changes', () => {
    const sensor = new ContactSensor('Contact', { nativeId: 'n-1', device: hallway, primary: true });
    expect(sensor.toJSON().membership).toEqual({ device: hallway, primary: true });

    const patches: SensorSourcePatch[] = [];
    sensor._initSource((patch) => patches.push(patch));

    sensor.setDeviceInfo({ ...hallway }, { primary: true });
    expect(patches).toEqual([]);

    sensor.setDeviceInfo({ ...hallway, firmware: '2.1' }, { primary: true });
    sensor.setDeviceInfo(undefined);
    expect(patches).toEqual([{ membership: { device: { ...hallway, firmware: '2.1' }, primary: true } }, { membership: { device: null, primary: false } }]);
  });

  it('registers without a membership when the plugin never set a device', () => {
    const sensor = new ContactSensor('Contact', { primary: true });
    expect(sensor.toJSON().membership).toBeUndefined();
  });

  it('takes names and device from the host and emits once per change', () => {
    const sensor = new TemperatureInfo('Hallway sensor Temperature');
    const events: unknown[] = [];
    sensor.onDeviceInfoChanged.subscribe((device) => events.push(device));
    expect(sensor.shortName).toBe('Hallway sensor Temperature');
    expect(sensor.deviceInfo).toBeUndefined();
    expect(sensor.primary).toBe(false);

    const state = { device: { id: 'd-1', name: 'Hallway sensor' }, displayName: 'Hallway sensor Temperature', shortName: 'Temperature', primary: false };
    sensor._applyDeviceState(state);
    sensor._applyDeviceState({ ...state, device: { ...state.device } });
    expect(events).toHaveLength(1);
    expect(sensor.shortName).toBe('Temperature');
    expect(sensor.displayName).toBe('Hallway sensor Temperature');

    sensor._applyDeviceState({ displayName: 'Temperature', shortName: 'Temperature', primary: false });
    expect(events).toEqual([state.device, undefined]);
    expect(sensor.deviceInfo).toBeUndefined();
  });
});
