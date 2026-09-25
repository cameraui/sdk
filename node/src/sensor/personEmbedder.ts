import { Sensor, SensorType, SensorCategory } from './base.js';
import { defineSensor } from './meta.js';

import type { SensorOptions } from './base.js';
import type { VideoFrameData } from './detection.js';
import type { ModelSpec } from './spec.js';

/** Return type for {@link PersonEmbedderSensor.embedPersons}. */
export interface PersonEmbeddingResult {
  /** Embedding vector for the person in this crop, empty when the crop could not be embedded. */
  embedding: number[];
  /** Identifier of the embedding model that produced the vector. */
  embeddingModel: string;
}

/**
 * Person embedder that turns the crop of a person into a vector of their
 * appearance, to find the same person again when no face is visible. Extend
 * this class and implement {@link embedPersons}.
 *
 * The crop is the person's box from the object detector, cut tight from the
 * source frame. A vector describes clothing and build, not identity: it finds
 * the same person on the same day, not after a change of clothes. Vectors from
 * different models are not comparable, which is why every result carries its
 * `embeddingModel`.
 */
export abstract class PersonEmbedderSensor<TStorage extends object = Record<string, any>> extends Sensor<Record<string, never>, TStorage> {
  readonly type = SensorType.PersonEmbedder;
  readonly category = SensorCategory.Sensor;
  _requiresFrames = true;

  constructor(name = 'Person Embedder', options?: SensorOptions) {
    super(name, options);
  }

  abstract get modelSpec(): ModelSpec;

  /**
   * Embed persons in batch. Each frame is one person crop, cut tight around
   * the detected box and stretched to `modelSpec.input`. Must return exactly
   * one PersonEmbeddingResult per input frame, in the same order; return an
   * empty `embedding` for a crop the model could not use.
   */
  abstract embedPersons(frames: VideoFrameData[]): Promise<PersonEmbeddingResult[]>;

  /**
   * Read-only sensor: external writes are ignored.
   *
   * @internal
   */
  updateValue(_property: string, _value: unknown): void {}
}

/** Registry metadata for {@link PersonEmbedderSensor}. */
export const personEmbedderMeta = defineSensor({
  type: SensorType.PersonEmbedder,
  category: SensorCategory.Sensor,
  assignmentKey: 'personEmbedder',
  multiProvider: false,
  isDetectionType: true,
  properties: {},
  semantics: null,
});
