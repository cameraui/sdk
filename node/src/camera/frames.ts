import type { sharp } from '../external.js';
import type { DecoderFormat, ImageInputFormat, ImageOutputFormat } from './enums.js';

/**
 * Decoded frame metadata from the video decoder.
 */
export interface FrameMetadata {
  /** Decoder format */
  format: DecoderFormat;
  /** Total frame data size in bytes */
  frameSize: number;
  /** Current frame width (may be scaled) */
  width: number;
  /** Current frame height (may be scaled) */
  height: number;
  /** Original video width before scaling */
  origWidth: number;
  /** Original video height before scaling */
  origHeight: number;
}

/**
 * Image dimension and format information.
 */
export interface ImageInformation {
  /** Image width in pixels */
  width: number;
  /** Image height in pixels */
  height: number;
  /** Number of color channels (1=gray, 3=RGB, 4=RGBA) */
  channels: number;
  /** Pixel format */
  format: ImageInputFormat;
}

/**
 * Crop region for image processing.
 */
export interface ImageCrop {
  /** Top offset in pixels */
  top: number;
  /** Left offset in pixels */
  left: number;
  /** Crop width in pixels */
  width: number;
  /** Crop height in pixels */
  height: number;
}

/**
 * Resize dimensions for image processing.
 */
export interface ImageResize {
  /** Target width in pixels */
  width: number;
  /** Target height in pixels */
  height: number;
}

/**
 * Output format conversion option.
 */
export interface ImageFormat {
  /** Target pixel format */
  to: ImageOutputFormat;
}

/**
 * Combined image processing options.
 */
export interface ImageOptions {
  /** Output format conversion */
  format?: ImageFormat;
  /** Crop region */
  crop?: ImageCrop;
  /** Resize dimensions */
  resize?: ImageResize;
}

/**
 * Processed image with sharp instance.
 */
export interface FrameImage {
  /** Sharp image instance for further processing */
  image: sharp.Sharp;
  /** Image information */
  info: ImageInformation;
}

/**
 * Processed image as raw buffer.
 */
export interface FrameBuffer {
  /** Raw pixel data */
  image: Uint8Array;
  /** Image information */
  info: ImageInformation;
}

/**
 * Raw frame data from decoder.
 */
export interface FrameData {
  /** Unique frame identifier */
  id: string;
  /** Raw frame pixel data */
  data: Uint8Array;
  /** Frame capture timestamp */
  timestamp: number;
  /** Decoder metadata */
  metadata: FrameMetadata;
  /** Image information */
  info: ImageInformation;
}

/**
 * Video frame with processing capabilities.
 * Provides methods to convert raw decoder output to usable image formats.
 */
export interface VideoFrame {
  /** Unique frame identifier */
  readonly id: string;
  /** Raw frame pixel data */
  readonly data: Uint8Array;
  /** Decoder metadata */
  readonly metadata: FrameMetadata;
  /** Image information */
  readonly info: ImageInformation;
  /** Frame capture timestamp */
  readonly timestamp: number;
  /** Original video width */
  readonly inputWidth: number;
  /** Original video height */
  readonly inputHeight: number;
  /** Decoder output format */
  readonly inputFormat: DecoderFormat;

  /**
   * Convert frame to raw pixel buffer.
   *
   * @returns Processed image buffer with metadata
   */
  toBuffer(): Promise<FrameBuffer>;

  /**
   * Convert frame to sharp image instance.
   *
   * @returns Sharp image for further processing
   */
  toImage(): Promise<FrameImage>;
}

/**
 * Frame worker (decoder) settings.
 */
export interface CameraFrameWorkerSettings {
  /** Target frames per second for detection */
  fps: number;
}

/**
 * Snapshot settings for a camera.
 */
export interface SnapshotSettings {
  /** Enable automatic snapshot refresh */
  autoRefresh: boolean;
  /** Cache TTL in seconds (how long a snapshot is valid) */
  ttl: number;
  /** Auto-refresh interval in seconds (min: 10, max: 60) */
  interval: number;
}
