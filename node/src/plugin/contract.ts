import type { SensorType } from '../sensor/base.js';

/**
 * Compatibility level of the plugin surface: the plugin-facing API and the
 * plugin wire protocol. Bumped only on breaking changes, never for additive
 * features. The CLI stamps the level a plugin was built against into its
 * bundle (`cameraui.protocolLevel` in the bundle package.json); the server
 * compares that stamp with its own level and refuses to start plugins
 * outside its supported range.
 */
export const PROTOCOL_LEVEL = 2;

/**
 * Python interpreter major.minor version a Python plugin requires. The host
 * ensures a matching interpreter exists in its venv pool before launching the
 * plugin; Node and Go plugins ignore this field.
 */
export type PythonVersion = '3.11' | '3.12';

/**
 * Role a plugin plays in the system. The role decides which lifecycle hooks
 * the host invokes and which contract validations apply.
 */
export enum PluginRole {
  /** Cross-camera aggregator (smart-home bridge, recorder). Owns no cameras and provides no sensors. */
  Hub = 'hub',
  /** Adds sensors to cameras owned by other plugins, for example a detector running on foreign video frames. */
  SensorProvider = 'sensorProvider',
  /** Manages cameras and their media streams: stream URLs, PTZ, snapshots. Provides no sensors for foreign cameras. */
  CameraController = 'cameraController',
  /** Manages cameras and exposes sensors, on its own cameras and, with `consumes` set, on foreign ones. */
  CameraAndSensorProvider = 'cameraAndSensorProvider',
}

/**
 * Capability flags a plugin advertises in its contract. The host uses these
 * to decide which RPC handlers to wire up and which UI affordances to show.
 */
export enum PluginInterface {
  /** Implements MotionDetectionInterface (video-based motion detection). */
  MotionDetection = 'MotionDetection',
  /** Implements ObjectDetectionInterface (e.g. person, vehicle, animal). */
  ObjectDetection = 'ObjectDetection',
  /** Implements AudioDetectionInterface (event/keyword audio detection). */
  AudioDetection = 'AudioDetection',
  /** Implements FaceDetectionInterface (face localisation + embeddings). Matching against enrolled faces happens in the NVR. */
  FaceDetection = 'FaceDetection',
  /** Implements LicensePlateDetectionInterface (plate localisation + OCR). */
  LicensePlateDetection = 'LicensePlateDetection',
  /** Implements ClassifierDetectionInterface (generic image classification emitting attribute/label pairs). */
  ClassifierDetection = 'ClassifierDetection',
  /** Implements ClipDetectionInterface (CLIP image and text embeddings used for semantic search). */
  ClipDetection = 'ClipDetection',
  /** Implements DiscoveryProvider (network scan + adoption). Only valid for camera-controlling roles. */
  DiscoveryProvider = 'DiscoveryProvider',
  /** Implements NVRInterface (events and recordings). Exactly one plugin per host fills this role at runtime. */
  NVR = 'NVR',
  /** Implements NotifierInterface, so the NotificationManager can dispatch notifications to this plugin. */
  Notifier = 'Notifier',
  /** Implements the OAuthCapable base interface plus at least one of the flow sub-interfaces below. */
  OAuthCapable = 'OAuthCapable',
  /** Implements OAuthDeviceFlowCapable (RFC 8628 Device Authorization Grant). */
  OAuthDeviceFlow = 'OAuthDeviceFlow',
  /** Implements OAuthAuthCodeFlowCapable (Authorization Code Flow + PKCE). */
  OAuthAuthCodeFlow = 'OAuthAuthCodeFlow',
  /** Implements OAuthClientCredentialsCapable (user-supplied client_id + client_secret). */
  OAuthClientCredentials = 'OAuthClientCredentials',
}

/**
 * Permission a plugin requests so it can call a host-provided system feature.
 * Each capability gates one outgoing SDK call. Calls without the matching
 * capability are rejected by the host.
 */
export enum PluginCapability {
  /** Allows `api.notificationManager.publish`. Without it the host drops published notifications and logs an error. */
  PublishNotifications = 'publishNotifications',
}

/**
 * Manifest contract a plugin declares so the host knows what it does and what
 * it needs at load time. Validated before the plugin is started.
 */
export interface PluginContract {
  /** Stable, unique identifier: registry key, log prefix and storage namespace. */
  name: string;
  /** Role of the plugin (see {@link PluginRole}). */
  role: PluginRole;
  /** Sensor types the plugin produces. Empty for hubs and pure camera-controllers, required for sensor providers. */
  provides: SensorType[];
  /** Sensor types the plugin reads from other plugins (e.g. a face plugin consuming camera video frames). */
  consumes: SensorType[];
  /** Capability flags the plugin implements (see {@link PluginInterface}). */
  interfaces: PluginInterface[];
  /** Permissions the plugin requests to call host system features (see {@link PluginCapability}). */
  capabilities?: PluginCapability[];
  /** Required Python interpreter version for Python plugins. Ignored by Node and Go plugins. */
  pythonVersion?: PythonVersion;
  /** Extra dependencies installed into the plugin's runtime (Go module paths, PyPI or npm names). */
  dependencies?: string[];
}

/**
 * Lightweight handle identifying an installed plugin, used in RPC payloads
 * and managers to refer to the plugin without shipping its full state.
 */
export interface PluginInfo {
  /** Unique runtime ID assigned by the host (stable across restarts). */
  id: string;
  /** Plugin package name (matches PluginContract.name). */
  name: string;
  /** Full contract the plugin was loaded with. */
  contract: PluginContract;
}
