import type { CameraConfig, CameraDevice, Point } from '../camera/index.js';
import type { AdoptedSensor, DiscoveredCamera, DiscoveredSensor } from '../manager/index.js';
import type { AudioFrameData } from '../sensor/audio.js';
import type { ClassifierDetection } from '../sensor/classifier.js';
import type { ClipEmbedding } from '../sensor/clip.js';
import type { Sensor, SensorLike } from '../sensor/base.js';
import type { BoundingBox, Detection, VideoFrameData } from '../sensor/detection.js';
import type { FaceDetection } from '../sensor/face.js';
import type { LicensePlateDetection } from '../sensor/licensePlate.js';
import type { ObjectMask } from '../sensor/segmenter.js';
import type { DeviceStorage, JsonSchema, JsonSchemaWithoutCallbacks } from '../storage/index.js';
import type { LoggerService } from '../types.js';
import type { PluginAPI } from './api.js';
import type { AssistantToolProvider } from './assistant.js';
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
  /** Located faces. Vectors come from a face-embedding plugin, not from here. */
  detections: FaceDetection[];
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
  /** [floor, ceiling] of raw text-image cosine scores for this model; consumers map scores to a 0..1 relevance scale and treat a missing band as score 0. */
  scoreBand: [number, number];
}

/** Result of a face embedding run on a single image. */
export interface FaceEmbeddingPluginResponse {
  /** Embedding vector for the face, empty when no face could be embedded. */
  embedding: number[];
  /** Model that produced the embedding; consumers must not mix models. */
  embeddingModel: string;
  /** The five points the face was aligned on, in 0 - 1 of the input image: right eye, left eye, nose, right and left mouth corner. */
  landmarks?: Point[];
  /** How sure the model is that those points sit on a face (0 - 1). */
  quality?: number;
}

/** Result of a person embedding run on a single image. */
export interface PersonEmbeddingPluginResponse {
  /** Embedding vector for the person, empty when the picture could not be embedded. */
  embedding: number[];
  /** Model that produced the embedding; consumers must not mix models. */
  embeddingModel: string;
}

/** A picture to outline an object in, with the object's box. */
export interface SegmentationImage {
  /** Encoded image (JPEG/PNG). */
  image: Buffer | Uint8Array;
  /** Box of the object to outline, normalized to the image. */
  box: BoundingBox;
}

/** Result of a segmentation run on a single image. */
export interface SegmentationPluginResponse {
  /** The object's outline, missing when the model found no object at the box. */
  mask?: ObjectMask;
}

/** Result of a CLIP text embedding request. */
export interface ClipTextEmbeddingResult {
  /** Embedding vector for the query text. */
  embedding: number[];
  /** Model that produced the embedding; consumers must not mix models. */
  embeddingModel: string;
  /** [floor, ceiling] of raw text-image cosine scores for this model; consumers map scores to a 0..1 relevance scale and treat a missing band as score 0. */
  scoreBand: [number, number];
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
 * Base class for a plugin with the role {@link PluginRole.Service}: it serves
 * camera.ui itself and never touches cameras, so the camera lifecycle hooks are
 * already implemented as no-ops.
 *
 * @example
 * ```ts
 * export default class MyModels extends ServicePlugin implements AssistantModelProvider {
 *   assistantModels(): AssistantModelSpec[] {
 *     return [{ id: 'local', name: 'Local model', contextTokens: 8192, vision: false, toolCalling: false, structuredOutput: true }];
 *   }
 * }
 * ```
 */
export abstract class ServicePlugin<T extends Record<string, any> = Record<string, any>> extends BasePlugin<T> {
  public async configureCameras(): Promise<void> {}

  public async onCameraAdded(): Promise<void> {}

  public async onCameraReleased(): Promise<void> {}
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
 * Implemented by sensor-providing plugins that face an external inventory
 * (Home Assistant entities, vendor accessories) the user picks from instead
 * of the plugin importing everything. Declare `PluginInterface.SensorDiscovery`
 * in the contract.
 *
 * The host owns the adoption: it lists what the plugin discovers, creates the
 * sensor record when the user adopts, hands the plugin its adopted sensors on
 * every start and tells it when the user deletes one. The plugin keeps no
 * list of its own.
 *
 * Identity is the source's stable id (`DiscoveredSensor.id`), never an
 * address; the same id means the same sensor across restarts and renames.
 */
export interface SensorDiscoveryProvider {
  /**
   * Return every sensor the source currently offers. The host drops the ones
   * already adopted, the plugin does not filter. Called on demand (Sensors
   * page, rescan) and on a polling schedule while the page is open.
   *
   * @returns Sensors currently discoverable by this plugin.
   */
  onDiscoverSensors(): Promise<DiscoveredSensor[]>;

