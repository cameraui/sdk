import type { DetectionEvent } from '../camera/events.js';
import type { DetectionEventType } from '../camera/enums.js';

export interface DetectionEventMessage {
  type: DetectionEventType;
  data: DetectionEvent;
}
