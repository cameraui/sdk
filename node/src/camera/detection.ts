import type { DetectionAttribute, DetectionLabel } from '../sensor/detection.js';
import type { LineDirection, MotionResolution, Point, ZoneType } from './enums.js';

/** Sensor trigger settings (contact, doorbell, switch, light, etc.). */
export interface SensorTriggerSettings {
  /** Sensor trigger timeout in seconds. */
  timeout: number;
  /** Sensor entity ids that also trigger the detection cascade (in addition to motion/audio). */
  triggers: string[];
}

/** What an object zone can list: a detection label, or an attribute that gates identification. */
export type ZoneLabel = DetectionLabel | DetectionAttribute;

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
 * Motion zone configuration.
 * Motion carries no labels, so a motion zone only says where frame motion
 * counts. No motion zone at all means motion counts everywhere.
 */
export interface MotionZone {
  /** Zone display name. */
  name: string;
  /** Polygon points (0-100 percentage coordinates). */
  points: Point[];
  /** Zone display color (hex). */
  color: string;
}

/**
 * Object zone configuration.
 * With at least one include object zone, an object counts only inside such a
 * zone and only when its label is listed there. No object zone means every
 * label counts everywhere.
 */
export interface ObjectZone {
  /** Zone display name. */
  name: string;
  /** Polygon points (0-100 percentage coordinates). */
  points: Point[];
  /** Intersection detection type. */
  type: ZoneType;
  /**
   * Labels that count in this zone. Besides the detection labels, `face` and
   * `license_plate` decide whether an object here is identified at all, so a
   * zone can watch a street without recognizing anyone on it.
   */
  labels: ZoneLabel[];
  /** Zone display color (hex). */
  color: string;
}

/**
 * Privacy zone configuration.
 * camera.ui always covers the area in live view, playback and the pictures it
 * generates; `dropDetections` decides whether detections inside are dropped
 * too or whether the camera keeps watching an area it does not show.
 */
export interface PrivacyZone {
  /** Zone display name. */
  name: string;
  /** Polygon points (0-100 percentage coordinates). */
  points: Point[];
  /** Whether detections inside are dropped as well. Default: true. */
  dropDetections: boolean;
}

/**
 * What to do with a picture whose privacy zones could not be applied, for
 * example on a pixel format we cannot write.
 * - `send` — ship it unmasked, the user sees it and can delete it
 * - `drop` — no picture at all rather than an unmasked one
 */
export type PrivacyFallback = 'send' | 'drop';

/**
 * Everything the zone editor draws, one list per purpose. Motion decides where
 * frame motion counts, object which types count where, privacy where nothing
 * is looked at, alert which types notify from where, and lines report objects
 * crossing them.
 */
export interface CameraZones {
  /** What happens to a picture the privacy zones could not be applied to. Default: send. */
  privacyFallback: PrivacyFallback;
  motion: MotionZone[];
  object: ObjectZone[];
  privacy: PrivacyZone[];
  alert: AlertZone[];
  lines: DetectionLine[];
}

/**
 * When an object counts as inside an alert zone.
 * - `anchor` — where the object stands (bottom center of its box)
 * - `intersect` — its box touches the zone
 * - `contain` — its box lies fully inside the zone
 */
export type AlertZoneMatch = 'anchor' | 'intersect' | 'contain';

/**
 * Alert zone configuration.
 * Never filters detections: a label selected here only sends push
 * notifications while an object of that label is inside the zone.
 */
export interface AlertZone {
  /** Zone display name. */
  name: string;
  /** Polygon points (0-100 percentage coordinates). */
  points: Point[];
  /** Labels that alert from inside this zone (empty = every label alerts here). */
  labels: DetectionLabel[];
  /**
   * Faces that may push from inside this zone. Undefined leaves faces out of the
   * decision, an empty list lets every recognized face push, otherwise only the
   * listed identities do. `unknown` covers everyone the recognition could not
   * name, including people whose face was never captured.
   */
  faces?: string[];
  /**
   * Plates that may push from inside this zone, same rules as {@link AlertZone.faces}.
   * Plates are OCR text, so the list is free-form rather than picked from a roster.
   */
  plates?: string[];
  /** When an object counts as inside. Default: contain. */
  match: AlertZoneMatch;
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
  /**
   * Minimum similarity (0 - 1) for a face to be recognized as an enrolled
   * person. Higher means fewer false matches, lower means more matches.
   */
  matchThreshold?: number;
}

/** License plate detection settings. */
export interface LicensePlateDetectionSettings {
  /** Minimum confidence threshold (0 - 1) for a plate to be found in the picture. */
  confidence?: number;
  /** Minimum text recognition confidence (0 - 1) for a plate read to count. */
  ocrConfidence?: number;
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
  /**
   * Smallest target to start following, as a fraction of the frame height
   * (0 - 0.5). Below it the object is too far away to be worth a move.
   * 0 disables the limit.
   */
  minTargetSize?: number;
  /**
   * Largest target to keep following, as a fraction of the frame height
   * (0 - 1). Above it the object is so close that the picture says nothing,
   * so the camera holds its position until it moves away again.
   * 0 disables the limit.
   */
  maxTargetSize?: number;
  /** Hours the camera is allowed to follow. Outside them autotracking rests. */
  activeHours?: TimeWindow;
}

/** A daily time window, given in the timezone it was configured in. */
export interface TimeWindow {
  /** Start time as "HH:mm". */
  from: string;
  /** End time as "HH:mm". A time before `from` wraps around midnight. */
  to: string;
  /** IANA timezone the times are read in, e.g. "Europe/Berlin". */
  timezone: string;
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
