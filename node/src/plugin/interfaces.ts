import type { CameraConfig, CameraDevice } from '../camera/index.js';
import type { DiscoveredCamera } from '../manager/index.js';
import type { AudioFrameData } from '../sensor/audio.js';
import type { ClassifierDetection } from '../sensor/classifier.js';
import type { ClipEmbedding } from '../sensor/clip.js';
import type { Detection, VideoFrameData } from '../sensor/detection.js';
import type { FaceDetection } from '../sensor/face.js';
import type { LicensePlateDetection } from '../sensor/licensePlate.js';
import type { DeviceStorage, JsonSchema, JsonSchemaWithoutCallbacks } from '../storage/index.js';
import type { LoggerService } from '../types.js';
import type { PluginAPI } from './api.js';
import type { NotifierInterface } from './notifier.js';

/** Image metadata for detection test requests */
export interface ImageMetadata {
  width: number;
  height: number;
}

/** Audio metadata for detection test requests */
export interface AudioMetadata {
  mimeType: 'audio/mpeg' | 'audio/wav' | 'audio/ogg';
}

/** Response from a motion detection test */
export interface MotionDetectionPluginResponse {
  detected: boolean;
  detections: Detection[];
  /** Annotated video data with detection overlays, if available */
  videoData?: Buffer;
}

/** Response from an object detection test */
export interface ObjectDetectionPluginResponse {
  detected: boolean;
  detections: Detection[];
}

/** Response from an audio detection test */
export interface AudioDetectionPluginResponse {
  detected: boolean;
  detections: Detection[];
  decibels?: number;
}

/** Response from a face detection test */
export interface FaceDetectionPluginResponse {
  detected: boolean;
  detections: FaceDetection[];
  embeddingModel?: string;
}

/** Response from a license plate detection test */
export interface LicensePlateDetectionPluginResponse {
  detected: boolean;
  detections: LicensePlateDetection[];
}

/** Response from a classifier detection test */
export interface ClassifierDetectionPluginResponse {
  detected: boolean;
  detections: ClassifierDetection[];
}

/** Response from a CLIP embedding generation test */
export interface ClipDetectionPluginResponse {
  embeddings: ClipEmbedding[];
  embeddingModel: string;
}

/**
 * Result of a CLIP text embedding request — a single embedding vector plus
 * the model name used to produce it, so downstream code can refuse to mix
 * embeddings from different models.
 */
export interface ClipTextEmbeddingResult {
  embedding: number[];
  embeddingModel: string;
}

/**
 * Base class every plugin extends. It wires up the three dependencies the
 * host injects (logger, PluginAPI, DeviceStorage) and declares the lifecycle
 * methods the host calls on the plugin.
 *
 * Lifecycle order: the host calls `configureCameras()` once at startup with
 * every camera already assigned to this plugin, then calls `onCameraAdded()`
 * / `onCameraReleased()` as the user adds or removes cameras at runtime.
 *
 * The generic `T` types `storage.values` so plugin code gets autocompletion
 * for its own settings shape.
 *
 * @example
 * ```typescript
 * export default class MyPlugin extends BasePlugin<MyStorage> {
 *   private state = new Map<string, MyState>();
 *
 *   async configureCameras(cameras: CameraDevice[]): Promise<void> {
 *     for (const camera of cameras) await this.onCameraAdded(camera);
 *   }
 *
 *   async onCameraAdded(camera: CameraDevice): Promise<void> {
 *     this.state.set(camera.id, await this.attach(camera));
 *   }
 *
 *   async onCameraReleased(cameraId: string): Promise<void> {
 *     this.state.get(cameraId)?.dispose();
 *     this.state.delete(cameraId);
 *   }
 * }
 * ```
 */
export abstract class BasePlugin<T extends Record<string, any> = Record<string, any>> {
  constructor(
    public logger: LoggerService,
    public api: PluginAPI,
    public storage: DeviceStorage<T>,
  ) {}

  /**
   * Override to register a JSON schema for the plugin-level settings form
   *  rendered in the UI. Default: no schema.
   */
  get storageSchema(): JsonSchema[] {
    return [];
  }

  /**
   * Called once on startup with every camera that is already assigned to
   * this plugin. The plugin should attach handlers, open vendor sessions,
   * and warm up models. A rejection aborts plugin startup.
   *
   * @param cameras - Cameras already assigned to this plugin.
   */
  abstract configureCameras(cameras: CameraDevice[]): Promise<void>;

