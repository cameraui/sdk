import type { CameraInputSettings } from '../internal/camera-config-internal.js';
import type { CameraDetectionSettings, DetectionLine, DetectionZone, PtzAutotrackSettings } from './detection.js';
import type { CameraAspectRatio, CameraRole, CameraType, StreamingRole, VideoStreamingMode } from './enums.js';
import type { CameraFrameWorkerSettings, SnapshotSettings } from './frames.js';
import type { StreamUrls } from './streaming.js';

/**
 * Camera video input/source with resolved URLs.
 */
export interface CameraInput {
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
  /** Preload stream on startup */
  preload: boolean;
  /** Enable stream prebuffering */
  prebuffer: boolean;
  /** Generated streaming URLs */
  urls: StreamUrls;
  /** Child source ID (for snapshot fallback) */
  childSourceId?: string;
}

/**
 * Camera input settings for config.
 */
export interface CameraConfigInputSettings extends Omit<CameraInputSettings, '_id' | 'urls'> {
  urls?: string[];
}

/**
 * Base camera configuration (shared fields).
 */
export interface BaseCameraConfig {
  /** Camera display name */
  name: string;
  /** Native device ID from plugin */
  nativeId?: string;
  /** Whether camera streams from cloud */
  isCloud?: boolean;
  /** Disable this camera */
  disabled?: boolean;
  /** Camera hardware information */
  info?: Partial<CameraInformation>;
}

/**
 * Camera hardware/firmware information.
 */
export interface CameraInformation {
  /** Camera model name */
  model?: string;
  /** Manufacturer name */
  manufacturer?: string;
  /** Hardware version/revision */
  hardware?: string;
  /** Device serial number */
  serialNumber?: string;
  /** Current firmware version */
  firmwareVersion?: string;
  /** Manufacturer support URL */
  supportUrl?: string;
}

/**
 * Full camera configuration with sources.
 */
export type CameraConfig = BaseCameraConfig & { sources: CameraConfigInputSettings[] };

/**
 * UI display settings for a camera.
 */
export interface CameraUiSettings {
  /** Preferred streaming method */
  streamingMode: VideoStreamingMode;
  /** Preferred stream quality */
  streamingSource: StreamingRole;
  /** Display aspect ratio */
  aspectRatio: CameraAspectRatio;
}

/**
 * Plugin assignment info.
 */
export interface AssignedPlugin {
  /** Plugin ID */
  id: string;
  /** Plugin display name */
  name: string;
}

/**
 * Plugin assignments for camera sensors/features.
 * Maps sensor types to their assigned plugin(s).
 */
export interface PluginAssignments {
  // Single-provider sensors
  /** Motion detection plugin */
  motion?: AssignedPlugin;
  /** Object detection plugin */
  object?: AssignedPlugin;
  /** Audio detection plugin */
  audio?: AssignedPlugin;
  /** Face detection plugin */
  face?: AssignedPlugin;
  /** License plate detection plugin */
  licensePlate?: AssignedPlugin;
  /** PTZ control plugin */
  ptz?: AssignedPlugin;
  /** Battery info plugin */
  battery?: AssignedPlugin;
  /** Camera controller plugin */
  cameraController?: AssignedPlugin;

  // Multi-provider sensors
  /** Light control plugins */
  light?: AssignedPlugin[];
  /** Siren control plugins */
  siren?: AssignedPlugin[];
  /** Contact sensor plugins */
  contact?: AssignedPlugin[];
  /** Doorbell trigger plugins */
  doorbell?: AssignedPlugin[];
  /** Hub/bridge plugins */
  hub?: AssignedPlugin[];
}

/**
 * Camera source plugin information.
 */
export interface CameraPluginInfo {
  /** Plugin ID */
  id: string;
  /** Plugin display name */
  name: string;
}

/**
 * Base camera data structure (stored in database).
 */
export interface BaseCamera {
  /** Unique camera ID */
  readonly _id: string;
  /** Native device ID from plugin */
  nativeId?: string;
  /** Source plugin information */
  pluginInfo?: CameraPluginInfo;
  /** Camera display name */
  name: string;
  /** Room this camera belongs to */
  room: string;
  /** Whether camera is disabled */
  disabled: boolean;
  /** Whether camera streams from cloud */
  isCloud: boolean;
  /** Camera hardware information */
  info: CameraInformation;
  /** Camera type (camera/doorbell) */
  type: CameraType;
  /** Snapshot settings */
  snapshotSettings: SnapshotSettings;
  /** Detection zone configurations */
  detectionZones: DetectionZone[];
  /** Detection line configurations (virtual tripwires) */
  detectionLines: DetectionLine[];
  /** Detection settings */
  detectionSettings: CameraDetectionSettings;
  /** PTZ autotracking settings */
  ptzAutotrack: PtzAutotrackSettings;
  /** Frame worker settings */
  frameWorkerSettings: CameraFrameWorkerSettings;
  /** UI display settings */
  interfaceSettings: CameraUiSettings;
  /** Installed plugins */
  plugins: AssignedPlugin[];
  /** Sensor-to-plugin assignments */
  assignments: PluginAssignments;
}

/**
 * Camera with resolved video sources.
 */
export interface Camera extends BaseCamera {
  /** Video input sources */
  sources: CameraInput[];
}
