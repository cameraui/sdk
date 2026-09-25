import type { BaseCameraConfig, CameraConfigInputSettings } from '../camera/config.js';
import type { CameraRole, StreamingRole } from '../camera/enums.js';

/** Camera input settings (user configuration). */
export interface CameraInputSettings {
  /** Unique source ID. */
  readonly _id: string;
  /** Source display name. */
  name: string;
  /** Resolution role. */
  role: CameraRole;
  /** Use this source for snapshots. */
  useForSnapshot: boolean;
  /** Keep connection always active. */
  hotMode: boolean;
  /** Keep a keyframe cache for this source, so the view opens faster. Use `hotMode` to keep the stream connected. */
  preload: boolean;
  /** Strip the audio track from this source (defaults to false). */
  muted?: boolean;
  /** Drop the talk channel of this source, so clients get no microphone (defaults to false). */
  backchannelDisabled?: boolean;
  /** Seconds without media before the stream reconnects. Unset means the host default: 5 for cameras, 60 for plugin-served sources. */
  timeout?: number;
  /** Seconds allowed per RTSP request while connecting. Raise it for cameras that wake slowly. Unset means 5. */
  handshakeTimeout?: number;
  /** User-provided stream URLs. */
  urls: string[];
  /** Child source ID (for snapshot fallback). */
  childSourceId?: string;
  /** Camera whose stream shows in the picture-in-picture overlay, instead of a source of this camera. */
  childCameraId?: string;
  /** Role of the `childCameraId` stream shown in the overlay. */
  childCameraRole?: StreamingRole;
}

/** Camera configuration subset for partial updates. */
export type CameraConfigPartial = Partial<BaseCameraConfig> & { sources?: Partial<CameraConfigInputSettings>[] };