  /**
   * Called once at startup, right after `configureCameras()`, with every
   * sensor the user adopted from this plugin. Build and return one runtime
   * sensor per record, always, from the record's type and name alone; the
   * host binds each returned sensor to its record by `nativeId`. Report what
   * the source looks like on the sensor itself (`setSourceState`,
   * `setAddress`) as soon as you know: a record the source no longer has gets
   * `setSourceState('removed')`, it is never dropped here.
   *
   * @param sensors - The adopted sensors of this plugin.
   *
   * @returns One runtime sensor per adopted record.
   */
  configureAdoptedSensors(sensors: AdoptedSensor[]): Promise<Sensor<any, any, any>[]>;

  /**
   * The user adopted a discovered sensor and the host created its record.
   * Build and return the runtime sensor for it, same as one entry of
   * `configureAdoptedSensors()`.
   *
   * @param sensor - The adopted sensor.
   *
   * @returns The runtime sensor to bind to the record.
   */
  onSensorAdopted(sensor: AdoptedSensor): Promise<Sensor<any, any, any>>;

  /**
   * The user deleted an adopted sensor. The host has already unbound the
   * runtime sensor; drop whatever the plugin still holds for it. The entity
   * shows up as discovered again on the next scan.
   *
   * @param nativeId - The `DiscoveredSensor.id` the adoption used.
   */
  onSensorUnadopted(nativeId: string): Promise<void>;
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

/**
 * Implemented by plugins that turn a face crop into an embedding vector. Split
 * from face detection so the two can run on different hosts: locating a face is
 * cheap, embedding it is not.
 */
export interface FaceEmbeddingInterface {
  /**
   * Embed a batch of encoded images (JPEG/PNG), each showing one face: one result per
   * input in the same order. An empty `embedding` means the picture holds no face this
   * model can use, undefined that the plugin could not run at all — the caller may drop
   * such a picture, so the two must not be mixed up. Meant for re-embedding stored
   * pictures after an embedding-model change. `landmarks` holds the points an earlier
   * result returned for the same picture, one entry per image: with them the face is
   * not searched again.
   */
  embedFaceImages(
    images: (Buffer | Uint8Array)[],
    config?: Record<string, unknown>,
    landmarks?: (Point[] | undefined)[],
  ): Promise<(FaceEmbeddingPluginResponse | undefined)[]>;
  /** Return the JSON schema for the face-embedding settings form in the UI, or undefined for no schema. */
  faceEmbeddingSettings?(): Promise<JsonSchema[] | undefined>;
}

/**
 * Implemented by plugins that turn the crop of a person into a vector of their
 * appearance. The NVR stores and searches the vectors, the plugin only emits
 * them.
 */
export interface PersonEmbeddingInterface {
  /**
   * Embed a batch of encoded images (JPEG/PNG), each showing one person cut
   * tight around their box: one result per input in the same order. An empty
   * `embedding` means the picture could not be used, undefined that the plugin
   * could not run at all. Meant for searching by a picture the user picked.
   */
  embedPersonImages(images: (Buffer | Uint8Array)[], config?: Record<string, unknown>): Promise<(PersonEmbeddingPluginResponse | undefined)[]>;
  /** Return the JSON schema for the person-embedding settings form in the UI, or undefined for no schema. */
  personEmbeddingSettings?(): Promise<JsonSchema[] | undefined>;
}

/**
 * Implemented by plugins that outline objects: a mask that separates an object
 * from its background. The frame-based side is the segmenter sensor.
 */
export interface SegmentationInterface {
  /**
   * Outline the object at `box` in each picture: one result per input in the
   * same order, undefined when the plugin could not run at all. `config` holds
   * the values of the segmentation settings form.
   */
  segmentImages(images: SegmentationImage[], config?: Record<string, unknown>): Promise<(SegmentationPluginResponse | undefined)[]>;
  /** Return the JSON schema for the segmentation settings form in the UI, or undefined for no schema. */
  segmentationSettings?(): Promise<JsonSchema[] | undefined>;
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
  FaceEmbeddingInterface &
  PersonEmbeddingInterface &
  SegmentationInterface &
  LicensePlateDetectionInterface &
  ClassifierDetectionInterface &
  ClipDetectionInterface &
  DiscoveryProvider &
  SensorDiscoveryProvider &
  NotifierInterface &
  AssistantToolProvider
>;
