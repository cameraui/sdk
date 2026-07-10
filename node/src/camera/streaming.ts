import type { RtpPacket } from '../external.js';
import type { Subscribed } from '../internal/streaming-internal.js';
import type { ReplaySubject, Subject } from '../observable/index.js';
import type { AudioCodec, AudioFFmpegCodec, ProbeAudioCodec, RTSPAudioCodec, StreamDirection, VideoCodec, VideoFFmpegCodec } from './enums.js';

/**
 * WebSocket streaming URLs from go2rtc.
 */
export interface Go2RtcWSSource {
  /** WebRTC signaling endpoint */
  webrtc: string;
  /** MSE streaming endpoint */
  mse: string;
}

/**
 * RTSP streaming URLs from go2rtc.
 */
export interface Go2RtcRTSPSource {
  /** Base RTSP URL */
  base: string;
  /** Default stream (video + audio) */
  default: string;
  /** Video only (muted) */
  muted: string;
  /** Audio only (no video) */
  audioOnly: string;
  /** Stream with AAC audio URL */
  aac: string;
  /** Stream with Opus audio URL */
  opus: string;
  /** Stream with PCMA audio URL */
  pcma: string;
  /** ONVIF URL */
  onvif: string;
  /** Stream URL with GOP cache disabled */
  noGop: string;
}

/**
 * Snapshot/image URLs from go2rtc.
 */
export interface Go2RtcSnapshotSource {
  /** MP4 single-frame video URL */
  mp4: string;
  /** JPEG snapshot URL */
  jpeg: string;
  /** MJPEG stream URL */
  mjpeg: string;
}

/**
 * Collection of all streaming URLs for a camera source.
 */
export interface StreamUrls {
  /** WebSocket URLs */
  ws: Go2RtcWSSource;
  /** RTSP URLs */
  rtsp: Go2RtcRTSPSource;
  /** Snapshot URLs */
  snapshot: Go2RtcSnapshotSource;
}

/**
 * Configuration for stream probing.
 */
export interface ProbeConfig {
  /** Include video track info */
  video?: boolean;
  /** Include audio track info (true, 'all', or specific codecs) */
  audio?: boolean | 'all' | ProbeAudioCodec[];
  /** Include microphone/backchannel info */
  microphone?: boolean;
}

/**
 * Format parameters (fmtp) from SDP.
 */
export interface FMTPInfo {
  /** RTP payload type number */
  payload: number;
  /** Codec-specific configuration string */
  config: string;
}

/**
 * RTP stream information.
 */
export interface RTPInfo {
  /** RTP payload type number */
  payload?: number;
  /** Codec name */
  codec: string;
  /** Codec profile */
  profile?: string;
  /** Codec clock rate */
  rate?: number;
  /** Encoding parameters */
  encoding?: number;
  /** Codec level */
  level?: number;
}

/**
 * Audio codec properties from stream probe.
 */
export interface AudioCodecProperties {
  /** Audio sample rate in Hz */
  sampleRate: number;
  /** Number of audio channels */
  channels: number;
  /** RTP payload type */
  payloadType: number;
  /** Optional format parameters */
  fmtpInfo?: FMTPInfo;
}

/**
 * Video codec properties from stream probe.
 */
export interface VideoCodecProperties {
  /** Video clock rate */
  clockRate: number;
  /** RTP payload type */
  payloadType: number;
  /** Optional format parameters */
  fmtpInfo?: FMTPInfo;
}

/**
 * Audio stream information from probe.
 */
export interface AudioStreamInfo {
  /** Audio codec */
  codec: AudioCodec;
  /** FFmpeg codec name */
  ffmpegCodec: AudioFFmpegCodec;
  /** Codec properties */
  properties: AudioCodecProperties;
  /** Stream direction */
  direction: StreamDirection;
}

/**
 * Video stream information from probe.
 */
