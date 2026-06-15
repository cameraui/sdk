/** Built-in detection label types recognized across the system. */
export const DETECTION_LABELS = ['motion', 'person', 'vehicle', 'animal', 'package', 'audio'] as const;

/** Union of the built-in detection label strings. */
export type DetectionLabel = (typeof DETECTION_LABELS)[number];

/** Detection attribute types used to mark sub-detections (face, license plate, ...). */
export const DETECTION_ATTRIBUTES = ['face', 'license_plate'] as const;

/** Union of the built-in detection attribute strings. */
export type DetectionAttribute = (typeof DETECTION_ATTRIBUTES)[number];

/**
 * Bounding box of a detection. All coordinates are normalized to 0–1
 * (fraction of frame dimensions), so they are independent of resolution.
 */
export interface BoundingBox {
  /** X coordinate of the top-left corner (0–1). */
  x: number;
  /** Y coordinate of the top-left corner (0–1). */
  y: number;
  /** Width as a fraction of frame width (0–1). */
  width: number;
  /** Height as a fraction of frame height (0–1). */
  height: number;
}

/** A single detection result emitted by any detection sensor. */
export interface Detection {
  /** Detection label (e.g. `'person'`, `'vehicle'`). */
  label: DetectionLabel;
  /** Confidence score in the range 0–1. */
  confidence: number;
  /** Bounding box in normalized coordinates. */
  box: BoundingBox;
  /** Optional sub-detection attribute (`'face'`, `'license_plate'`, or a classifier-specific value). */
  attribute?: DetectionAttribute | (string & {});
}

/**
 * Video frame data delivered to detector sensors by the backend pipeline.
 * The backend handles capture, decoding, and scaling — detectors only need
 * to process the pixel payload.
 */
export interface VideoFrameData {
  /** Unique frame or crop identifier used to map batch results back to inputs. */
  id: string;
  /** Camera the frame originated from. */
  cameraId?: string;
  /** Raw pixel buffer. */
  data: ArrayBuffer | Buffer;
  /** Frame width in pixels. */
  width: number;
  /** Frame height in pixels. */
  height: number;
  /** Pixel format: `'rgb'` = 3 bytes/pixel interleaved, `'rgba'` = 4 bytes/pixel, `'gray'` = 1 byte/pixel, `'nv12'` = YUV semi-planar. */
  format: 'nv12' | 'rgb' | 'rgba' | 'gray';
  /** Capture timestamp in milliseconds since epoch. */
  timestamp?: number;
  /** Trigger label propagated by the coordinator (e.g. `'person'`, `'vehicle'`) for secondary detectors. */
  label?: string;
}
