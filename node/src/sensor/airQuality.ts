import { Sensor, SensorType, SensorCategory } from './base.js';
import { defineSensor, SensorDomain } from './meta.js';

import type { Observable } from '../observable/index.js';
import type { PropertyChangeOf, SensorLike, SensorOptions } from './base.js';

/** Readings an air quality sensor can offer besides its overall level. */
export enum AirQualityCapability {
  /** Air quality index. */
  Aqi = 'aqi',
  /** Fine particles up to 2.5 μm. */
  Pm25 = 'pm25',
  /** Particles up to 10 μm. */
  Pm10 = 'pm10',
  /** Volatile organic compounds. */
  Voc = 'voc',
  /** Nitrogen dioxide. */
  No2 = 'no2',
}

/** Property names of an air quality sensor. */
export enum AirQualityProperty {
  /** Overall air quality, empty while unknown. */
  Level = 'level',
  /** Air quality index. */
  Aqi = 'aqi',
  /** Fine particles up to 2.5 μm, in μg/m³. */
  Pm25 = 'pm25',
  /** Particles up to 10 μm, in μg/m³. */
  Pm10 = 'pm10',
  /** Volatile organic compounds, in μg/m³. */
  Voc = 'voc',
  /** Nitrogen dioxide, in μg/m³. */
  No2 = 'no2',
}

/** Overall air quality, from best to worst. */
export enum AirQualityLevel {
  /** Clean air. */
  Excellent = 'excellent',
  /** Good air. */
  Good = 'good',
  /** Acceptable air. */
  Fair = 'fair',
  /** Poor air for sensitive people. */
  Inferior = 'inferior',
  /** Poor air. */
  Poor = 'poor',
}

/** Property values of an air quality sensor. */
export interface AirQualityInfoProperties {
  [AirQualityProperty.Level]: AirQualityLevel | '';
  [AirQualityProperty.Aqi]: number;
  [AirQualityProperty.Pm25]: number;
  [AirQualityProperty.Pm10]: number;
  [AirQualityProperty.Voc]: number;
  [AirQualityProperty.No2]: number;
}

/** The numeric readings of an air quality sensor, the properties `setReading()` takes. */
export type AirQualityReading = Exclude<AirQualityProperty, AirQualityProperty.Level>;

/** Read-only proxy interface for an air quality sensor. */
export interface AirQualityInfoLike extends SensorLike {
  readonly type: SensorType.AirQuality;
  readonly onPropertyChanged: Observable<PropertyChangeOf<AirQualityInfoProperties>>;
  readonly onCapabilitiesChanged: Observable<AirQualityCapability[]>;

  getValue(property: AirQualityProperty.Level): AirQualityLevel | '' | undefined;
  getValue(property: AirQualityReading): number | undefined;
  getValue(property: string): unknown;
}

const AQI_LEVELS: readonly [number, AirQualityLevel][] = [
  [50, AirQualityLevel.Excellent],
  [100, AirQualityLevel.Good],
  [150, AirQualityLevel.Fair],
  [200, AirQualityLevel.Inferior],
];

const PM25_LEVELS: readonly [number, AirQualityLevel][] = [
  [9, AirQualityLevel.Excellent],
  [35.4, AirQualityLevel.Good],
  [55.4, AirQualityLevel.Fair],
  [125.4, AirQualityLevel.Inferior],
];

/**
 * Air quality sensor with an overall level and the readings the device has.
 * Set `capabilities` to the readings the device offers. Without a level of its
 * own from the plugin, the level follows the air quality index, else PM2.5.
 */
export class AirQualityInfo<TStorage extends object = Record<string, any>> extends Sensor<AirQualityInfoProperties, TStorage, AirQualityCapability> {
  readonly type = SensorType.AirQuality;
  readonly category = SensorCategory.Info;

  private _levelFromPlugin = false;

  constructor(name = 'Air Quality', options?: SensorOptions) {
    super(name, options);

    this._writeState({
      [AirQualityProperty.Level]: '',
      [AirQualityProperty.Aqi]: 0,
      [AirQualityProperty.Pm25]: 0,
      [AirQualityProperty.Pm10]: 0,
      [AirQualityProperty.Voc]: 0,
      [AirQualityProperty.No2]: 0,
    });
  }

  /** Overall air quality, empty while unknown. */
  get level(): AirQualityLevel | '' {
    return this.props.level;
  }