export interface VideoStreamInfo {
  /** Video codec */
  codec: VideoCodec;
  /** FFmpeg codec name */
  ffmpegCodec: VideoFFmpegCodec;
  /** Codec properties */
  properties: VideoCodecProperties;
  /** Stream direction */
  direction: StreamDirection;
}

/**
 * Stream probe result containing SDP and track information.
 */
export interface ProbeStream {
  /** Raw SDP string */
  sdp: string;
  /** Available audio tracks */
  audio: AudioStreamInfo[];
  /** Available video tracks */
  video: VideoStreamInfo[];
}

/**
 * Options for generating RTSP URLs.
 */
export interface RTSPUrlOptions {
  /** Include video track */
  video?: boolean;
  /** Include audio track(s) */
  audio?: boolean | RTSPAudioCodec | RTSPAudioCodec[];
  /** Request keyframe at start (GOP) */
  gop?: boolean;
  /** Combine audio tracks into single track */
  audioSingleTrack?: boolean;
  /** Enable backchannel (two-way audio) */
  backchannel?: boolean;
  /** Connection timeout in s */
  timeout?: number;
}

/**
 * Options for generating snapshot URLs.
 */
export interface SnapshotUrlOptions {
  /** Output width in pixels */
  width?: number;
  /** Output height in pixels */
  height?: number;
  /** Rotation in degrees */
  rotate?: 90 | 180 | 270 | -90;
  /** Cache key/strategy */
  cache?: string;
  /** Hardware acceleration backend */
  hw?: 'vaapi' | 'v4l2m2m' | 'cuda' | 'dxva2' | 'videotoolbox' | 'rkmpp';
  /** Request keyframe at start (GOP) */
  gop?: boolean;
}

/**
 * Hardware acceleration options.
 */
export type HardwareAcceleration =
  | 'auto'
  | 'amf'
  | 'cuda'
  | 'd3d11va'
  | 'd3d12va'
  | 'drm'
  | 'dxva2'
  | 'mediacodec'
  | 'ohcodec'
  | 'opencl'
  | 'qsv'
  | 'rkmpp'
  | 'vaapi'
  | 'vdpau'
  | 'videotoolbox'
  | 'vulkan';

/**
 * RTP streaming session configuration.
 */
export interface RtpSessionOptions {
  /** Hardware acceleration method */
  hardware?: HardwareAcceleration;

  /** Stream input options */
  input?: {
    options?: Record<string, string | number | boolean | null | undefined>;
  };

  /** Video encoding options */
  video?: {
    /** Maximum transmission unit */
    mtu?: number;
    /** Synchronization source identifier */
    ssrc?: number;
    /** RTP payload type */
    payloadType?: number;
    /** Video codec */
    codec?: 'h264' | 'hevc';
    /** Target framerate */
    fps?: number;
    /** Output width */
    width?: number;
    /** Output height */
    height?: number;
    /** Additional encoder options */
    encoderOptions?: Record<string, string | number | boolean | undefined | null>;
  };

  /** Audio encoding options */
  audio?: {
    /** Maximum transmission unit */
    mtu?: number;
    /** Synchronization source identifier */
    ssrc?: number;
    /** RTP payload type */
    payloadType?: number;
    /** Audio codec */
    codec?: 'aac' | 'opus' | 'pcma' | 'pcmu';
    /** Audio sample rate */
    sampleRate?: number;
    /** Audio channels */
    channels?: number;
    /** Frame duration in ms */
    frameDuration?: number;
    /** Additional encoder options */
    encoderOptions?: Record<string, string | number | boolean | undefined | null>;
  };
}

/**
 * Backchannel (two-way audio) configuration for RTP sessions.
 */
