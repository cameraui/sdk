/**
 * Frame worker (decoder) settings.
 */
/**
 * Hardware backend for the detection decoder.
 * `auto` probes the platform order, `cpu` forces software decoding.
 */
export type FrameWorkerDecoderHardware =
  | 'auto'
  | 'cpu'
  | 'cuda'
  | 'vaapi'
  | 'qsv'
  | 'videotoolbox'
  | 'd3d11va'
  | 'd3d12va'
  | 'dxva2'
  | 'vulkan'
  | 'opencl'
  | 'drm'
  | 'rkmpp';

/**
 * Decoder hardware selection for the frame worker.
 */
export interface FrameWorkerDecoderSettings {
  /** Hardware backend to decode with */
  hardware: FrameWorkerDecoderHardware;
  /** Device the backend opens (GPU index like `0`, or a path like `/dev/dri/renderD128`). Backend default when omitted. */
  device?: string;
}

export interface CameraFrameWorkerSettings {
  /** Target frames per second for detection */
  fps: number;
  /** Capture event thumbnails from the highest-resolution source. */
  hqSnapshots?: boolean;
  /** Decoder hardware selection. Applies on the machine that decodes this camera (master or assigned worker); an unusable selection falls back to auto. */
  decoder?: FrameWorkerDecoderSettings;
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
