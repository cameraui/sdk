/**
 * How recordings are captured.
 * - `continuous`: record around the clock
 * - `event`: record only around detections, padded by the pre-buffer
 * - `adhoc`: connect and record only while a detection event runs
 */
export type RecordingMode = 'continuous' | 'event' | 'adhoc';

/** Stream tier to record. */
export type RecordingSource = 'high' | 'mid' | 'low';

/** Recording settings for a camera. */
export interface CameraRecordingSettings {
  /** Whether recording is enabled. */
  enabled: boolean;
  /** Recording mode. */
  mode: RecordingMode;
  /** Seconds of video kept before an event (event mode, 0 - 60). */
  preBuffer: number;
  /** Stream tiers to record. */
  sources: RecordingSource[];
  /** Whether recording is paused. A paused camera keeps its place among the recording cameras. */
  paused?: boolean;
  /** When the pause began (Unix ms), set by the server. */
  pausedSince?: number;
  /** When the pause ends by itself (Unix ms), none while it has no end. */
  pausedUntil?: number;
}
