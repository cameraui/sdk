import { Sensor, SensorType, SensorCategory } from './base.js';
import { defineSensor } from './meta.js';

import type { Observable } from '../observable/index.js';
import type { PropertyChangeOf, SensorLike } from './base.js';
import type { Detection, DetectionLabel, VideoFrameData } from './detection.js';
import type { ObjectModelSpec } from './spec.js';

/**
 * Property names of an object detection sensor.
 *
 * @internal
 */
export enum ObjectProperty {
  /** Whether any object is currently detected. */
  Detected = 'detected',
  /** List of detected objects with labels and bounding boxes. */
  Detections = 'detections',
  /** Unique labels of the current detections (auto-derived when reporting detections). */
  Labels = 'labels',
}

/** Detection enriched with tracking metadata (stable IDs, velocity). */
export interface TrackedDetection extends Detection {
  /** Stable sequential ID for this object across frames. */
  trackId?: number;
  /** Number of frames this object has been continuously tracked. */
  trackAge?: number;
  /** Velocity magnitude in normalized units per frame. 0 = stationary. */
  trackSpeed?: number;
  /**
   * Signed centroid velocity vector in normalized units per frame.
   * Positive x = moving right, positive y = moving down. Consumers doing
   * motion prediction (PTZ autotrack, trajectory estimation) should use
   * this instead of deriving velocity from frame-to-frame position deltas.
   */
  trackVelocity?: { x: number; y: number };
  /** True if the object was not matched in the current frame. */
  trackLost?: boolean;
}

/**
 * Property shape carried by an {@link ObjectSensor}.
 *
 * @internal
 */
export interface ObjectSensorProperties {
  [ObjectProperty.Detected]: boolean;
  [ObjectProperty.Detections]: TrackedDetection[];
  [ObjectProperty.Labels]: DetectionLabel[];
}

/** Read-only proxy interface for an object detection sensor. */
export interface ObjectSensorLike extends SensorLike {
  /** Sensor type discriminant. */
  readonly type: SensorType.Object;
  /** Property change observable narrowed to object properties. */
  readonly onPropertyChanged: Observable<PropertyChangeOf<ObjectSensorProperties>>;

  getValue(property: ObjectProperty.Detected): boolean | undefined;
  getValue(property: ObjectProperty.Detections): TrackedDetection[] | undefined;
  getValue(property: ObjectProperty.Labels): DetectionLabel[] | undefined;
  getValue(property: string): unknown;
}

/**
 * Object detection sensor that reports detected objects (person, vehicle, animal, etc.).
 *
 * Plugin authors call `reportDetections(list)` to push detection results.
 * `detected` and `labels` are auto-derived from the detection list.
 */
export class ObjectSensor<TStorage extends object = Record<string, any>> extends Sensor<ObjectSensorProperties, TStorage> {
  readonly type = SensorType.Object;
  readonly category = SensorCategory.Sensor;

  _requiresFrames = false;

  constructor(name = 'Object Sensor') {
    super(name);

    this._writeState({
      [ObjectProperty.Detected]: false,
      [ObjectProperty.Detections]: [],
      [ObjectProperty.Labels]: [],
    });
  }

  /** Whether any object is currently detected. */
  get detected(): boolean {
    return this.props.detected;
  }

  /** Current detection list. */
  get detections(): TrackedDetection[] {
    return this.props.detections;
  }

  /** Unique labels of the current detections. */
  get labels(): DetectionLabel[] {
    return this.props.labels;
  }

  /**
   * Report detected objects. Auto-derives `detected` and `labels` from the list.
   *
   * - `reportDetections(true)` — something detected without specific data. The SDK
   *   synthesizes a single full-frame `'motion'` detection as a generic fallback.
   * - `reportDetections(true, [...])` — explicit detections (typical case).
   * - `reportDetections(false)` — clear.
   *
   * @param detected - Whether any object is currently detected.
   *
   * @param detections - Optional explicit object detections (with optional tracking metadata).
   *
   * @example
   * ```ts
   * import type { TrackedDetection } from '@camera.ui/sdk';
   * sensor.reportDetections(true, [
   *   {
   *     label: 'person',
   *     confidence: 0.92,
   *     box: { x: 0.1, y: 0.2, width: 0.3, height: 0.4 },
   *   } satisfies TrackedDetection,
   * ]);
   * sensor.reportDetections(false);
   * ```
   */
  reportDetections(detected: boolean, detections?: TrackedDetection[]): void {
    const list = this._normalizeReportedDetections<TrackedDetection>(detected, detections, 'motion');
    const labels = Array.from(new Set(list.map((d) => d.label)));
    this._writeState({
      [ObjectProperty.Detected]: detected,
      [ObjectProperty.Detections]: list,
      [ObjectProperty.Labels]: labels,
    });
  }

  /**
   * Explicitly clear detection state (detected = false, detections = [], labels = []).
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
   * Object detection sensors have no externally writable properties, so the parameters are
   * unused (underscore-prefixed) and the call is a no-op.
   *
   * @param _property - Unused — object detection sensors expose no writable properties.
   *
   * @param _value - Unused — object detection sensors expose no writable properties.
   *
   * @internal
   */
  updateValue(_property: string, _value: unknown): void {
    // No-op — object detection state is reported by the plugin, not set externally.
  }
}

/** Return type for {@link ObjectDetectorSensor.detectObjects}. */
export interface ObjectResult {
  /** Whether any object is detected in this frame. */
  detected: boolean;
  /** Detections emitted for this frame. */
  detections: TrackedDetection[];
}

/**
 * Object detector that receives video frames from the backend pipeline.
 * Extend this class and implement {@link detectObjects} and {@link modelSpec}.
 * The backend scales frames to match `modelSpec.input` dimensions before
 * each call.
 */
export abstract class ObjectDetectorSensor<TStorage extends object = Record<string, any>> extends ObjectSensor<TStorage> {
  override _requiresFrames = true;

  /** Declares the expected input dimensions. The backend scales frames to match. */
  abstract get modelSpec(): ObjectModelSpec;

  /** Analyze a single video frame for objects. Called by the backend at the configured interval. */
  abstract detectObjects(frame: VideoFrameData): Promise<ObjectResult>;
}

/** Registry metadata for {@link ObjectSensor}. */
export const objectMeta = defineSensor({
  type: SensorType.Object,
  category: SensorCategory.Sensor,
  assignmentKey: 'object',
  multiProvider: false,
  isDetectionType: true,
  properties: {
    [ObjectProperty.Detected]: { type: 'boolean' },
    [ObjectProperty.Detections]: { type: 'object', internal: true },
    [ObjectProperty.Labels]: { type: 'object' },
  },
  semantics: null,
});
