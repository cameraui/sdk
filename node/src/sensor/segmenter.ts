import { Sensor, SensorType, SensorCategory } from './base.js';
import { defineSensor } from './meta.js';

import type { SensorOptions } from './base.js';
import type { BoundingBox, VideoFrameData } from './detection.js';
import type { ModelSpec } from './spec.js';

/** Outline of one object: a mask laid over its box. */
export interface ObjectMask {
  /** Box the mask covers, normalized to the image the object was found in. */
  box: BoundingBox;
  /** Mask width in pixels. */
  width: number;
  /** Mask height in pixels. */
  height: number;
  /** One byte per pixel, row by row from the top left: how likely the pixel belongs to the object (0 - 255). Above 127 counts as the object. */
  data: Uint8Array;
}

/** Crop handed to {@link SegmenterSensor.segmentObjects}, with the object it was cut for. */
export interface SegmentationFrame extends VideoFrameData {
  /** Box of the object to outline, normalized to this crop. */
  box: BoundingBox;
}

/** Return type for {@link SegmenterSensor.segmentObjects}. */
export interface SegmentationResult {
  /** The object's outline, missing when the model found no object at the box. */
  mask?: ObjectMask;
}

/**
 * Segmenter that outlines an object inside a crop. Extend this class and
 * implement {@link segmentObjects}.
 *
 * Each crop is a region around an object the object detector found, and the
 * object's box inside it says which object is meant. The mask separates the
 * object from its background, but not from a neighbour the detector saw as
 * part of it: two people in one box come back as one outline.
 */
export abstract class SegmenterSensor<TStorage extends object = Record<string, any>> extends Sensor<Record<string, never>, TStorage> {
  readonly type = SensorType.Segmenter;
  readonly category = SensorCategory.Sensor;
  _requiresFrames = true;

  constructor(name = 'Segmenter', options?: SensorOptions) {
    super(name, options);
  }

  abstract get modelSpec(): ModelSpec;

  /**
   * Outline objects in batch. Each frame is a region around one object,
   * scaled to `modelSpec.input`, and carries the object's box. Must return
   * exactly one SegmentationResult per input frame, in the same order; leave
   * `mask` out when the model found no object at the box.
   */
  abstract segmentObjects(frames: SegmentationFrame[]): Promise<SegmentationResult[]>;

  /**
   * Read-only sensor: external writes are ignored.
   *
   * @internal
   */
  updateValue(_property: string, _value: unknown): void {}
}

/** Registry metadata for {@link SegmenterSensor}. */
export const segmenterMeta = defineSensor({
  type: SensorType.Segmenter,
  category: SensorCategory.Sensor,
  assignmentKey: 'segmenter',
  multiProvider: false,
  isDetectionType: true,
  properties: {},
  semantics: null,
});
