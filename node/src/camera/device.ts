/* eslint-disable @stylistic/max-len */
import type { Disposable, Observable } from '../observable/index.js';
import type { Sensor, SensorLike, SensorType } from '../sensor/base.js';
import type { DeviceStorage, JsonSchema } from '../storage/index.js';
import type { LoggerService } from '../types.js';
import type { Camera, CameraInformation, CameraInput, CameraPluginInfo, CameraUiSettings } from './config.js';
import type { CameraDetectionSettings, DetectionLine, DetectionZone, PtzAutotrackSettings } from './detection.js';
import type { CameraRecordingSettings } from './recording.js';
import type { CameraType, DetectionEventType } from './enums.js';
import type { DetectionEvent } from './events.js';
import type { CameraFrameWorkerSettings, SnapshotSettings } from './frames.js';
import type { Fmp4Session, ProbeConfig, ProbeStream, RTSPUrlOptions, RtpSession, SnapshotUrlOptions } from './streaming.js';

/**
 * Camera source with snapshot and probe capabilities.
 */
export interface CameraSource extends CameraInput {
  /**
   * Get camera snapshot image.
   *
   * @param forceNew - Force fresh snapshot (ignore cache)
   *
   * @returns JPEG image data or undefined if unavailable
   */
  snapshot(forceNew?: boolean): Promise<ArrayBuffer | undefined>;

  /**
   * Probe stream for codec and track information.
   *
   * @param probeConfig - What to probe for
   *
   * @param refresh - Force fresh probe (ignore cache)
   *
   * @returns Stream information or undefined if unavailable
   */
  probeStream(probeConfig?: ProbeConfig, refresh?: boolean): Promise<ProbeStream | undefined>;

  /**
   * Get the current stream connection status.
   *
   * @returns Status string: 'connected', 'connecting', 'error', or 'idle'
   */
  getStreamStatus(): Promise<string>;

  /**
   * Generate Snapshot URL with specified options.
   *
   * @param options - URL generation options
   *
   * @returns Snapshot URL string
   */
  generateSnapshotUrl(options?: SnapshotUrlOptions): string;
}

/**
 * Camera source with full streaming capabilities.
 */
export interface CameraDeviceSource extends CameraSource {
  /**
   * Generate RTSP URL with specified options.
   *
   * @param options - URL generation options
   *
   * @returns RTSP URL string
   */
  generateRTSPUrl(options?: RTSPUrlOptions): string;

  /**
   * Create RTP streaming session.
   *
   * @param urlOrOptions - RTSP URL or options
   *
   * @returns RTP session instance
   */
  createRtpSession(urlOrOptions?: string | RTSPUrlOptions): RtpSession;

  /**
   * Create FMP4 streaming session.
   *
   * @param urlOrOptions - RTSP URL or options
   *
   * @returns FMP4 session instance
   */
  createFmp4Session(urlOrOptions?: string | RTSPUrlOptions): Fmp4Session;
}

/**
 * Main camera device interface.
 * Provides access to camera streams, sensors, and services.
 */
export interface CameraDevice {
  /** Unique camera ID */
  readonly id: string;
  /** Native device ID from plugin */
  readonly nativeId: string | undefined;
  /** Source plugin information */
  readonly pluginInfo: CameraPluginInfo | undefined;
  /** Whether camera is disabled */
  readonly disabled: boolean;
  /** Camera display name */
  readonly name: string;
  /** Room this camera belongs to */
  readonly room: string;
  /** Camera type (camera/doorbell) */
  readonly type: CameraType;
  /** Snapshot settings */
  readonly snapshotSettings: SnapshotSettings;
  /** Camera hardware information */
  readonly info: CameraInformation;
  /** Whether camera streams from cloud */
  readonly isCloud: boolean;
  /** Detection zone configurations */
  readonly detectionZones: DetectionZone[];
  /** Detection line configurations (virtual tripwires) */
  readonly detectionLines: DetectionLine[];
  /** Detection settings */
  readonly detectionSettings: CameraDetectionSettings;
  /** PTZ autotracking settings */
  readonly ptzAutotrack: PtzAutotrackSettings;
  /** Recording settings */
  readonly recordingSettings: CameraRecordingSettings;
  /** Whether detections are snoozed (paused) */
  readonly snooze: boolean;
  /** Frame worker settings */
  readonly frameWorkerSettings: CameraFrameWorkerSettings;
  /** UI display settings */
  readonly interfaceSettings: CameraUiSettings;

  /** All video sources */
  readonly sources: CameraDeviceSource[];
  /** Primary streaming source */
  readonly streamSource: CameraDeviceSource;
  /** High resolution source (if available) */
  readonly highResolutionSource: CameraDeviceSource | undefined;
  /** Mid resolution source (if available) */
  readonly midResolutionSource: CameraDeviceSource | undefined;
  /** Low resolution source (if available) */
  readonly lowResolutionSource: CameraDeviceSource | undefined;
  /** Snapshot source (if available) */
  readonly snapshotSource: CameraSource | undefined;

