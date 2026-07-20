import type { CameraInputSettings } from '../internal/camera-config-internal.js';
import type { SENSOR_META } from '../sensor/registry.js';
import type { CameraDetectionSettings, DetectionLine, DetectionZone, PtzAutotrackSettings } from './detection.js';
import type { CameraRecordingSettings } from './recording.js';
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
  /** Keep a keyframe cache for this source, so the view opens faster. Use `hotMode` to keep the stream connected. */
  preload: boolean;
  /** Strip the audio track from this source (defaults to false) */
  muted?: boolean;
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

/** @internal */
type SingleProviderAssignmentKey = Extract<(typeof SENSOR_META)[number], { multiProvider: false }>['assignmentKey'];
/** @internal */
type MultiProviderAssignmentKey = Extract<(typeof SENSOR_META)[number], { multiProvider: true }>['assignmentKey'];

/**
 * Plugin assignments for a camera, keyed by the assignment keys the SDK sensor
 * registry declares. Single-provider sensors and the camera controller hold one
 * plugin; multi-provider sensors and the hub hold an array. Derived from the
 * registry so a new sensor type gains its assignment slot automatically.
 */
export type PluginAssignments = Partial<Record<SingleProviderAssignmentKey, AssignedPlugin>> &
  Partial<Record<MultiProviderAssignmentKey, AssignedPlugin[]>> & {
    cameraController?: AssignedPlugin;
    hub?: AssignedPlugin[];
  };

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
  /** Recording settings */
  recordingSettings: CameraRecordingSettings;
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
