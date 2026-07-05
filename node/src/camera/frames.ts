/**
 * Frame worker (decoder) settings.
 */
export interface CameraFrameWorkerSettings {
  /** Target frames per second for detection */
  fps: number;
  /** Capture event thumbnails from the highest-resolution source. */
  hqSnapshots?: boolean;
}

/**
 * Snapshot settings for a camera.
 */
export interface SnapshotSettings {
  /** Enable automatic snapshot refresh */
  autoRefresh: boolean;
  /** Cache TTL in seconds (how long a snapshot is valid) */
  ttl: number;
  /** Auto-refresh interval in seconds (min: 10, max: 60) */
  interval: number;
}
