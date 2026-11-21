import { describe, expect, it } from 'vitest';

import { AirQualityCapability, AirQualityInfo, AirQualityLevel, AirQualityProperty } from './airQuality.js';

class Sensor extends AirQualityInfo {
  constructor(capabilities: AirQualityCapability[]) {
    super();
    this.capabilities = capabilities;
  }
}

describe('air quality', () => {
  it('follows the air quality index before PM2.5', () => {
    const sensor = new Sensor([AirQualityCapability.Aqi, AirQualityCapability.Pm25]);
    sensor.setReading(AirQualityProperty.Pm25, 80);
    sensor.setReading(AirQualityProperty.Aqi, 42);
    expect(sensor.level).toBe(AirQualityLevel.Excellent);
    sensor.setReading(AirQualityProperty.Aqi, 250);
    expect(sensor.level).toBe(AirQualityLevel.Poor);
  });

  it('follows PM2.5 without an index', () => {
    const sensor = new Sensor([AirQualityCapability.Pm25, AirQualityCapability.Voc]);
    sensor.setReading(AirQualityProperty.Pm25, 35.4);
    expect(sensor.level).toBe(AirQualityLevel.Good);
    sensor.setReading(AirQualityProperty.Pm25, 35.5);
    expect(sensor.level).toBe(AirQualityLevel.Fair);
  });

  it('keeps the level the plugin sets and ignores readings that are no number', () => {
    const sensor = new Sensor([AirQualityCapability.Pm25]);
    sensor.setLevel(AirQualityLevel.Inferior);
    sensor.setReading(AirQualityProperty.Pm25, 2);
    sensor.setReading(AirQualityProperty.Pm10, Number.NaN);
    expect(sensor.level).toBe(AirQualityLevel.Inferior);
    expect(sensor.getValue(AirQualityProperty.Pm10)).toBe(0);
  });

  it('stays unknown without a reading that rates the air', () => {
    const sensor = new Sensor([AirQualityCapability.Voc]);
    sensor.setReading(AirQualityProperty.Voc, 300);
    expect(sensor.level).toBe('');
  });
});
