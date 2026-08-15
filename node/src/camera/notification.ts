import type { AudioLabel } from '../sensor/audio.js';

/**
 * How long a push waits for a good picture.
 * - `immediate`: send right away, with a picture only if one is ready
 * - `balanced`: wait up to 2 seconds for the best picture
 * - `best`: wait up to 4 seconds for the best picture
 */
export type NotificationSpeed = 'immediate' | 'balanced' | 'best';

/** Push notification settings for a camera. */
export interface CameraNotificationSettings {
  /** Whether detections on this camera send a push at all. */
  enabled: boolean;
  /** Attach a short clip of the moment. Needs recording, uses the lowest recorded quality. */
  video: boolean;
  /** Audio events that send a push. `other` covers custom audio labels. */
  audio: AudioLabel[];
  /** Sensor triggers that send a push, by sensor type. */
  sensors: string[];
  /** Minimum seconds between pushes. Critical alerts bypass it and do not count toward it. */
  cooldown: number;
  /** How long a push waits for a good picture. */
  speed: NotificationSpeed;
}
