import type { SensorType } from '../sensor/base.js';

/**
 * Python interpreter major.minor version a Python plugin requires. The host
 *  ensures a matching interpreter exists in its venv pool before launching
 *  the plugin; Node and Go plugins ignore this field.
 */
export type PythonVersion = '3.11' | '3.12';

/**
 * Role a plugin plays in the system. The role decides which lifecycle hooks
 * the host invokes and which contract validations apply (see helper.ts).
 */
export enum PluginRole {
  /**
   * Cloud-service integration that manages its own cameras end-to-end via a
   * vendor account (e.g. a vendor SDK / cloud API). The hub owns camera
   * creation, streaming and sensors; it cannot expose sensors for cameras
   * owned by other plugins.
   */
  Hub = 'hub',
  /**
   * Adds sensors to existing cameras without owning the camera itself.
   * Typical use: a detection plugin that consumes another plugin's video
   * frames and emits motion / object / face detections back into the system.
   */
  SensorProvider = 'sensorProvider',
  /**
   * Manages cameras and their media streams (ONVIF, RTSP, generic IP, ...).
   * The plugin is responsible for stream URLs, PTZ, snapshots, and the
   * lifecycle hooks in BasePlugin. It does not produce sensors for foreign
   * cameras.
   */
  CameraController = 'cameraController',
  /**
   * Combined role: plugin both manages cameras and exposes sensors (its own
   * cameras and, when consumes is set, also foreign cameras). Used by
   * integrations that ship a complete camera + detection stack.
   */
  CameraAndSensorProvider = 'cameraAndSensorProvider',
}

/**
 * Capability flags a plugin advertises in its contract. The host uses these
 *  to decide which RPC handlers to wire up and which UI affordances to show.
 */
export enum PluginInterface {
  /** Implements MotionDetectionInterface (video-based motion detection). */
  MotionDetection = 'MotionDetection',
  /** Implements ObjectDetectionInterface (e.g. person, vehicle, animal). */
  ObjectDetection = 'ObjectDetection',
  /** Implements AudioDetectionInterface (event/keyword audio detection). */
  AudioDetection = 'AudioDetection',
  /**
   * Implements FaceDetectionInterface (face localisation + embeddings). The
   *  NVR owns matching against enrolled faces; the plugin only emits
   *  detections + embeddings.
   */
  FaceDetection = 'FaceDetection',
  /** Implements LicensePlateDetectionInterface (plate localisation + OCR). */
  LicensePlateDetection = 'LicensePlateDetection',
  /**
   * Implements ClassifierDetectionInterface (generic image classification
   *  emitting attribute/label pairs).
   */
  ClassifierDetection = 'ClassifierDetection',
  /**
   * Implements ClipDetectionInterface (CLIP image and text embeddings used
   *  for semantic search).
   */
  ClipDetection = 'ClipDetection',
  /**
   * Implements DiscoveryProvider — plugin can scan the network for new
   *  cameras and adopt them. Only valid for camera-controlling roles.
   */
  DiscoveryProvider = 'DiscoveryProvider',
  /**
   * Implements NVRInterface — persists events and recordings, and serves
   *  them back to the UI / mobile clients. Exactly one plugin per host
   *  fills this role at runtime.
   */
  NVR = 'NVR',
  /**
   * Implements NotifierInterface (getDevices, sendNotification, ...). Lets
   * the central NotificationManager dispatch notifications to this plugin
   * regardless of role — see notifier.ts.
   */
  Notifier = 'Notifier',
  /**
   * Implements the OAuthCapable base interface (getOAuthMetadata,
   * getOAuthState, disconnect) plus at least one flow sub-interface below —
   * see oauth.ts.
   */
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
 * Each capability gates one outgoing SDK call — calls without the matching
 * capability are rejected by the host.
 */
export enum PluginCapability {
  /**
   * Grants the plugin permission to call `api.notificationManager.publish`.
   * Without this capability the host silently drops published notifications
   * and logs an error.
   */
  PublishNotifications = 'publishNotifications',
}

/**
 * Manifest contract a plugin declares so the host knows what it does and
 * what it needs at load time. Validated by helper.ts before the plugin is
 * started.
 */
export interface PluginContract {
  /**
   * Stable, unique identifier for the plugin instance — used as the
   *  registry key, log prefix and the storage namespace.
   */
  name: string;
  /** Role of the plugin (see {@link PluginRole}). */
  role: PluginRole;
  /**
   * Sensor types the plugin produces. Empty for hubs and pure
   *  camera-controllers; required for sensor providers.
   */
  provides: SensorType[];
  /**
   * Sensor types the plugin reads from other plugins (e.g. a face plugin
   *  consumes camera video frames).
   */
  consumes: SensorType[];
  /** Capability flags the plugin implements (see {@link PluginInterface}). */
  interfaces: PluginInterface[];
  /**
   * Permissions the plugin requests to call host system features (see
   *  {@link PluginCapability}). The host enforces these — calls without a
   *  matching capability are rejected.
   */
  capabilities?: PluginCapability[];
  /**
   * Required Python interpreter version for Python plugins. Ignored by
   *  Node / Go plugins.
   */
  pythonVersion?: PythonVersion;
  /**
   * Extra package dependencies installed into the plugin's runtime (PyPI
   *  for Python plugins, npm for Node plugins).
   */
  dependencies?: string[];
}

/**
 * Lightweight handle identifying an installed plugin — used in RPC payloads
 *  and managers to refer to the plugin without shipping its full state.
 */
export interface PluginInfo {
  /** Unique runtime ID assigned by the host (stable across restarts). */
  id: string;
  /** Plugin package name (matches PluginContract.name). */
  name: string;
  /** Full contract the plugin was loaded with. */
  contract: PluginContract;
}
