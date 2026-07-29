import { Sensor, SensorType, SensorCategory } from './base.js';
import { defineSensor } from './meta.js';

import type { SensorOptions } from './base.js';
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

  constructor(name = 'CLIP Sensor', options?: SensorOptions) {
    super(name, options);
  }

  abstract get modelSpec(): ModelSpec;

  /**
   * Generate CLIP embeddings in batch. Each frame is pre-scaled to `modelSpec.input`:
   * normally a trigger region cropped by the upstream object detector, but the
   * whole scene when no decoded frame is available. Must return exactly one
   * ClipResult per input frame, in the same order. Use `frame.label` to tag the
   * emitted embedding.
   */
  abstract detectEmbeddings(frames: VideoFrameData[]): Promise<ClipResult[]>;

  /**
   * Read-only sensor: external writes are ignored.
   *
   * @internal
   */
  updateValue(_property: string, _value: unknown): void {}
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