  /**
   * Get a source by its ID.
   *
   * @param id - The source ID
   *
   * @returns The matching source, or undefined if not found
   */
  getSourceById(id: string): CameraDeviceSource | undefined;

  /** Whether camera is connected */
  readonly connected: boolean;
  /** Whether frame worker is connected */
  readonly frameWorkerConnected: boolean;
  /** Observable for connection state changes */
  readonly onConnected: Observable<boolean>;
  /** Observable for frame worker state changes */
  readonly onFrameWorkerConnected: Observable<boolean>;

  /** Logger service for this camera */
  readonly logger: LoggerService;

  /**
   * Create storage for plugin-specific camera configuration.
   *
   * @param schemas - Schema definitions for the storage
   *
   * @returns Typed device storage instance
   */
  createStorage<T extends Record<string, any> = Record<string, any>>(schemas: JsonSchema[]): DeviceStorage<T>;

  /**
   * Tell the server this camera is online.
   * Only the plugin that owns this camera (via pluginInfo) may connect it.
   */
  connect(): Promise<void>;
  /**
   * Tell the server this camera is offline.
   * Only the plugin that owns this camera (via pluginInfo) may disconnect it.
   */
  disconnect(): Promise<void>;

  /**
   * Observe camera property changes.
   *
   * @param property - Property name(s) to observe
   *
   * @returns Observable emitting old and new values
   */
  onPropertyChange<T extends keyof Camera>(property: T | T[]): Observable<{ property: T; oldData: Camera[T]; newData: Camera[T] }>;

  /** Get all sensors attached to this camera (owned + foreign). */
  getSensors(): SensorLike[];
  /** Get sensor by ID (checks owned and foreign sensors). */
  getSensor(sensorId: string): SensorLike | undefined;
  /** Get all sensors of a specific type (owned + foreign). */
  getSensorsByType(type: SensorType): SensorLike[];

  /**
   * Subscribe to a specific property on a sensor type with full lifecycle management.
   * Automatically subscribes/unsubscribes when sensors of the given type are added/removed.
   *
   * @param sensorType - The sensor type to watch
   *
   * @param property - The property name to observe
   *
   * @param callback - Called with the new value, timestamp (ms), and sensor when the property changes
   *
   * @returns Disposable to stop all subscriptions
   */
  onSensorProperty<T = unknown>(sensorType: SensorType, property: string, callback: (value: T, timestamp: number, sensor: SensorLike) => void): Disposable;

  /**
   * Add a sensor to this camera.
   *
   * @param sensor - Sensor instance to add
   */
  addSensor<T extends object>(sensor: Sensor<T>): Promise<void>;

  /**
   * Remove a sensor from this camera.
   *
   * @param sensorId - ID of sensor to remove
   */
  removeSensor(sensorId: string): Promise<void>;

  /** Observable for sensor additions. Emits for this plugin's own sensors and for other plugins' sensors whose type is listed in `contract.consumes`, also when such a sensor is activated for this camera. */
  readonly onSensorAdded: Observable<{ sensorId: string; sensorType: SensorType }>;

  /** Observable for sensor removals. Emits for this plugin's own sensors and for other plugins' sensors on this camera, also when a sensor is deactivated for this camera. */
  readonly onSensorRemoved: Observable<{ sensorId: string; sensorType: SensorType }>;

  /** Observable for detection events (start/update/end/segment-*). Segments are only present on 'segment-*' messages; thumbnails are populated on 'segment-start' and 'segment-end'. */
  readonly onDetectionEvent: Observable<{ type: DetectionEventType; event: DetectionEvent }>;

  /**
   * Register a camera implementation for streaming and/or snapshot.
   * The impl value should implement StreamingInterface, SnapshotInterface, or both.
   *
   * @param impl - Object or class implementing camera interfaces
   */
  implement(impl: CameraImplementation): Promise<void>;
}

export interface StreamingInterface {
  /**
   * Get the streaming URL for a source.
   *
   * @param sourceId - The ID of the source
   *
   * @returns The streaming URL (e.g., rtsp://, rtmp://, or custom protocol)
   */
  streamUrl(sourceId: string): Promise<string>;
}

export interface SnapshotInterface {
  /**
   * Get a snapshot image from the camera.
   *
   * @param sourceId - The source ID to get the snapshot from
   *
   * @param forceNew - If true, bypass cache and get a fresh snapshot
   *
   * @returns Image data as ArrayBuffer, or undefined if unavailable
   */
  snapshot(sourceId: string, forceNew?: boolean): Promise<ArrayBuffer | undefined>;
}

export type CameraImplementation = StreamingInterface | SnapshotInterface | (StreamingInterface & SnapshotInterface);
