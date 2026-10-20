import { Sensor, SensorType, SensorCategory } from './base.js';
import { defineSensor } from './meta.js';

import type { Observable } from '../observable/index.js';
import type { PropertyChangeOf, SensorLike, SensorOptions } from './base.js';
import type { Detection, VideoFrameData } from './detection.js';
import type { ModelSpec } from './spec.js';

/** @internal */
export enum FaceProperty {
  /** Whether any face is currently detected. */
  Detected = 'detected',
  /** List of detected faces, with an identity where one was matched. The plugin that owns the sensor does not get the backend's updates of it. */
  Detections = 'detections',
  /** Names of the faces recognized during the active detection phase. */
  Identities = 'identities',
}

/** A face detection result, extending {@link Detection} with face-specific fields. */
export interface FaceDetection extends Detection {
  /** Sub-detection attribute, fixed to `'face'`. */
  attribute: 'face';
  /** Recognized identity name, filled in by the NVR after matching. */
  identity?: string;
}

/** @internal */
export interface FaceSensorProperties {
  [FaceProperty.Detected]: boolean;
  [FaceProperty.Detections]: FaceDetection[];
  [FaceProperty.Identities]: string[];
}

/** Read-only proxy interface for a face sensor. */
export interface FaceSensorLike extends SensorLike {
  readonly type: SensorType.Face;
  readonly onPropertyChanged: Observable<PropertyChangeOf<FaceSensorProperties>>;

  getValue(property: FaceProperty.Detected): boolean | undefined;
  getValue(property: FaceProperty.Detections): FaceDetection[] | undefined;
  getValue(property: FaceProperty.Identities): string[] | undefined;
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

  constructor(name = 'Face Sensor', options?: SensorOptions) {
    super(name, options);

    this._writeState({
      [FaceProperty.Detected]: false,
      [FaceProperty.Detections]: [],
      [FaceProperty.Identities]: [],
    });
  }

  get detected(): boolean {
    return this.props.detected;
  }

  get detections(): FaceDetection[] {
    return this.props.detections;
  }

  get identities(): string[] {
    return this.props.identities;
  }

  /**
   * Report detected faces.
   *
   * - `reportDetections(true)`: face detected without specifics (e.g. a
   *   bare face-event from a discovery provider). The SDK synthesizes a
   *   single full-frame face detection without identity.
   * - `reportDetections(true, [...])`: explicit face detections, with an
   *   identity where the plugin recognizes the face itself.
   * - `reportDetections(false)`: clear.
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
    // names accumulate while faces stay visible, so automations don't flap on a missed match
    const recognized = list.map((d) => d.identity).filter((identity): identity is string => Boolean(identity));
    let identities: string[] | undefined;
    if (!detected) {
      identities = [];
    } else if (recognized.length > 0) {
      identities = [...new Set([...this.props.identities, ...recognized])].sort();
    }
    this._writeState({
      [FaceProperty.Detected]: detected,
      [FaceProperty.Detections]: list,
      ...(identities ? { [FaceProperty.Identities]: identities } : {}),
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

  /** @internal */
  updateValue(_property: string, _value: unknown): void {}
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
    [FaceProperty.Identities]: { type: 'object' },
  },
  semantics: null,
});
