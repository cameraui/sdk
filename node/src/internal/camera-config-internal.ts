import type { BaseCameraConfig, CameraConfigInputSettings } from '../camera/config.js';
import type { CameraRole } from '../camera/enums.js';

/**
 * Camera input settings (user configuration).
 */
export interface CameraInputSettings {
  /** Unique source ID */
  readonly _id: string;
  /** Source display name */
  name: string;
  /** Resolution role */
  role: CameraRole;
  /** Use this source for snapshots */
  useForSnapshot: boolean;
  /** Keep connection always active */
  hotMode: boolean;
  /** Keep a keyframe cache for this source, so the view opens faster. Use `hotMode` to keep the stream connected. */
  preload: boolean;
  /** Strip the audio track from this source (defaults to false) */
  muted?: boolean;
  /** User-provided stream URLs */
  urls: string[];
  /** Child source ID (for snapshot fallback) */
  childSourceId?: string;
}

/**
 * Camera configuration subset for partial updates.
 */
export type CameraConfigPartial = Partial<BaseCameraConfig> & { sources?: Partial<CameraConfigInputSettings>[] };
