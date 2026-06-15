import { Sensor, SensorType, SensorCategory } from './base.js';

import type { Observable } from '../observable/index.js';
import type { PropertyChangeOf, SensorLike } from './base.js';
import type { Detection, VideoFrameData } from './detection.js';
import type { ModelSpec } from './spec.js';

/**
 * Property names of a classifier sensor.
 *
 * @internal
 */
export enum ClassifierProperty {
  /** Whether any classification result is active. */
  Detected = 'detected',
  /** List of classification results with labels and confidence. */
  Detections = 'detections',
  /** Unique labels of the current detections (auto-derived when reporting detections). */
  Labels = 'labels',
}

/** A classifier detection result with an open attribute for classifier categories. */
export interface ClassifierDetection extends Detection {
  /** Classifier category (e.g. `'bird'`, `'delivery'`). Open string for any classifier. */
  attribute: string;
  /** Classifier sub-category (e.g. `'woodpecker'`, `'amazon'`). */
  subAttribute: string;
}

/**
 * Property shape carried by a {@link ClassifierSensor}.
 *
 * @internal
 */
export interface ClassifierSensorProperties {
  [ClassifierProperty.Detected]: boolean;
  [ClassifierProperty.Detections]: ClassifierDetection[];
  [ClassifierProperty.Labels]: string[];
}

/** Read-only proxy interface for a classifier sensor. */
export interface ClassifierSensorLike extends SensorLike {
  /** Sensor type discriminant. */
  readonly type: SensorType.Classifier;
  /** Property change observable narrowed to classifier properties. */
  readonly onPropertyChanged: Observable<PropertyChangeOf<ClassifierSensorProperties>>;

  getValue(property: ClassifierProperty.Detected): boolean | undefined;
  getValue(property: ClassifierProperty.Detections): ClassifierDetection[] | undefined;
  getValue(property: ClassifierProperty.Labels): string[] | undefined;
  getValue(property: string): unknown;
}

/**
 * General-purpose image classifier sensor.
 *
 * Plugin authors call `reportDetections(list)` to push classification results.
 * `detected` and `labels` are auto-derived from the detection list.
 */
export class ClassifierSensor<TStorage extends object = Record<string, any>> extends Sensor<ClassifierSensorProperties, TStorage> {
  readonly type = SensorType.Classifier;
  readonly category = SensorCategory.Sensor;

  _requiresFrames = false;

  constructor(name = 'Classifier') {
    super(name);

    this._writeState({
      [ClassifierProperty.Detected]: false,
      [ClassifierProperty.Detections]: [],
      [ClassifierProperty.Labels]: [],
    });
  }

  /** Whether any classification result is active. */
  get detected(): boolean {
    return this.props.detected;
  }

  /** Current detection list. */
  get detections(): ClassifierDetection[] {
    return this.props.detections;
  }

  /** Unique labels of the current detections. */
  get labels(): string[] {
    return this.props.labels;
  }

  /**
   * Report classification results. Auto-derives `detected` and `labels` from the list.
   *
   * - `reportDetections(true)` — generic classification trigger. The SDK
   *   synthesizes a single full-frame detection with empty attribute/subAttribute.
   * - `reportDetections(true, [...])` — explicit classifier detections.
   * - `reportDetections(false)` — clear.
   *
   * @param detected - Whether any classification result is active.
   *
   * @param detections - Optional explicit classifier detections to publish.
   *
   * @example
   * ```ts
   * import type { ClassifierDetection } from '@camera.ui/sdk';
   * sensor.reportDetections(true, [
   *   {
   *     label: 'animal',
   *     confidence: 0.88,
   *     box: { x: 0.1, y: 0.2, width: 0.3, height: 0.4 },
   *     attribute: 'bird',
   *     subAttribute: 'woodpecker',
   *   } satisfies ClassifierDetection,
   * ]);
   * sensor.reportDetections(false);
   * ```
   */
  reportDetections(detected: boolean, detections?: ClassifierDetection[]): void {
    const list = this._normalizeReportedDetections<ClassifierDetection>(detected, detections, 'motion', { attribute: '', subAttribute: '' });
    const labels = Array.from(new Set(list.map((d) => d.label)));
    this._writeState({
      [ClassifierProperty.Detected]: detected,
      [ClassifierProperty.Detections]: list,
      [ClassifierProperty.Labels]: labels,
    });
  }

  /**
   * Explicitly clear classifier state (detected = false, detections = [], labels = []).
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
   * Read-only sensor: external writes are ignored. State is reported via `reportDetections`.
   *
   * Called by the cross-process plugin host when a generic property write is received.
   * Classifier sensors have no externally writable properties, so the parameters are
   * unused (underscore-prefixed) and the call is a no-op.
   *
   * @param _property - Unused — classifier sensors expose no writable properties.
   *
   * @param _value - Unused — classifier sensors expose no writable properties.
   *
   * @internal
   */
  updateValue(_property: string, _value: unknown): void {
    // No-op — classifier state is reported by the plugin, not set externally.
  }
}

/** Return type for {@link ClassifierDetectorSensor.detectClassifications}. */
export interface ClassifierResult {
  /** Whether any classification result is emitted for this frame. */
  detected: boolean;
  /** Detections emitted for this frame. */
  detections: ClassifierDetection[];
}

/**
 * Classifier detector that receives video frames from the backend pipeline.
 * Extend this class and implement {@link detectClassifications} to run image
 * classification models against trigger regions.
 */
export abstract class ClassifierDetectorSensor<TStorage extends object = Record<string, any>> extends ClassifierSensor<TStorage> {
  override _requiresFrames = true;

  /** Declares the expected input dimensions and trigger labels. */
  abstract get modelSpec(): ModelSpec;

  /**
   * Classify frames in batch. Each frame is a pre-cropped, pre-scaled
   * trigger region produced by the upstream object detector. Must return
   * exactly one ClassifierResult per input frame, in the same order.
   */
  abstract detectClassifications(frames: VideoFrameData[]): Promise<ClassifierResult[]>;
}
