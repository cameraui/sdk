import { Sensor, SensorType, SensorCategory } from './base.js';
import { defineSensor } from './meta.js';

import type { Observable } from '../observable/index.js';
import type { PropertyChangeOf, SensorLike } from './base.js';
import type { Detection } from './detection.js';
import type { AudioModelSpec } from './spec.js';

/** Built-in audio label types recognized across the system. */
export const BASE_AUDIO_LABELS = [
  'doorbell',
  'glass_break',
  'siren',
  'speaking',
  'gunshot',
  'dog_bark',
  'baby_cry',
  'alarm',
  'scream',
  'cat',
  'car_alarm',
  'smoke_alarm',
] as const;

/** Union of the built-in audio label strings. */
export type BaseAudioLabel = (typeof BASE_AUDIO_LABELS)[number];

/** Audio label — one of the built-in labels or any custom string emitted by an audio detector. */
export type AudioLabel = BaseAudioLabel | (string & {});

/**
 * Property names of an audio detection sensor.
 *
 * @internal
 */
export enum AudioProperty {
  /** Whether an audio event is currently detected. */
  Detected = 'detected',
  /** List of detected audio events (e.g. glass break, scream). */
  Detections = 'detections',
  /** Current audio level in decibels. */
  Decibels = 'decibels',
  /** Timestamp in milliseconds of the last detection trigger, set by the backend. */
  LastTriggered = 'lastTriggered',
}

/**
 * Property shape carried by an {@link AudioSensor}.
 *
 * @internal
 */
export interface AudioSensorProperties {
  [AudioProperty.Detected]: boolean;
  [AudioProperty.Detections]: Detection[];
  [AudioProperty.Decibels]: number;
}

/** Read-only proxy interface for an audio sensor. */
export interface AudioSensorLike extends SensorLike {
  /** Sensor type discriminant. */
  readonly type: SensorType.Audio;
  /** Property change observable narrowed to audio properties. */
  readonly onPropertyChanged: Observable<PropertyChangeOf<AudioSensorProperties>>;

  getValue(property: AudioProperty.Detected): boolean | undefined;
  getValue(property: AudioProperty.Detections): Detection[] | undefined;
  getValue(property: AudioProperty.Decibels): number | undefined;
  getValue(property: string): unknown;
}

/**
 * Audio sensor that reports audio events and decibel levels.
 *
 * Plugin authors call `reportDetections(list)` to push detected audio events
 * (auto-derives `detected`) and `setDecibels(value)` to update the audio level.
 */
export class AudioSensor<TStorage extends object = Record<string, any>> extends Sensor<AudioSensorProperties, TStorage> {
  readonly type = SensorType.Audio;
  readonly category = SensorCategory.Sensor;

  _requiresFrames = false;

  constructor(name = 'Audio Sensor') {
    super(name);

    this._writeState({
      [AudioProperty.Detected]: false,
      [AudioProperty.Detections]: [],
      [AudioProperty.Decibels]: 0,
    });
  }

  /** Whether an audio event is currently detected. */
  get detected(): boolean {
    return this.props.detected;
  }

  /** Current detection list. */
  get detections(): Detection[] {
    return this.props.detections;
  }

  /** Current audio level in decibels. */
  get decibels(): number {
    return this.props.decibels;
  }

  /**
   * Report detected audio events.
   *
   * - `reportDetections(true)` — audio detected without specifics. The SDK
   *   synthesizes a single full-frame `'audio'` detection.
   * - `reportDetections(true, [...])` — audio detected with explicit detections.
   * - `reportDetections(false)` — clear.
   *
   * @param detected - Whether an audio event is currently detected.
   *
   * @param detections - Optional explicit detections produced for this event.
   *
   * @example
   * ```ts
   * import type { Detection } from '@camera.ui/sdk';
   * sensor.reportDetections(true, [
   *   { label: 'glass_break', confidence: 0.91, box: { x: 0, y: 0, width: 1, height: 1 } } satisfies Detection,
   * ]);
   * sensor.reportDetections(false);
   * ```
   */
  reportDetections(detected: boolean, detections?: Detection[]): void {
    const list = this._normalizeReportedDetections(detected, detections, 'audio');
    this._writeState({
      [AudioProperty.Detected]: detected,
      [AudioProperty.Detections]: list,
    });
  }

  /**
   * Explicitly clear audio detection state (detected = false, detections = []).
   *
   * @example
   * ```ts
   * sensor.clearDetections();
   * ```
   */
  clearDetections(): void {
    this.reportDetections(false);
  }

  /**
   * Update the current audio level (in decibels).
   *
   * @param value - Audio level in decibels.
   *
   * @example
   * ```ts
   * sensor.setDecibels(72);
   * ```
   */
  setDecibels(value: number): void {
    this._writeState({ [AudioProperty.Decibels]: value });
  }

  /**
   * Read-only sensor: external writes are ignored. State is reported via `reportDetections`/`setDecibels`.
   *
   * Called by the cross-process plugin host when a generic property write is received.
   * Audio sensors have no externally writable properties, so the parameters are
   * unused (underscore-prefixed) and the call is a no-op.
   *
   * @param _property - Unused — audio sensors expose no writable properties.
   *
   * @param _value - Unused — audio sensors expose no writable properties.
   *
   * @internal
   */
  updateValue(_property: string, _value: unknown): void {
    // No-op — audio state is reported by the plugin, not set externally.
  }
}

/** Audio frame data delivered to audio detector sensors by the backend pipeline. */
export interface AudioFrameData {
  /** Camera the frame originated from. */
  cameraId?: string;
  /** Raw audio sample buffer. */
  data: ArrayBuffer | Buffer;
  /** Sample rate of the buffer in Hz. */
  sampleRate: number;
  /** Channel count of the buffer (typically 1 = mono). */
  channels: number;
  /** Sample format: `'pcm16'` = 16-bit signed integer PCM, `'float32'` = 32-bit float. */
  format: 'pcm16' | 'float32';
  /** Pre-computed decibel level for this frame, if available. */
  decibels?: number;
  /** Capture timestamp in milliseconds since epoch. */
  timestamp?: number;
}

/** Return type for {@link AudioDetectorSensor.detectAudio}. */
export interface AudioResult {
  /** Whether an audio event is detected in this frame. */
  detected: boolean;
  /** Detections emitted for this frame. */
  detections: Detection[];
  /** Optional decibel level computed for this frame. */
  decibels?: number;
}

/**
 * Audio detector that receives audio frames from the backend pipeline.
 * Extend this class and implement {@link detectAudio} to classify audio events.
 * The backend resamples and buffers audio to match {@link modelSpec} before
 * each call.
 */
export abstract class AudioDetectorSensor<TStorage extends object = Record<string, any>> extends AudioSensor<TStorage> {
  override _requiresFrames = true;

  /** Declares the expected audio input format. The backend resamples to match. */
  abstract readonly modelSpec: AudioModelSpec;

  /** Analyze a single audio frame for events. Called by the backend at the configured cadence. */
  abstract detectAudio(audio: AudioFrameData): Promise<AudioResult>;
}

/** Registry metadata for {@link AudioSensor}. */
export const audioMeta = defineSensor({
  type: SensorType.Audio,
  category: SensorCategory.Sensor,
  assignmentKey: 'audio',
  multiProvider: false,
  isDetectionType: true,
  properties: Object.values(AudioProperty),
  semantics: null,
});
