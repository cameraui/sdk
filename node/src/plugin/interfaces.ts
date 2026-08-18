import type { CameraConfig, CameraDevice } from '../camera/index.js';
import type { DiscoveredCamera } from '../manager/index.js';
import type { AudioFrameData } from '../sensor/audio.js';
import type { ClassifierDetection } from '../sensor/classifier.js';
import type { ClipEmbedding } from '../sensor/clip.js';
import type { SensorLike } from '../sensor/base.js';
import type { Detection, VideoFrameData } from '../sensor/detection.js';
import type { FaceDetection } from '../sensor/face.js';
import type { LicensePlateDetection } from '../sensor/licensePlate.js';
import type { DeviceStorage, JsonSchema, JsonSchemaWithoutCallbacks } from '../storage/index.js';
import type { LoggerService } from '../types.js';
import type { PluginAPI } from './api.js';
import type { NotifierInterface } from './notifier.js';

/** Image metadata passed to detector test methods. */
export interface ImageMetadata {
  /** Image width in pixels. */
  width: number;
  /** Image height in pixels. */
  height: number;
}

/** Audio metadata passed to audio detector test methods. */
export interface AudioMetadata {
  /** Container format of the audio buffer. */
  mimeType: 'audio/mpeg' | 'audio/wav' | 'audio/ogg';
}

/** Result of a motion detection run. */
export interface MotionDetectionPluginResponse {
  /** True when the run produced at least one detection. */
  detected: boolean;
  /** Motion regions found in the input. */
  detections: Detection[];
  /** Annotated re-encoded clip for the UI test panel, when the plugin renders one. */
  videoData?: Buffer;
}

/** Result of an object detection run. */
export interface ObjectDetectionPluginResponse {
  /** True when the run produced at least one detection. */
  detected: boolean;
  /** Detected objects with label, score and bounding box. */
  detections: Detection[];
}

/** Result of an audio detection run. */
export interface AudioDetectionPluginResponse {
  /** True when the run produced at least one detection. */
  detected: boolean;
  /** Detected audio events. */
  detections: Detection[];
  /** Loudness of the analysed buffer in dBFS. */
  decibels?: number;
}

/** Result of a face detection run. */
export interface FaceDetectionPluginResponse {
  /** True when the run produced at least one detection. */
  detected: boolean;
  /** Detected faces, each with its embedding. */
  detections: FaceDetection[];
  /** Model that produced the embeddings; consumers must not mix models. */
  embeddingModel?: string;
}

/** Result of a license plate detection run. */
export interface LicensePlateDetectionPluginResponse {
  /** True when the run produced at least one detection. */
  detected: boolean;
  /** Detected plates with their OCR text. */
  detections: LicensePlateDetection[];
}

/** Result of a classifier detection run. */
export interface ClassifierDetectionPluginResponse {
  /** True when the run produced at least one classification. */
  detected: boolean;
  /** Attribute/label pairs the classifier emitted. */
  detections: ClassifierDetection[];
}

/** Result of a CLIP image embedding run. */
export interface ClipDetectionPluginResponse {
  /** Embedding vectors generated for the input. */
  embeddings: ClipEmbedding[];
  /** Model that produced the embeddings; consumers must not mix models. */
  embeddingModel: string;
}

/** Result of a CLIP text embedding request. */
export interface ClipTextEmbeddingResult {
  /** Embedding vector for the query text. */
  embedding: number[];
  /** Model that produced the embedding; consumers must not mix models. */
  embeddingModel: string;
}

