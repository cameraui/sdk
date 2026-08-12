import type { DetectionLabel } from '../sensor/detection.js';
import type { LineDirection, MotionResolution, Point, ZoneFilter, ZoneType } from './enums.js';

/** Sensor trigger settings (contact, doorbell, switch, light, etc.). */
export interface SensorTriggerSettings {
  /** Sensor trigger timeout in seconds. */
  timeout: number;
  /** Sensor entity ids that also trigger the detection cascade (in addition to motion/audio). */
  triggers: string[];
}

/**
 * Detection line configuration.
 * Defines a virtual tripwire for line crossing detection.
 * The two points define grab-handle positions; the actual crossing line
 * is perpendicular through their midpoint.
 */
export interface DetectionLine {
  /** Line display name. */
  name: string;
  /** Grab-handle positions (0-100%). Crossing line is perpendicular through midpoint. */
  points: [Point, Point];
  /** Which crossing direction(s) trigger events. */
  direction: LineDirection;
  /** Labels to filter (empty = all labels). */
  labels: DetectionLabel[];
  /** Line display color (hex). */
  color: string;
}

/**
 * Detection zone configuration.
 * Defines areas that restrict or drop detections.
 */
export interface DetectionZone {
  /** Zone display name. */
  name: string;
  /** Polygon points (0-100 percentage coordinates). */
  points: Point[];
  /** Intersection detection type. */
  type: ZoneType;
  /** Include/exclude filter mode. */
  filter: ZoneFilter;
  /** Labels to filter (empty = all labels). */
  labels: DetectionLabel[];
  /** Whether this is an ignore zone: detections fully inside it are dropped. */
  isPrivacyMask: boolean;
  /** Zone display color (hex). */
  color: string;
}

/** Motion detection settings. */
export interface MotionDetectionSettings {
  /** Detection resolution quality. */
  resolution: MotionResolution;
  /** Motion dwell time in seconds. */
  timeout: number;
}

/** Object detection settings. */
export interface ObjectDetectionSettings {
  /** Minimum confidence threshold (0.3 - 1.0). */
  confidence: number;
  /** Object labels to detect (empty = all). Detections with other labels are dropped. */
  labels?: DetectionLabel[];
  /** Suppress events from objects that stay stationary across events (e.g. parked cars). Defaults to true. */
  suppressStatic?: boolean;
  /**
   * Object dwell time in seconds for camera-based object sensors that report a detection
   * without a matching end report. Frame-based detection ignores this. Defaults to 15.
   */
  timeout?: number;
}

/** Audio detection settings. */
export interface AudioDetectionSettings {
  /** Minimum volume threshold in dBFS (-100 to 0). Audio below this level is skipped. */
  minDecibels: number;
  /** Audio dwell time in seconds. */
  timeout: number;
  /** Minimum confidence threshold (0 - 1) for a labelled audio detection to count. */
  confidence?: number;
}

/** Face detection settings. */
export interface FaceDetectionSettings {
  /** Minimum confidence threshold (0 - 1) for a face to count. */
  confidence?: number;
}

/** License plate detection settings. */
export interface LicensePlateDetectionSettings {
  /** Minimum text recognition confidence (0 - 1) for a plate read to count. */
  confidence?: number;
  /** Minimum plate text length, shorter reads are dropped as fragments. */
  minLength?: number;
}

/** PTZ autotracking settings: the camera follows detected objects automatically. */
export interface PtzAutotrackSettings {
  /** Whether PTZ autotracking is enabled. */
  enabled: boolean;
  /** Object labels to track (e.g. 'person', 'vehicle'). */
  targetLabels: string[];
  /** Minimum detection confidence to track (0.3 - 1.0). */
  minConfidence: number;
  /** Dead zone around frame center (0 - 0.3). No motor command while the target is inside this zone. */
  triggerDeadZone: number;
  /**
   * How aggressively the camera moves to re-center the target (1 - 5). Higher
   * reaches full pan/tilt speed at a smaller off-center error.
   */
  trackingSpeed: number;
  /**
   * Motion prediction (0 - 4000): aim this many milliseconds ahead along the
   * target's measured velocity, covering the time the camera needs to move and
   * settle. 0 disables prediction.
   */
  leadMs: number;
  /**
   * Camera pan-rate calibration (0.1 - 3): assumed pan travel at full motor
   * speed in normalized frame-widths per second. Lower it if the camera stops
   * short of the target, raise it if it overshoots.
   */
  panRate: number;
  /** Return to home position when no target is found for homeWaitMs. */
  returnToHome: boolean;
  /** How long to wait (ms) without a target before returning home. */
  homeWaitMs: number;
}

/** Combined detection settings for a camera. */
export interface CameraDetectionSettings {
  /** Motion detection settings. */
  motion: MotionDetectionSettings;
  /** Object detection settings. */
  object: ObjectDetectionSettings;
  /** Audio detection settings. */
  audio: AudioDetectionSettings;
  /** Face detection settings. */
  face?: FaceDetectionSettings;
  /** License plate detection settings. */
  licensePlate?: LicensePlateDetectionSettings;
  /** Sensor trigger settings. */
  sensor: SensorTriggerSettings;
  /** Whether the detection cascade is enabled. */
  cascadeDetection?: boolean;
  /** Cascade hold-open window in seconds. */
  cascadeTimeout?: number;
  /** Whether detections are snoozed (paused). */
  snooze?: boolean;
}
