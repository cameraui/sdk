import { Sensor, SensorType, SensorCategory } from './base.js';
import { defineSensor } from './meta.js';

import type { Point } from '../camera/enums.js';
import type { SensorOptions } from './base.js';
import type { VideoFrameData } from './detection.js';
import type { ModelSpec } from './spec.js';

/** Return type for {@link FaceEmbedderSensor.embedFaces}. */
export interface FaceEmbeddingResult {
  /** Embedding vector for the face in this crop, empty when no face could be embedded. */
  embedding: number[];
  /** Identifier of the embedding model that produced the vector. */
  embeddingModel: string;
  /** The five points the face was aligned on, in 0 - 1 of the input image: right eye, left eye, nose, right and left mouth corner. */
  landmarks?: Point[];
  /** How clearly the picture shows a face (0 - 1), also sent with an empty embedding when the face was too unclear; not sent when the landmarks were passed in. */
  quality?: number;
}

/**
 * Face embedder that turns a face crop into a vector for recognition. Extend
 * this class and implement {@link embedFaces}.
 *
 * The crop comes from the face detector's box, cut from the source frame, so
 * the sensor runs after face detection rather than on the raw scene. What a
 * vector means depends on the model that produced it: vectors from different
 * models are not comparable, which is why every result carries its
 * `embeddingModel`.
 */
export abstract class FaceEmbedderSensor<TStorage extends object = Record<string, any>> extends Sensor<Record<string, never>, TStorage> {
  readonly type = SensorType.FaceEmbedder;
  readonly category = SensorCategory.Sensor;
  _requiresFrames = true;

  constructor(name = 'Face Embedder', options?: SensorOptions) {
    super(name, options);
  }

  abstract get modelSpec(): ModelSpec;

  /**
   * Embed faces in batch. Each frame is one face crop, padded around the
   * detected box and pre-scaled to `modelSpec.input`. Must return exactly one
   * FaceEmbeddingResult per input frame, in the same order; return an empty
   * `embedding` for a crop the model could not use.
   */
  abstract embedFaces(frames: VideoFrameData[]): Promise<FaceEmbeddingResult[]>;

  /**
   * Read-only sensor: external writes are ignored.
   *
   * @internal
   */
  updateValue(_property: string, _value: unknown): void {}
}

/** Registry metadata for {@link FaceEmbedderSensor}. */
export const faceEmbedderMeta = defineSensor({
  type: SensorType.FaceEmbedder,
  category: SensorCategory.Sensor,
  assignmentKey: 'faceEmbedder',
  multiProvider: false,
  isDetectionType: true,
  properties: {},
  semantics: null,
});