/**
 * Base class every plugin extends. It wires up the three dependencies the
 * host injects (logger, PluginAPI, DeviceStorage) and declares the lifecycle
 * methods the host calls on the plugin.
 *
 * The host calls `configureCameras()` once at startup with every camera
 * already assigned to this plugin, then `onCameraAdded()` / `onCameraReleased()`
 * as the user adds or removes cameras at runtime. The generic `T` types
 * `storage.values` so plugin code gets autocompletion for its own settings shape.
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

  /** Override to register a JSON schema for the plugin-level settings form rendered in the UI. Default: no schema. */
  get storageSchema(): JsonSchema[] {
    return [];
  }

  /**
   * Called once on startup with every camera that is already assigned to
   * this plugin. Attach handlers, open vendor sessions, warm up models here.
   * A rejection aborts plugin startup.
   *
   * @param cameras - Cameras already assigned to this plugin.
   */
  abstract configureCameras(cameras: CameraDevice[]): Promise<void>;

  /**
   * Called whenever a camera is assigned to this plugin at runtime, after a
   * discovery adoption (DiscoveryProvider.onAdoptCamera) or after the user
   * re-assigns an existing camera. Set up the same per-camera state as in
   * `configureCameras()`.
   *
   * @param camera - The camera device that was added.
   */
  abstract onCameraAdded(camera: CameraDevice): Promise<void>;

  /**
   * Called when a camera is unassigned from this plugin or deleted from the
   * system. Release per-camera resources (sessions, timers, decoders) before
   * resolving.
   *
   * @param cameraId - ID of the camera that was released.
   */
  abstract onCameraReleased(cameraId: string): Promise<void>;

  /**
   * Called once on startup with every sensor this plugin may consume: sensors
   * whose type is listed in `contract.consumes` and that are exposed. Each
   * sensor carries `type`, `assignedCameraIds`, `assignmentLocked` and
   * `connected`, so consumers decide rendering purely from that data.
   * Optional, only bridge plugins implement it.
   *
   * @param sensors - Consumable sensors known at startup.
   */
  configureSensors?(sensors: SensorLike[]): Promise<void>;

  /**
   * Called when a sensor enters this plugin's consumable view at runtime: it
   * was created, became exposed, or its type became consumable.
   *
   * @param sensor - The sensor that appeared.
   */
  onSensorAdded?(sensor: SensorLike): Promise<void>;

  /**
   * Called when a sensor permanently leaves the consumable view: it was
   * deleted or unexposed. Plugin connectivity does NOT fire this, watch
   * `sensor.onConnectedChanged` for that.
   *
   * @param sensorId - Persistent id of the sensor that left.
   */
  onSensorReleased?(sensorId: string): Promise<void>;
}

/**
 * Implemented by plugins that can scan the network for new cameras and adopt
 * them. Only plugins with a camera-controlling role (CameraController or
 * CameraAndSensorProvider) are queried for discovery.
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
   * Return a JSON schema describing the form fields (credentials, transport
   * options, ...) the user must fill in to adopt this discovered camera.
   *
   * @param camera - The discovered camera the user is about to adopt.
   *
   * @returns Schema for the adoption form.
   */
  onGetCameraSettings(camera: DiscoveredCamera): Promise<JsonSchemaWithoutCallbacks[]>;

  /**
   * Probe the device with the user-provided settings and return the camera
   * configuration the host should persist. The host then creates the camera
   * and invokes `onCameraAdded()` on the plugin.
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
 * Implemented by plugins that perform video-based motion detection. The host
 * invokes `testMotionDetection()` from the UI test panel and `detectMotion()`
 * from automation / benchmark pipelines.
 */
export interface MotionDetectionInterface {
  /** Run detection on a raw video buffer captured by the UI test panel and return the result for preview rendering. */
  testMotionDetection(videoData: Buffer | Uint8Array, config: Record<string, unknown>): Promise<MotionDetectionPluginResponse | undefined>;
  /** Run detection on already-decoded frames, supplied by automation / benchmark pipelines to avoid re-encoding. */
  detectMotion?(frames: VideoFrameData[], config?: Record<string, unknown>): Promise<MotionDetectionPluginResponse | undefined>;
  /** Return the JSON schema used to render the motion-detection settings form in the UI, or undefined for no schema. */
  motionDetectionSettings?(): Promise<JsonSchema[] | undefined>;
}

/** Implemented by plugins that perform object detection (person, vehicle, animal, ...). */
export interface ObjectDetectionInterface {
  /** Run detection on a single image captured by the UI test panel; `metadata` carries the image dimensions. */
  testObjectDetection(imageData: Buffer | Uint8Array, metadata: ImageMetadata, config: Record<string, unknown>): Promise<ObjectDetectionPluginResponse | undefined>;
  /** Run detection on a pre-decoded video frame. Called from automation / benchmark pipelines. */
  detectObjects?(frame: VideoFrameData, config?: Record<string, unknown>): Promise<ObjectDetectionPluginResponse | undefined>;
  /** Return the JSON schema used to render the object-detection settings form in the UI, or undefined for no schema. */
  objectDetectionSettings?(): Promise<JsonSchema[] | undefined>;
}

/** Implemented by plugins that perform audio event or keyword detection. */
export interface AudioDetectionInterface {
  /** Run detection on an audio buffer captured by the UI test panel; `metadata` carries the input MIME type. */
  testAudioDetection(audioData: Buffer | Uint8Array, metadata: AudioMetadata, config: Record<string, unknown>): Promise<AudioDetectionPluginResponse | undefined>;
  /** Run detection on a pre-decoded audio frame. Called from automation / benchmark pipelines. */
  detectAudio?(audio: AudioFrameData, config?: Record<string, unknown>): Promise<AudioDetectionPluginResponse | undefined>;
  /** Return the JSON schema used to render the audio-detection settings form in the UI, or undefined for no schema. */
  audioDetectionSettings?(): Promise<JsonSchema[] | undefined>;
}

