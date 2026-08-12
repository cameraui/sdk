import type { DetectionEventState, EventTriggerType } from './enums.js';

/** All event trigger types as a runtime-accessible array. */
export const EVENT_TRIGGER_TYPES = [
  'motion',
  'audio',
  'contact',
  'doorbell',
  'switch',
  'light',
  'siren',
  'security_system',
  'line-crossing',
  'occupancy',
  'smoke',
  'leak',
  'gas',
  'carbonMonoxide',
  'heat',
  'cold',
  'vibration',
  'tamper',
  'problem',
  'power',
  'lock',
  'garage',
] as const satisfies readonly EventTriggerType[];

/** Event trigger (motion, audio, sensor, or line-crossing). */
export interface EventTrigger {
  /** Trigger type. */
  type: EventTriggerType;
  /** Audio label (e.g. "doorbell", "glass_break"). */
  label?: string;
  /** Best confidence score. */
  score?: number;
  /** First detection time (Unix ms). */
  firstSeen: number;
  /** Last detection time (Unix ms). */
  lastSeen: number;
  /** Name of the crossed line (only for line-crossing triggers). */
  lineName?: string;
  /** Crossing direction (only for line-crossing triggers). */
  crossingDirection?: 'a-to-b' | 'b-to-a';
  /** Track ID of the object that crossed (only for line-crossing triggers). */
  trackId?: number;
}

/** Aggregated object detection within a segment. */
export interface EventDetection {
  /** Detection label (e.g. "person", "car"). */
  label: string;
  /** Best confidence score. */
  score: number;
  /** Maximum simultaneous count in a single frame. */
  maxCount: number;
  /** Whether the object was moving (true) or stationary (false). */
  moving?: boolean;
  /** Where the tracked object entered and left the frame within this segment. */
  path?: DetectionPath;
  /** Names of detection/alert zones any object of this label overlapped during the segment. */
  zones?: string[];
}

/** Normalized box centers (0-1) of a tracked object's first and last sighting in a segment. */
export interface DetectionPath {
  enterX: number;
  enterY: number;
  exitX: number;
  exitY: number;
}

/** Unified attribute within a segment (face identity, license plate, classifier result). */
export interface EventAttribute {
  /** Attribute type ('face', 'license_plate', or classifier-specific like 'bird'). */
  type: string;
  /** Identity name, plate text, or classification label. */
  label: string;
  /** Detection confidence (0-1). */
  confidence?: number;
}

/** A contiguous object detection phase within an event. */
export interface EventSegment {
  /** Segment start time (Unix ms). */
  firstSeen: number;
  /** Segment end time (Unix ms). */
  lastSeen: number;
  /** Object detections in this segment. */
  detections: EventDetection[];
  /** Unified attributes (faces, plates, classifications). */
  attributes: EventAttribute[];
  /** Names of detection zones any detection in this segment overlapped (deduplicated). */
  zones?: string[];
}

/**
 * Aggregated detection event with lifecycle (start -> update -> end).
 * Groups individual sensor detections into structured events.
 */
export interface DetectionEvent {
  /** Unique event ID. */
  id: string;
  /** Camera that produced this event. */
  cameraId: string;
  /** Event lifecycle state. */
  state: DetectionEventState;
  /** Event start time (Unix ms). */
  startTime: number;
  /** Event end time (Unix ms, only when ended). */
  endTime?: number;
  /** Last activity timestamp (Unix ms). */
  lastUpdate: number;
  /** Detection types present in this event (for filtering). */
  types: string[];
  /** Event triggers (motion/audio). */
  triggers: EventTrigger[];
  /**
   * Detection segments (object detection phases). For segment-* messages this
   * contains only the current segment, for start/end messages it is empty.
   */
  segments: EventSegment[];
  /** Index of the segment in segments[0] for segment-* messages. */
  segmentIndex?: number;
  /**
   * Expected event end time (Unix ms): the latest dwell expiry across all
   * currently-active triggers. Monotonically non-decreasing during the event
   * lifetime. Updated on each `update` / `segment-*` message.
   */
  expectedEndTime?: number;
}
