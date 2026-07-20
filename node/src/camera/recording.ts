/**
 * How recordings are captured.
 * - `continuous`: record around the clock
 * - `event`: record only around detections, padded by the pre-buffer
 * - `adhoc`: record only when started manually
 */
export type RecordingMode = 'continuous' | 'event' | 'adhoc';

/**
 * Stream tier to record.
 */
export type RecordingSource = 'high' | 'mid' | 'low';

/**
 * Recording settings for a camera.
 */
export interface CameraRecordingSettings {
  /** Whether recording is enabled */
  enabled: boolean;
  /** Recording mode */
  mode: RecordingMode;
  /** Seconds of video kept before an event (event mode, 0 - 60) */
  preBuffer: number;
  /** Stream tiers to record */
  sources: RecordingSource[];
}