/**
 * Implemented by plugins that locate faces and emit per-face embeddings. The
 * NVR owns matching against enrolled faces, the plugin only emits raw
 * detections and embeddings.
 */
export interface FaceDetectionInterface {
  /** Run face detection on a single image captured by the UI test panel and return the result for preview rendering. */
  testFaceDetection(imageData: Buffer | Uint8Array, metadata: ImageMetadata, config: Record<string, unknown>): Promise<FaceDetectionPluginResponse | undefined>;
  /** Run face detection on a pre-decoded video frame. */
  detectFaces?(frame: VideoFrameData, config?: Record<string, unknown>): Promise<FaceDetectionPluginResponse | undefined>;
  /** Return the JSON schema for the face-detection settings form in the UI, or undefined for no schema. */
  faceDetectionSettings?(): Promise<JsonSchema[] | undefined>;
}

/** Implemented by plugins that locate license plates and run OCR on them. */
export interface LicensePlateDetectionInterface {
  /** Run detection on a single image captured by the UI test panel and return the result for preview rendering. */
  testLicensePlateDetection(
    imageData: Buffer | Uint8Array,
    metadata: ImageMetadata,
    config: Record<string, unknown>,
  ): Promise<LicensePlateDetectionPluginResponse | undefined>;
  /** Run detection on a pre-decoded video frame. */
  detectLicensePlates?(frame: VideoFrameData, config?: Record<string, unknown>): Promise<LicensePlateDetectionPluginResponse | undefined>;
  /** Return the JSON schema for the license-plate-detection settings form in the UI, or undefined for no schema. */
  licensePlateDetectionSettings?(): Promise<JsonSchema[] | undefined>;
}

/**
 * Implemented by plugins that run a generic image classifier and emit
 * attribute/label pairs (e.g. weather, scene, activity).
 */
export interface ClassifierDetectionInterface {
  /** Run classification on a single image captured by the UI test panel and return the result for preview rendering. */
  testClassifierDetection(
    imageData: Buffer | Uint8Array,
    metadata: ImageMetadata,
    config: Record<string, unknown>,
  ): Promise<ClassifierDetectionPluginResponse | undefined>;
  /** Run classification on a pre-decoded video frame. */
  detectClassifications?(frame: VideoFrameData, config?: Record<string, unknown>): Promise<ClassifierDetectionPluginResponse | undefined>;
  /** Return the JSON schema for the classifier-detection settings form in the UI, or undefined for no schema. */
  classifierDetectionSettings?(): Promise<JsonSchema[] | undefined>;
}

/**
 * Implemented by plugins that generate CLIP image and text embeddings used
 * for semantic search over recorded events.
 */
export interface ClipDetectionInterface {
  /** Run the CLIP image branch on a single image captured by the UI test panel. */
  testClipEmbedding(imageData: Buffer | Uint8Array, metadata: ImageMetadata, config: Record<string, unknown>): Promise<ClipDetectionPluginResponse | undefined>;
  /** Run the CLIP image branch on a pre-decoded video frame. */
  detectClipEmbedding?(frame: VideoFrameData, config?: Record<string, unknown>): Promise<ClipDetectionPluginResponse | undefined>;
  /**
   * Run the CLIP image branch over a batch of encoded images (JPEG/PNG): one result per
   * input in the same order, undefined where decoding or embedding failed. Meant for
   * re-indexing stored images after an embedding-model change.
   */
  embedImages?(images: (Buffer | Uint8Array)[], config?: Record<string, unknown>): Promise<(ClipDetectionPluginResponse | undefined)[]>;
  /** Run the CLIP text branch and return a vector usable for semantic-search queries against stored image embeddings. */
  getTextEmbedding(text: string): Promise<ClipTextEmbeddingResult>;
  /**
   * Run the CLIP text branch once per embedding space the plugin can currently serve,
   * the configured search model first. Lets semantic search also cover embeddings
   * produced by an older model during a transition.
   */
  getTextEmbeddings?(text: string): Promise<ClipTextEmbeddingResult[]>;
  /** Return the JSON schema for the CLIP settings form in the UI, or undefined for no schema. */
  clipSettings?(): Promise<JsonSchema[] | undefined>;
}

/** Union of all optional plugin interfaces. */
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
