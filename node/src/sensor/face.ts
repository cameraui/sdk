import { Sensor, SensorType, SensorCategory } from './base.js';
import { defineSensor } from './meta.js';

import type { Observable } from '../observable/index.js';
import type { PropertyChangeOf, SensorLike } from './base.js';
import type { Detection, VideoFrameData } from './detection.js';
import type { ModelSpec } from './spec.js';

/**
 * Property names of a face detection sensor.
 *
 * @internal
 */
export enum FaceProperty {
  /** Whether any face is currently detected. */
  Detected = 'detected',
  /** List of detected faces with optional identity, embedding, and thumbnail. */
  Detections = 'detections',
}

/** A face detection result, extending {@link Detection} with face-specific fields. */
export interface FaceDetection extends Detection {
  /** Sub-detection attribute, fixed to `'face'`. */
  attribute: 'face';
  /** Recognized identity name, if matched against known faces. */
  identity?: string;
  /** Face embedding vector for recognition/comparison. */
  embedding?: number[];
  /** JPEG thumbnail crop of the detected face. */
  thumbnail?: Uint8Array;
}

/**
 * Property shape carried by a {@link FaceSensor}.
 *
 * @internal
 */
export interface FaceSensorProperties {
  [FaceProperty.Detected]: boolean;
  [FaceProperty.Detections]: FaceDetection[];
}

/** Read-only proxy interface for a face sensor. */
export interface FaceSensorLike extends SensorLike {
  /** Sensor type discriminant. */
  readonly type: SensorType.Face;
  /** Property change observable narrowed to face properties. */
  readonly onPropertyChanged: Observable<PropertyChangeOf<FaceSensorProperties>>;

  getValue(property: FaceProperty.Detected): boolean | undefined;
  getValue(property: FaceProperty.Detections): FaceDetection[] | undefined;
  getValue(property: string): unknown;
}

/**
 * Face sensor that reports detected faces and optional identity matches.
 *
 * Plugin authors call `reportDetections(list)` to push detected faces.
 * `detected` is auto-derived from the detection list.
 */
export class FaceSensor<TStorage extends object = Record<string, any>> extends Sensor<FaceSensorProperties, TStorage> {
  readonly type = SensorType.Face;
  readonly category = SensorCategory.Sensor;

  constructor(name = 'Face Sensor') {
    super(name);

    this._writeState({
      [FaceProperty.Detected]: false,
      [FaceProperty.Detections]: [],
    });
  }

  /** Whether any face is currently detected. */
  get detected(): boolean {
    return this.props.detected;
  }

  /** Current detection list. */
  get detections(): FaceDetection[] {
    return this.props.detections;
  }

  /**
   * Report detected faces.
   *
   * - `reportDetections(true)` — face detected without specifics (e.g. a
   *   bare face-event from a discovery provider). The SDK synthesizes a
   *   single full-frame face detection without identity.
   * - `reportDetections(true, [...])` — explicit face detections with
   *   identity, embedding, and/or thumbnail.
   * - `reportDetections(false)` — clear.
   *
   * @param detected - Whether any face is currently detected.
   *
   * @param detections - Optional explicit face detections to publish.
   *
   * @example
   * ```ts
   * import type { FaceDetection } from '@camera.ui/sdk';
   * sensor.reportDetections(true, [
   *   {
   *     label: 'person',
   *     confidence: 0.94,
   *     box: { x: 0.4, y: 0.2, width: 0.15, height: 0.25 },
   *     attribute: 'face',
   *     identity: 'Alice',
   *   } satisfies FaceDetection,
   * ]);
   * sensor.reportDetections(false);
   * ```
   */
  reportDetections(detected: boolean, detections?: FaceDetection[]): void {
    const list = this._normalizeReportedDetections<FaceDetection>(detected, detections, 'person', { attribute: 'face' });
    this._writeState({
      [FaceProperty.Detected]: detected,
      [FaceProperty.Detections]: list,
    });
  }

  /**
   * Explicitly clear face detection state (detected = false, detections = []).
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
   * Face sensors have no externally writable properties, so the parameters are
   * unused (underscore-prefixed) and the call is a no-op.
   *
   * @param _property - Unused — face sensors expose no writable properties.
   *
   * @param _value - Unused — face sensors expose no writable properties.
   *
   * @internal
   */
  updateValue(_property: string, _value: unknown): void {
    // No-op — face detection state is reported by the plugin, not set externally.
  }
}

/** Return type for {@link FaceDetectorSensor.detectFaces}. */
export interface FaceResult {
  /** Whether any face is detected in this frame. */
  detected: boolean;
  /** Detections emitted for this frame. */
  detections: FaceDetection[];
}

/**
 * Face detector that receives video frames from the backend pipeline.
 * Extend this class and implement {@link detectFaces} for face detection
 * and recognition.
 */
export abstract class FaceDetectorSensor<TStorage extends object = Record<string, any>> extends FaceSensor<TStorage> {
  _requiresFrames = true;

  /** Declares the expected input dimensions and trigger labels. The backend scales frames to match. */
  abstract get modelSpec(): ModelSpec;

  /**
   * Detect faces in batch. Each frame is pre-scaled to `modelSpec.input`:
   * normally a person region cropped by the upstream object detector, but the
   * whole scene when no decoded frame is available. Must return exactly one
   * FaceResult per input frame, in the same order.
   */
  abstract detectFaces(frames: VideoFrameData[]): Promise<FaceResult[]>;
}

/** Registry metadata for {@link FaceSensor}. */
export const faceMeta = defineSensor({
  type: SensorType.Face,
  category: SensorCategory.Sensor,
  assignmentKey: 'face',
  multiProvider: false,
  isDetectionType: true,
  properties: {
    [FaceProperty.Detected]: { type: 'boolean' },
    [FaceProperty.Detections]: { type: 'object', internal: true },
  },
  semantics: null,
});