export interface RtpSessionBackchannelOptions {
  /** Audio decoder codec */
  decoderCodec: 'libfdk_aac' | 'libopus' | 'pcm_alaw' | 'pcm_mulaw';
  /** RTP payload type */
  payloadType: number;
  /** Audio clock rate */
  clockRate: number;
  /** PCM sample format */
  sampleFormat?: string;
  /** Audio channels */
  channels?: number;
  /** Format parameters */
  fmtp?: string;
  /** SRTP encryption configuration */
  srtp?: {
    key: Buffer;
    salt: Buffer;
    suite?: 'AES_CM_128_HMAC_SHA1_80' | 'AES_CM_256_HMAC_SHA1_80';
  };
}

/**
 * RTP streaming session for HomeKit and other RTP-based integrations.
 * Provides raw RTP packet access for video and audio streams.
 */
export interface RtpSession extends Subscribed {
  /** Emits when stream successfully starts */
  readonly onStarted: ReplaySubject<void>;
  /** Emits on stream errors */
  readonly onError: Subject<Error>;
  /** Emits when stream ends */
  readonly onEnded: ReplaySubject<void>;
  /** Emits video RTP packets */
  readonly onVideoRtp: Subject<RtpPacket>;
  /** Emits audio RTP packets */
  readonly onAudioRtp: Subject<RtpPacket>;
  /** Whether backchannel is available */
  readonly hasBackchannel: boolean;

  /**
   * Start the RTP stream.
   *
   * @param config - Stream configuration options
   */
  startStream(config?: RtpSessionOptions): Promise<void>;

  /**
   * Start backchannel for two-way audio.
   *
   * @param config - Backchannel configuration
   */
  startBackchannel(config?: RtpSessionBackchannelOptions): Promise<void>;

  /**
   * Send audio packet to camera via backchannel.
   *
   * @param rtp - RTP packet or raw buffer
   */
  sendAudioPacket(rtp: RtpPacket | Buffer): Promise<void>;

  /** Stop the stream and cleanup resources */
  stop(): Promise<void>;
}

/**
 * FMP4 streaming session configuration.
 */
export interface Fmp4SessionOptions {
  /** Hardware acceleration method */
  hardware?: HardwareAcceleration;

  /** Stream input options */
  input?: {
    options?: Record<string, string | number | boolean | null | undefined>;
  };

  /** Use box mode for streaming */
  boxMode?: boolean;
  /** Fragment duration in microseconds */
  fragDuration?: number;

  /** Supported audio codecs (skip transcode if match) */
  supportedAudioCodecs?: ('aac' | 'opus' | 'flac')[];
  /** Supported video codecs (skip transcode if match) */
  supportedVideoCodecs?: ('h264' | 'hevc' | 'av1')[];

  /** Video encoding options */
  video?: {
    /** Target framerate */
    fps?: number;
    /** Output width */
    width?: number;
    /** Output height */
    height?: number;
    /** Additional encoder options */
    encoderOptions?: Record<string, string | number | boolean | undefined | null>;
  };

  /** Audio encoding options */
  audio?: {
    /** Additional encoder options */
    encoderOptions?: Record<string, string | number | boolean | undefined | null>;
  };
}

/**
 * Fragmented MP4 streaming session for MSE-based playback.
 * Produces FMP4 segments suitable for Media Source Extensions.
 */
export interface Fmp4Session extends Subscribed {
  /** Emits when stream successfully starts */
  readonly onStarted: ReplaySubject<void>;
  /** Emits on stream errors */
  readonly onError: Subject<Error>;
  /** Emits when stream ends */
  readonly onEnded: ReplaySubject<void>;
  /** FMP4 initialization segment (moov box) */
  readonly initSegment: Promise<Buffer>;

  /**
   * Start the FMP4 stream.
   *
   * @param config - Stream configuration options
   */
  startStream(config?: Fmp4SessionOptions): Promise<void>;

  /**
   * Async generator yielding FMP4 media segments.
   *
   * @param signal - Optional abort signal
   *
   * @yields {Buffer} FMP4 moof+mdat boxes
   */
  streamBoxes(signal?: AbortSignal): AsyncGenerator<Buffer, void>;

  /** Stop the stream and cleanup resources */
  stop(): Promise<void>;
}
