import { Sensor, SensorType, SensorCategory } from './base.js';
import { defineSensor } from './meta.js';

import type { Observable } from '../observable/index.js';
import type { PropertyChangeOf, SensorLike, SensorOptions } from './base.js';
import type { Detection, VideoFrameData } from './detection.js';

/**
 * Property names of a motion sensor.
 *
 * @internal
 */
export enum MotionProperty {
  /** Whether motion is currently detected. */
  Detected = 'detected',
  /** List of detection results with bounding boxes. */
  Detections = 'detections',
  /** When true, detection updates are suppressed (set by the backend dwell logic). */
  Blocked = 'blocked',
  /** Timestamp in milliseconds of the last detection trigger, set by the backend. */
  LastTriggered = 'lastTriggered',
}

/**
 * Property values of a motion sensor.
 *
 * @internal
 */
export interface MotionSensorProperties {
  [MotionProperty.Detected]: boolean;
  [MotionProperty.Detections]: Detection[];
  [MotionProperty.Blocked]: boolean;
}

/** Read-only proxy interface for a motion sensor. */
export interface MotionSensorLike extends SensorLike {
  readonly type: SensorType.Motion;
  readonly onPropertyChanged: Observable<PropertyChangeOf<MotionSensorProperties>>;

  getValue(property: MotionProperty.Detected): boolean | undefined;
  getValue(property: MotionProperty.Detections): Detection[] | undefined;
  getValue(property: MotionProperty.Blocked): boolean | undefined;
  getValue(property: string): unknown;
}

/**
 * Motion sensor that reports motion state and detection results.
 *
 * Plugin authors call `reportDetections(list)` to push detection results.
 * `detected` is auto-derived from the detection list. `blocked` is read-only and
 * set by the backend dwell logic, `reportDetections()` is a no-op while it is set.
 */
export class MotionSensor<TStorage extends object = Record<string, any>> extends Sensor<MotionSensorProperties, TStorage> {
  readonly type = SensorType.Motion;
  readonly category = SensorCategory.Sensor;

  override _requiresFrames = false;

  constructor(name = 'Motion Sensor', options?: SensorOptions) {
    super(name, options);

    this._writeState({
      [MotionProperty.Detected]: false,
      [MotionProperty.Detections]: [],
      [MotionProperty.Blocked]: false,
    });
  }

  get detected(): boolean {
    return this.props.detected;
  }

  get detections(): Detection[] {
    return this.props.detections;
  }

  get blocked(): boolean {
    return this.props.blocked;
  }

  /**
   * Report a motion detection result.
   *
   * - `reportDetections(true)`: motion detected without bbox (e.g. Ring camera).
   *   The SDK synthesizes a single full-frame `'motion'` detection.
   * - `reportDetections(true, [...])`: motion detected with explicit detections.
   * - `reportDetections(false)`: no motion (clears detections).
   *
   * No-op while the sensor is blocked by backend dwell logic.
   *
   * @param detected - Whether motion is currently detected.
   *
   * @param detections - Optional explicit detections produced for this frame.
   *
   * @example
   * ```ts
   * import type { Detection } from '@camera.ui/sdk';
   * sensor.reportDetections(true, [
   *   { label: 'motion', confidence: 0.85, box: { x: 0.1, y: 0.2, width: 0.3, height: 0.4 } } satisfies Detection,
   * ]);
   * sensor.reportDetections(false);
   * ```
   */
  reportDetections(detected: boolean, detections?: Detection[]): void {
    if (this.blocked) return;
    const list = this._normalizeReportedDetections(detected, detections, 'motion');
    this._writeState({
      [MotionProperty.Detected]: detected,
      [MotionProperty.Detections]: list,
    });
  }

  /**
   * Explicitly clear motion state (detected = false, detections = []).
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

/** Return type for {@link MotionDetectorSensor.detectMotion}. */
export interface MotionResult {
  /** Whether motion is detected in this frame. Ignored by the backend, which re-derives it from the detections. */
  detected: boolean;
  /** Detections emitted for this frame. */
  detections: Detection[];
}

/**
 * Motion detector that receives video frames from the backend pipeline.
 * Extend this class and implement {@link detectMotion} to analyze frames
 * for motion. The backend calls `detectMotion()` at the configured frame
 * interval, zone-filters the returned detections and applies them.
 * `detected` is re-derived from the surviving detections, so a result with
 * no detections reports no motion.
 */
export abstract class MotionDetectorSensor<TStorage extends object = Record<string, any>> extends MotionSensor<TStorage> {
  override _requiresFrames = true;

  /** Analyze a single video frame for motion. Called by the backend at the configured interval. */
  abstract detectMotion(frame: VideoFrameData): Promise<MotionResult>;
}

/** Registry metadata for {@link MotionSensor}. */
export const motionMeta = defineSensor({
  type: SensorType.Motion,
  category: SensorCategory.Sensor,
  assignmentKey: 'motion',
  multiProvider: false,
  isDetectionType: true,
  properties: {
    [MotionProperty.Detected]: { type: 'boolean' },
    [MotionProperty.Detections]: { type: 'object', internal: true },
    [MotionProperty.Blocked]: { type: 'boolean', internal: true },
    [MotionProperty.LastTriggered]: { type: 'number', internal: true },
  },
  semantics: null,
});
