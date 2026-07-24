import { SensorCategory, SensorType } from './base.js';
import { defineSensor } from './meta.js';

/**
 * Registry metadata for the object assist slot.
 *
 * There is no sensor class for this type: a plugin assigned to the slot serves
 * it with the {@link ObjectDetectorSensor} it already registers, so plugins
 * declare and implement object detection only.
 */
export const objectAssistMeta = defineSensor({
  type: SensorType.ObjectAssist,
  category: SensorCategory.Sensor,
  assignmentKey: 'objectAssist',
  multiProvider: false,
  isDetectionType: true,
  properties: {},
  semantics: null,
});
