import { Sensor, SensorType, SensorCategory } from './base.js';
import { defineSensor } from './meta.js';

import type { BoundingBox, VideoFrameData } from './detection.js';
import type { ModelSpec } from './spec.js';

/** A CLIP embedding result for a detected region. */
export interface ClipEmbedding {
  /** Detection label this embedding was computed for (e.g. `'person'`, `'vehicle'`). */
  label: string;
  /** Bounding box of the detected region in normalized coordinates. */
  box: BoundingBox;
  /** CLIP embedding vector. */
  embedding: number[];
}

/** Return type for {@link ClipDetectorSensor.detectEmbeddings}. */
export interface ClipResult {
  /** Embeddings emitted for this frame. */
  embeddings: ClipEmbedding[];
  /** Identifier of the embedding model used to produce the vectors. */
  embeddingModel: string;
}

/**
 * CLIP detector sensor that receives video frames and generates semantic
 * embeddings. Extend this class and implement {@link detectEmbeddings} to
 * produce CLIP embeddings for downstream semantic search.
 */
export abstract class ClipDetectorSensor<TStorage extends object = Record<string, any>> extends Sensor<Record<string, never>, TStorage> {
  readonly type = SensorType.Clip;
  readonly category = SensorCategory.Sensor;
  _requiresFrames = true;

  constructor(name = 'CLIP Sensor') {
    super(name);
  }

  /** Declares the expected input dimensions and trigger labels. */
  abstract get modelSpec(): ModelSpec;

  /**
   * Generate CLIP embeddings in batch. Each frame is a pre-cropped,
   * pre-scaled trigger region produced by the upstream object detector.
   * Must return exactly one ClipResult per input frame, in the same order.
   * Use `frame.label` to tag the emitted embedding.
   */
  abstract detectEmbeddings(frames: VideoFrameData[]): Promise<ClipResult[]>;

  /**
   * Frame-only sensor: no externally writable properties.
   *
   * Called by the cross-process plugin host when a generic property write is received.
   * CLIP detectors have no writable properties, so the parameters are unused
   * (underscore-prefixed) and the call is a no-op.
   *
   * @param _property - Unused — CLIP detectors expose no writable properties.
   *
   * @param _value - Unused — CLIP detectors expose no writable properties.
   *
   * @internal
   */
  updateValue(_property: string, _value: unknown): void {
    // No-op — clip detector has no state.
  }
}

/** Registry metadata for {@link ClipDetectorSensor}. */
export const clipMeta = defineSensor({
  type: SensorType.Clip,
  category: SensorCategory.Sensor,
  assignmentKey: 'clip',
  multiProvider: false,
  isDetectionType: true,
  properties: {},
  semantics: null,
});