  /**
   * Called whenever a camera is assigned to this plugin at runtime — after
   * a discovery adoption (DiscoveryProvider.onAdoptCamera) or after the
   * user re-assigns an existing camera in the UI. The plugin should set up
   * the same per-camera state as in `configureCameras()`.
   *
   * @param camera - The camera device that was added.
   */
  abstract onCameraAdded(camera: CameraDevice): Promise<void>;

  /**
   * Called when a camera is unassigned from this plugin or deleted from
   * the system. The plugin must release per-camera resources (sessions,
   * timers, decoders) before resolving.
   *
   * @param cameraId - ID of the camera that was released.
   */
  abstract onCameraReleased(cameraId: string): Promise<void>;
}

/**
 * Implemented by plugins that can scan the network for new cameras and
 * adopt them. Only plugins with a camera-controlling role
 * (CameraController or CameraAndSensorProvider) are queried for discovery.
 */
export interface DiscoveryProvider {
  /**
   * Scan the network and return the cameras the plugin can offer for
   * adoption. Called by the host on demand (UI rescan button) or on a
   * polling schedule.
   *
   * @returns Cameras currently discoverable by this plugin.
   */
  onDiscoverCameras(): Promise<DiscoveredCamera[]>;

  /**
   * Return a JSON schema describing the form fields (credentials,
   * transport options, ...) the user must fill in to adopt this specific
   * discovered camera.
   *
   * @param camera - The discovered camera the user is about to adopt.
   *
   * @returns Schema for the adoption form.
   */
  onGetCameraSettings(camera: DiscoveredCamera): Promise<JsonSchemaWithoutCallbacks[]>;

  /**
   * Probe the device with the user-provided settings and return the
   * camera configuration the host should persist. The host then creates
   * the camera and invokes `onCameraAdded()` on the plugin.
   *
   * @param camera - The discovered camera being adopted.
   *
   * @param cameraSettings - Values entered into the adoption form.
   *
   * @returns Final camera configuration for the host to persist.
   */
  onAdoptCamera(camera: DiscoveredCamera, cameraSettings: Record<string, unknown>): Promise<CameraConfig>;
}

/**
 * Interface for plugins that provide motion detection.
 * Implement `testMotionDetection()` to handle detection test requests from the UI.
 */
export interface MotionDetectionInterface {
  /** Run motion detection on video data. Used by the UI for testing/previewing. */
  testMotionDetection(videoData: Buffer | Uint8Array, config: Record<string, unknown>): Promise<MotionDetectionPluginResponse | undefined>;
  /** Run motion detection on pre-processed video frames. Used by automations/benchmarks. */
  detectMotion?(frames: VideoFrameData[], config?: Record<string, unknown>): Promise<MotionDetectionPluginResponse | undefined>;
  /** Optional settings schema for motion detection configuration UI */
  motionDetectionSettings?(): Promise<JsonSchema[] | undefined>;
}

/**
 * Interface for plugins that provide object detection.
 * Implement `testObjectDetection()` to handle detection test requests from the UI.
 */
export interface ObjectDetectionInterface {
  /** Run object detection on image data. Used by the UI for testing/previewing. */
  testObjectDetection(imageData: Buffer | Uint8Array, metadata: ImageMetadata, config: Record<string, unknown>): Promise<ObjectDetectionPluginResponse | undefined>;
  /** Run object detection on a pre-processed frame. Used by automations/benchmarks. */
  detectObjects?(frame: VideoFrameData, config?: Record<string, unknown>): Promise<ObjectDetectionPluginResponse | undefined>;
  /** Optional settings schema for object detection configuration UI */
  objectDetectionSettings?(): Promise<JsonSchema[] | undefined>;
}

/**
 * Interface for plugins that provide audio detection.
 * Implement `testAudioDetection()` to handle detection test requests from the UI.
 */
export interface AudioDetectionInterface {
  /** Run audio detection on audio data. Used by the UI for testing/previewing. */
  testAudioDetection(audioData: Buffer | Uint8Array, metadata: AudioMetadata, config: Record<string, unknown>): Promise<AudioDetectionPluginResponse | undefined>;
  /** Run audio detection on pre-processed audio frames. Used by automations/benchmarks. */
  detectAudio?(audio: AudioFrameData, config?: Record<string, unknown>): Promise<AudioDetectionPluginResponse | undefined>;
  /** Optional settings schema for audio detection configuration UI */
  audioDetectionSettings?(): Promise<JsonSchema[] | undefined>;
}

