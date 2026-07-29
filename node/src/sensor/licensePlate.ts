import { Sensor, SensorType, SensorCategory } from './base.js';
import { defineSensor } from './meta.js';

import type { Observable } from '../observable/index.js';
import type { PropertyChangeOf, SensorLike, SensorOptions } from './base.js';
import type { Detection, VideoFrameData } from './detection.js';
import type { ModelSpec } from './spec.js';

/**
 * Property names of a license plate sensor.
 *
 * @internal
 */
export enum LicensePlateProperty {
  /** Whether any license plate is currently detected. */
  Detected = 'detected',
  /** List of detected plates with OCR text. */
  Detections = 'detections',
}

/** A license plate detection result, extending {@link Detection} with OCR fields. */
export interface LicensePlateDetection extends Detection {
  /** Sub-detection attribute, fixed to `'license_plate'`. */
  attribute: 'license_plate';
  /** Recognized plate text (e.g. `"ABC 1234"`). */
  plateText: string;
  /** Average text recognition confidence (0-1), separate from the box confidence. */
  ocrConfidence?: number;
}

/**
 * Property values of a license plate sensor.
 *
 * @internal
 */
export interface LicensePlateSensorProperties {
  [LicensePlateProperty.Detected]: boolean;
  [LicensePlateProperty.Detections]: LicensePlateDetection[];
}

/** Read-only proxy interface for a license plate sensor. */
export interface LicensePlateSensorLike extends SensorLike {
  readonly type: SensorType.LicensePlate;
  readonly onPropertyChanged: Observable<PropertyChangeOf<LicensePlateSensorProperties>>;

  getValue(property: LicensePlateProperty.Detected): boolean | undefined;
  getValue(property: LicensePlateProperty.Detections): LicensePlateDetection[] | undefined;
  getValue(property: string): unknown;
}

/**
 * License plate sensor that reports detected plates with OCR text.
 *
 * Plugin authors call `reportDetections(list)` to push detected plates.
 * `detected` is auto-derived from the detection list.
 */
export class LicensePlateSensor<TStorage extends object = Record<string, any>> extends Sensor<LicensePlateSensorProperties, TStorage> {
  readonly type = SensorType.LicensePlate;
  readonly category = SensorCategory.Sensor;

  constructor(name = 'License Plate Sensor', options?: SensorOptions) {
    super(name, options);

    this._writeState({
      [LicensePlateProperty.Detected]: false,
      [LicensePlateProperty.Detections]: [],
    });
  }

  get detected(): boolean {
    return this.props.detected;
  }

  get detections(): LicensePlateDetection[] {
    return this.props.detections;
  }

  /**
   * Report detected license plates.
   *
   * - `reportDetections(true)`: plate detected without specifics. The SDK
   *   synthesizes a single full-frame detection with empty plateText.
   * - `reportDetections(true, [...])`: explicit plate detections with OCR text.
   * - `reportDetections(false)`: clear.
   *
   * @param detected - Whether any license plate is currently detected.
   *
   * @param detections - Optional explicit plate detections to publish.
   *
   * @example
   * ```ts
   * import type { LicensePlateDetection } from '@camera.ui/sdk';
   * sensor.reportDetections(true, [
   *   {
   *     label: 'vehicle',
   *     confidence: 0.93,
   *     box: { x: 0.2, y: 0.5, width: 0.2, height: 0.08 },
   *     attribute: 'license_plate',
   *     plateText: 'ABC 1234',
   *   } satisfies LicensePlateDetection,
   * ]);
   * sensor.reportDetections(false);
   * ```
   */
  reportDetections(detected: boolean, detections?: LicensePlateDetection[]): void {
    const list = this._normalizeReportedDetections<LicensePlateDetection>(detected, detections, 'vehicle', { attribute: 'license_plate', plateText: '' });
    this._writeState({
      [LicensePlateProperty.Detected]: detected,
      [LicensePlateProperty.Detections]: list,
    });
  }

  /**
   * Explicitly clear license plate state (detected = false, detections = []).
   *
   * @example
   * ```ts
   * sensor.clearDetections();
   * ```
   */
  clearDetections(): void {
    this.reportDetections(false);
  }

  /**
   * Read-only sensor: external writes are ignored.
   *
   * @internal
   */
  updateValue(_property: string, _value: unknown): void {}
}

/** Return type for {@link LicensePlateDetectorSensor.detectLicensePlates}. */
export interface LicensePlateResult {
  /** Whether any license plate is detected in this frame. */
  detected: boolean;
  /** Detections emitted for this frame. */
  detections: LicensePlateDetection[];
}

/**
 * License plate detector that receives video frames from the backend pipeline.
 * Extend this class and implement {@link detectLicensePlates} for plate
 * detection and OCR.
 */
export abstract class LicensePlateDetectorSensor<TStorage extends object = Record<string, any>> extends LicensePlateSensor<TStorage> {
  _requiresFrames = true;

  abstract get modelSpec(): ModelSpec;

  /**
   * Detect license plates in batch. Each frame is pre-scaled to `modelSpec.input`:
   * normally a vehicle region cropped by the upstream object detector, but the whole
   * scene when no decoded frame is available. Must return exactly one result per input
   * frame, in the same order.
   */
  abstract detectLicensePlates(frames: VideoFrameData[]): Promise<LicensePlateResult[]>;
}

/** Registry metadata for {@link LicensePlateSensor}. */
export const licensePlateMeta = defineSensor({
  type: SensorType.LicensePlate,
  category: SensorCategory.Sensor,
  assignmentKey: 'licensePlate',
  multiProvider: false,
  isDetectionType: true,
  properties: {
    [LicensePlateProperty.Detected]: { type: 'boolean' },
    [LicensePlateProperty.Detections]: { type: 'object', internal: true },
  },
  semantics: null,
});
