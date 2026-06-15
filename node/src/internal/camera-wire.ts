import type { DetectionEvent } from '../camera/events.js';
import type { DetectionEventType } from '../camera/enums.js';

/**
 * Detection event message published via NATS.
 */
export interface DetectionEventMessage {
  /** Event lifecycle type */
  type: DetectionEventType;
  /** Full event data */
  data: DetectionEvent;
}