/**
 * Interface for plugins that provide face detection.
 * Implement `testFaceDetection()` to handle detection test requests from the UI.
 * The NVR owns matching against enrolled faces; the plugin only emits raw
 * detections + embeddings.
 */
export interface FaceDetectionInterface {
  /** Run face detection on image data. Used by the UI for testing/previewing. */
  testFaceDetection(imageData: Buffer | Uint8Array, metadata: ImageMetadata, config: Record<string, unknown>): Promise<FaceDetectionPluginResponse | undefined>;
  /** Run face detection on a pre-processed frame. Used by automations/benchmarks. */
  detectFaces?(frame: VideoFrameData, config?: Record<string, unknown>): Promise<FaceDetectionPluginResponse | undefined>;
  /** Optional settings schema for face detection configuration UI */
  faceDetectionSettings?(): Promise<JsonSchema[] | undefined>;
}

/**
 * Interface for plugins that provide license plate detection.
 * Implement `testLicensePlateDetection()` to handle detection test requests from the UI.
 */
export interface LicensePlateDetectionInterface {
  /** Run license plate detection on image data. Used by the UI for testing/previewing. */
  testLicensePlateDetection(
    imageData: Buffer | Uint8Array,
    metadata: ImageMetadata,
    config: Record<string, unknown>,
  ): Promise<LicensePlateDetectionPluginResponse | undefined>;
  /** Run license plate detection on a pre-processed frame. Used by automations/benchmarks. */
  detectLicensePlates?(frame: VideoFrameData, config?: Record<string, unknown>): Promise<LicensePlateDetectionPluginResponse | undefined>;
  /** Optional settings schema for license plate detection configuration UI */
  licensePlateDetectionSettings?(): Promise<JsonSchema[] | undefined>;
}

/**
 * Interface for plugins that provide classifier detection.
 * Implement `testClassifierDetection()` to handle detection test requests from the UI.
 */
export interface ClassifierDetectionInterface {
  /** Run classifier detection on image data. Used by the UI for testing/previewing. */
  testClassifierDetection(
    imageData: Buffer | Uint8Array,
    metadata: ImageMetadata,
    config: Record<string, unknown>,
  ): Promise<ClassifierDetectionPluginResponse | undefined>;
  /** Run classifier detection on a pre-processed frame. Used by automations/benchmarks. */
  detectClassifications?(frame: VideoFrameData, config?: Record<string, unknown>): Promise<ClassifierDetectionPluginResponse | undefined>;
  /** Optional settings schema for classifier detection configuration UI */
  classifierDetectionSettings?(): Promise<JsonSchema[] | undefined>;
}

/**
 * Interface for plugins that provide CLIP embedding generation.
 * Implement `testClipEmbedding()` to handle detection test requests from the UI.
 */
export interface ClipDetectionInterface {
  /** Generate CLIP embeddings for an image. Used by the UI for testing/previewing. */
  testClipEmbedding(imageData: Buffer | Uint8Array, metadata: ImageMetadata, config: Record<string, unknown>): Promise<ClipDetectionPluginResponse | undefined>;
  /** Generate CLIP embeddings from a pre-processed frame. Used by automations/benchmarks. */
  detectClipEmbedding?(frame: VideoFrameData, config?: Record<string, unknown>): Promise<ClipDetectionPluginResponse | undefined>;
  /** Generate a CLIP text embedding for semantic search. */
  getTextEmbedding(text: string): Promise<ClipTextEmbeddingResult>;
  /** Optional settings schema for CLIP detection configuration UI */
  clipSettings?(): Promise<JsonSchema[] | undefined>;
}

/** Union of all optional plugin interfaces */
// prettier-ignore
export type PluginInterfaces = Partial<
  MotionDetectionInterface &
  ObjectDetectionInterface &
  AudioDetectionInterface &
  FaceDetectionInterface &
  LicensePlateDetectionInterface &
  ClassifierDetectionInterface &
  ClipDetectionInterface &
  DiscoveryProvider &
  NotifierInterface
>;
