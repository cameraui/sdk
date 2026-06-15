import type { DetectionLabel } from './detection.js';

/** Expected video input dimensions and pixel format for a detector model. */
export interface VideoInputSpec {
  /** Expected frame width in pixels. */
  width: number;
  /** Expected frame height in pixels. */
  height: number;
  /** Pixel format: `'rgb'` = 3 bytes/pixel, `'gray'` = 1 byte/pixel, `'nv12'` = YUV semi-planar. */
  format: 'rgb' | 'nv12' | 'gray';
}

/** Expected audio input format for an audio detector model. */
export interface AudioInputSpec {
  /** Sample rate in Hz the model expects. */
  sampleRate: number;
  /** Channel count the model expects (typically 1 = mono). */
  channels: number;
  /** Sample format: `'pcm16'` = 16-bit signed integer PCM, `'float32'` = 32-bit float. */
  format: 'pcm16' | 'float32';
  /** Number of samples per audio frame the detector expects. The backend buffers audio to deliver exactly this many samples per call. */
  samplesPerFrame?: number;
}

/**
 * Model spec for detectors with fixed output labels (face, classifier, license plate).
 * Declares the input shape the backend should produce and the trigger labels
 * that should activate this detector.
 */
export interface ModelSpec {
  /** Required input frame dimensions and pixel format. */
  input: VideoInputSpec;
  /** Labels emitted by an upstream object detector that activate this detector (e.g. `['person']` for face detection). */
  triggerLabels: DetectionLabel[];
  /** Embedding model identifier for face recognition. */
  embeddingModel?: string;
}

/**
 * Model spec for object detectors. Only declares input dimensions —
 * the output label set is dynamic and comes from the model itself.
 */
export interface ObjectModelSpec {
  /** Required input frame dimensions and pixel format. */
  input: VideoInputSpec;
}

/** Model spec for audio detectors. */
export interface AudioModelSpec {
  /** Required input audio format. */
  input: AudioInputSpec;
}
