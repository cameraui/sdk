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

/** One model a sensor has loaded. Reported for the metrics view and for debugging. */
export interface LoadedModel {
  /** Resolved model name, after any `default` placeholder (e.g. `'yolo-v9-s-320'`). */
  name: string;
  /** What this model does inside a sensor that loads several: `'detect'`, `'embed'`, `'ocr'`, `'text'`. */
  role?: string;
  /** Where inference runs, resolved to the real device (e.g. `'GPU.0'`, `'ANE'`, `'TPU:0'`, `'CPU'`). */
  device?: string;
  /** Weight precision: `'fp32'`, `'fp16'`, `'int8'`. */
  precision?: string;
  /** How long loading this model took, in milliseconds. */
  loadMs?: number;
}

/** What a sensor runs on. Optional throughout: a plugin that reports nothing simply shows nothing. */
export interface ModelRuntime {
  /** Inference framework and version, e.g. `'openvino 2025.3.0'`. */
  runtime?: string;
  /** Models this sensor has loaded, primary one first. */
  models?: LoadedModel[];
}

/**
 * Model spec for detectors with fixed output labels (face, classifier, license plate).
 * Declares the input shape the backend should produce and the trigger labels
 * that should activate this detector.
 */
export interface ModelSpec extends ModelRuntime {
  /** Required input frame dimensions and pixel format. */
  input: VideoInputSpec;
  /** Labels emitted by an upstream object detector that activate this detector (e.g. `['person']` for face detection). */
  triggerLabels: DetectionLabel[];
  /** Embedding model identifier. Required for face recognition and for CLIP: embeddings are stored and matched under this id. */
  embeddingModel?: string;
}

/**
 * Model spec for object detectors. Only declares input dimensions, the output
 * label set is dynamic and comes from the model itself.
 */
export interface ObjectModelSpec extends ModelRuntime {
  /** Required input frame dimensions and pixel format. */
  input: VideoInputSpec;
}

/** Model spec for audio detectors. */
export interface AudioModelSpec extends ModelRuntime {
  /** Required input audio format. */
  input: AudioInputSpec;
}
