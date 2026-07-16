/* eslint-disable @stylistic/max-len */
import type { BoundingBox } from '../sensor/detection.js';
import type { DetectionEventState, EventTriggerType } from './enums.js';

/** All event trigger types as a runtime-accessible array. */
export const EVENT_TRIGGER_TYPES = ['motion', 'audio', 'contact', 'doorbell', 'switch', 'light', 'siren', 'security_system', 'line-crossing'] as const;

/** AI-generated event description. */
export interface EventDescription {
  /** Brief title of what occurred */
  title: string;
  /** Chronological narrative of the scene */
  description: string;
  /** Two-sentence notification-friendly summary */
  summary: string;
  /** Threat level: 0 = normal, 1 = suspicious, 2 = threat */
  threatLevel: number;
}

/**
 * Event trigger (motion, audio, sensor, or line-crossing).
 */
export interface EventTrigger {
  /** Trigger type */
  type: EventTriggerType;
  /** Audio label (e.g. "doorbell", "glass_break") */
  label?: string;
  /** Best confidence score */
  score?: number;
  /** First detection time (Unix ms) */
  firstSeen: number;
  /** Last detection time (Unix ms) */
  lastSeen: number;
  /** Name of the crossed line (only for line-crossing triggers) */
  lineName?: string;
  /** Crossing direction (only for line-crossing triggers) */
  crossingDirection?: 'a-to-b' | 'b-to-a';
  /** Track ID of the object that crossed (only for line-crossing triggers) */
  trackId?: number;
}

/**
 * Aggregated object detection within a segment.
 */
export interface EventDetection {
  /** Detection label (e.g. "person", "car") */
  label: string;
  /** Best confidence score */
  score: number;
  /** Maximum simultaneous count in a single frame */
  maxCount: number;
  /** Bounding box of the highest-confidence detection (normalized 0–1) */
  box?: BoundingBox;
  /** Best-selected JPEG thumbnail crop. Only present on 'segment-start' and 'segment-end' messages, and omitted when it is the same image as the segment thumbnail. */
  thumbnail?: Uint8Array;
  /** Object tracker ID (links this detection across frames) */
  trackId?: number;
  /** Whether the object was moving (true) or stationary (false) */
  moving?: boolean;
}

/**
 * Unified attribute within a segment (face identity, license plate, classifier result).
 */
export interface EventAttribute {
  /** Attribute type ('face', 'license_plate', or classifier-specific like 'bird') */
  type: string;
  /** Identity name, plate text, or classification label */
  label: string;
  /** Detection confidence (0-1) */
  confidence?: number;
  /** Best-selected JPEG thumbnail crop. Present on 'segment-start' and 'segment-end' messages, and on 'segment-update' for unknown faces. */
  thumbnail?: Uint8Array;
  /** Face embedding vector for unknown face persistence. Only present for face attributes. */
  embedding?: number[];
  /** Embedding model identifier. Only present for face attributes with embedding. */
  embeddingModel?: string;
  /** CLIP embedding vector for semantic search. Only present for clip attributes. */
  clipEmbedding?: number[];
  /** CLIP embedding model identifier. Only present for clip attributes with embedding. */
  clipEmbeddingModel?: string;
  /** Parent object's tracker ID (links this attribute to its parent detection) */
  parentTrackId?: number;
}

/**
 * A contiguous object detection phase within an event.
 */
export interface EventSegment {
  /** Segment start time (Unix ms) */
  firstSeen: number;
  /** Segment end time (Unix ms) */
  lastSeen: number;
  /** Best-selected JPEG scene thumbnail for this segment. Only present on 'segment-start' and 'segment-end' messages, plus once on a 'segment-update' if the start message had none. */
  thumbnail?: Uint8Array;
  /** Object detections in this segment */
  detections: EventDetection[];
  /** Unified attributes (faces, plates, classifications) */
  attributes: EventAttribute[];
  /** Names of detection zones any detection in this segment overlapped (deduplicated) */
  zones?: string[];
  /** AI-generated description for this segment */
  description?: EventDescription;
}

/**
 * Aggregated detection event with lifecycle (start → update → end).
 * Groups individual sensor detections into structured events.
 */
export interface DetectionEvent {
  /** Unique event ID */
  id: string;
  /** Camera that produced this event */
  cameraId: string;
  /** Event lifecycle state */
  state: DetectionEventState;
  /** Event start time (Unix ms) */
  startTime: number;
  /** Event end time (Unix ms, only when ended) */
  endTime?: number;
  /** Last activity timestamp (Unix ms) */
  lastUpdate: number;
  /** Detection types present in this event (for filtering) */
  types: string[];
  /** Event triggers (motion/audio) */
  triggers: EventTrigger[];
  /**
   * Detection segments (object detection phases).
   *  For segment-* messages: contains only the current segment.
   *  For start/end messages: empty.
   */
  segments: EventSegment[];
  /** Index of the segment in segments[0] for segment-* messages. */
  segmentIndex?: number;
  /**
   * Expected event end time (Unix ms) — the latest dwell expiry across all
   *  currently-active triggers. Monotonically non-decreasing during the event
   *  lifetime. Updated on each `update` / `segment-*` message.
   */
  expectedEndTime?: number;
  /**
   * Full-frame downscaled JPEG captured at event start. Inline only on the
   *  first message that delivers it (`start` or the first `update`); the NVR
   *  plugin persists it and clients fetch it on demand via getEventThumbnails.
   */
  thumbnail?: Buffer;
  /**
   * Whether recorded footage overlaps this event's time window. Populated only
   *  when the events query explicitly requests it (e.g. the recordings browser);
   *  undefined otherwise.
   */
  hasRecording?: boolean;
}
