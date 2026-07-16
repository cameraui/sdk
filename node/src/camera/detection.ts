import type { SensorType } from '../sensor/base.js';
import type { DetectionLabel } from '../sensor/detection.js';
import type { LineDirection, MotionResolution, Point, ZoneFilter, ZoneType } from './enums.js';

/**
 * Stable reference to a sensor for cascade trigger configuration.
 * Uses composite key (sensorType + sensorName + pluginId) instead of UUID
 * so references survive plugin restarts.
 */
export interface SensorTriggerRef {
  /** Sensor type (e.g. 'contact', 'doorbell') */
  sensorType: SensorType;
  /** Sensor name (stable across restarts) */
  sensorName: string;
  /** Plugin ID that provides this sensor */
  pluginId: string;
}

/**
 * Sensor trigger settings (contact, doorbell, switch, light, etc.).
 */
export interface SensorTriggerSettings {
  /** Sensor trigger timeout in seconds */
  timeout: number;
  /** Sensors that also trigger the detection cascade (in addition to motion/audio) */
  triggers: SensorTriggerRef[];
}

/**
 * Detection line configuration.
 * Defines a virtual tripwire for line crossing detection.
 * The two points define grab-handle positions; the actual crossing line
 * is perpendicular through their midpoint.
 */
export interface DetectionLine {
  /** Line display name */
  name: string;
  /** Grab-handle positions (0–100%). Crossing line is perpendicular through midpoint. */
  points: [Point, Point];
  /** Which crossing direction(s) trigger events */
  direction: LineDirection;
  /** Labels to filter (empty = all labels) */
  labels: DetectionLabel[];
  /** Line display color (hex) */
  color: string;
}

/**
 * Detection zone configuration.
 * Defines areas that restrict or drop detections.
 */
export interface DetectionZone {
  /** Zone display name */
  name: string;
  /** Polygon points (0-100 percentage coordinates) */
  points: Point[];
  /** Intersection detection type */
  type: ZoneType;
  /** Include/exclude filter mode */
  filter: ZoneFilter;
  /** Labels to filter (empty = all labels) */
  labels: DetectionLabel[];
  /** Whether this is an ignore zone: detections fully inside it are dropped. */
  isPrivacyMask: boolean;
  /** Zone display color (hex) */
  color: string;
}

/**
 * Motion detection settings.
 */
export interface MotionDetectionSettings {
  /** Detection resolution quality */
  resolution: MotionResolution;
  /** Motion dwell time in seconds */
  timeout: number;
}

/**
 * Object detection settings.
 */
export interface ObjectDetectionSettings {
  /** Minimum confidence threshold (0.3 - 1.0) */
  confidence: number;
  /** Suppress events from objects that stay stationary across events (e.g. parked cars). Defaults to true. */
  suppressStatic?: boolean;
}

/**
 * Audio detection settings.
 */
export interface AudioDetectionSettings {
  /** Minimum volume threshold in dBFS (-100 to 0). Audio below this level is skipped. */
  minDecibels: number;
  /** Audio dwell time in seconds */
  timeout: number;
}

/**
 * PTZ autotracking settings — automatically follow detected objects.
 */
export interface PtzAutotrackSettings {
  /** Whether PTZ autotracking is enabled */
  enabled: boolean;
  /** Object labels to track (e.g. 'person', 'vehicle') */
  targetLabels: string[];
  /** Minimum detection confidence to track (0.3 - 1.0) */
  minConfidence: number;
  /**
   * Dead zone around frame center. While the target is inside this zone,
   * no motor command is issued. Range 0 - 0.3.
   */
  triggerDeadZone: number;
  /**
   * How aggressively the camera moves to re-center the target. Higher reaches
   * full pan/tilt speed at a smaller off-center error. Range 1 - 5.
   */
  trackingSpeed: number;
  /**
   * Motion prediction: aim this many milliseconds ahead along the target's
   * measured velocity, covering the time the camera needs to move and settle.
   * 0 disables prediction. Range 0 - 4000.
   */
  leadMs: number;
  /**
   * Camera pan-rate calibration — assumed pan travel at full motor speed, in
   * normalized frame-widths per second. Lower it if the camera stops short of
   * the target, raise it if it overshoots. Range 0.1 - 3.
   */
  panRate: number;
  /** Return to home position when no target is found for homeWaitMs */
  returnToHome: boolean;
  /** How long to wait (ms) without a target before returning home */
  homeWaitMs: number;
}

/**
 * Combined detection settings for a camera.
 */
export interface CameraDetectionSettings {
  /** Motion detection settings */
  motion: MotionDetectionSettings;
  /** Object detection settings */
  object: ObjectDetectionSettings;
  /** Audio detection settings */
  audio: AudioDetectionSettings;
  /** Sensor trigger settings */
  sensor: SensorTriggerSettings;
  /** Whether the detection cascade is enabled */
  cascadeDetection?: boolean;
  /** Cascade hold-open window in seconds */
  cascadeTimeout?: number;
  /** Whether detections are snoozed (paused) */
  snooze?: boolean;
}