  /**
   * Report the overall air quality as the device rates it. From then on the
   * level no longer follows the readings.
   *
   * @param value - The overall level.
   *
   * @example
   * ```ts
   * airQuality.setLevel(AirQualityLevel.Good);
   * ```
   */
  setLevel(value: AirQualityLevel): void {
    this._levelFromPlugin = true;
    this._writeState({ [AirQualityProperty.Level]: value });
  }

  /**
   * Report a reading. A value that is not a finite number is ignored, a
   * negative one counts as 0.
   *
   * @param property - The reading, such as {@link AirQualityProperty.Pm25}.
   *
   * @param value - The value, in the unit of the reading.
   *
   * @example
   * ```ts
   * airQuality.setReading(AirQualityProperty.Pm25, 12.4);
   * ```
   */
  setReading(property: AirQualityReading, value: number): void {
    if (!Number.isFinite(value)) return;

    this._writeState({ [property]: Math.max(0, value) });
    if (!this._levelFromPlugin) this._writeState({ [AirQualityProperty.Level]: this._derivedLevel() });
  }

  /** @internal */
  updateValue(_property: string, _value: unknown): void {}

  private _derivedLevel(): AirQualityLevel | '' {
    if (this.hasCapability(AirQualityCapability.Aqi)) return this._levelOf(this.props.aqi, AQI_LEVELS);
    if (this.hasCapability(AirQualityCapability.Pm25)) return this._levelOf(this.props.pm25, PM25_LEVELS);
    return this.props.level;
  }

  private _levelOf(value: number, steps: readonly [number, AirQualityLevel][]): AirQualityLevel {
    return steps.find(([limit]) => value <= limit)?.[1] ?? AirQualityLevel.Poor;
  }
}

/** Registry metadata for {@link AirQualityInfo}. */
export const airQualityMeta = defineSensor({
  type: SensorType.AirQuality,
  category: SensorCategory.Info,
  assignmentKey: 'airQuality',
  multiProvider: true,
  isDetectionType: false,
  properties: {
    [AirQualityProperty.Level]: {
      type: 'enum',
      values: {
        excellent: AirQualityLevel.Excellent,
        good: AirQualityLevel.Good,
        fair: AirQualityLevel.Fair,
        inferior: AirQualityLevel.Inferior,
        poor: AirQualityLevel.Poor,
      },
    },
    [AirQualityProperty.Aqi]: { type: 'number', min: 0, step: 1 },
    [AirQualityProperty.Pm25]: { type: 'number', min: 0, step: 0.1, unit: 'μg/m³' },
    [AirQualityProperty.Pm10]: { type: 'number', min: 0, step: 0.1, unit: 'μg/m³' },
    [AirQualityProperty.Voc]: { type: 'number', min: 0, step: 1, unit: 'μg/m³' },
    [AirQualityProperty.No2]: { type: 'number', min: 0, step: 1, unit: 'μg/m³' },
  },
  shortcutable: true,
  cascadeTrigger: { property: AirQualityProperty.Level, values: [AirQualityLevel.Inferior, AirQualityLevel.Poor], sustained: true },
  propertyCapabilities: {
    [AirQualityProperty.Aqi]: AirQualityCapability.Aqi,
    [AirQualityProperty.Pm25]: AirQualityCapability.Pm25,
    [AirQualityProperty.Pm10]: AirQualityCapability.Pm10,
    [AirQualityProperty.Voc]: AirQualityCapability.Voc,
    [AirQualityProperty.No2]: AirQualityCapability.No2,
  },
  semantics: {
    domain: SensorDomain.Measurement,
    stateProperty: AirQualityProperty.Level,
    commandProperty: AirQualityProperty.Level,
    deviceClass: 'enum',
    readings: [
      { property: AirQualityProperty.Aqi, deviceClass: 'aqi' },
      { property: AirQualityProperty.Pm25, deviceClass: 'pm25', unit: 'μg/m³' },
      { property: AirQualityProperty.Pm10, deviceClass: 'pm10', unit: 'μg/m³' },
      { property: AirQualityProperty.Voc, deviceClass: 'volatile_organic_compounds', unit: 'μg/m³' },
      { property: AirQualityProperty.No2, deviceClass: 'nitrogen_dioxide', unit: 'μg/m³' },
    ],
  },
});
