/**
 * Camera device type.
 * - `camera`: Standard surveillance camera
 * - `doorbell`: Doorbell camera
 */
export type CameraType = 'camera' | 'doorbell';

/**
 * Detection zone intersection type.
 * - `intersect`: Trigger when object overlaps the zone at all
 * - `contain`: Trigger only when object is fully inside the zone
 */
export type ZoneType = 'intersect' | 'contain';

/**
 * Detection zone filter mode.
 * - `include`: Only consider detections inside this zone
 * - `exclude`: Only consider detections outside this zone
 */
export type ZoneFilter = 'include' | 'exclude';

/**
 * Camera stream resolution role.
 * Used to identify different quality streams from the same camera.
 */
export type CameraRole = 'high-resolution' | 'mid-resolution' | 'low-resolution' | 'snapshot';

/**
 * Streaming roles (excludes snapshot).
 */
export type StreamingRole = Exclude<CameraRole, 'snapshot'>;

/**
 * Zone polygon coordinate as [x, y] tuple (0-100 percentage).
 */
export type Point = [number, number];

/**
 * Supported audio codecs (RTP/SDP format names).
 */
export type AudioCodec = 'PCMU' | 'PCMA' | 'MPEG4-GENERIC' | 'opus' | 'G722' | 'G726' | 'MPA' | 'PCM' | 'FLAC' | 'ELD' | 'PCML' | 'L16';

/**
 * FFmpeg audio codec names for transcoding.
 */
export type AudioFFmpegCodec = 'pcm_mulaw' | 'pcm_alaw' | 'aac' | 'libopus' | 'g722' | 'g726' | 'mp3' | 'pcm_s16be' | 'pcm_s16le' | 'flac';

/**
 * Supported video codecs (RTP/SDP format names).
 */
export type VideoCodec = 'H264' | 'H265' | 'VP8' | 'VP9' | 'AV1' | 'JPEG' | 'RAW';

/**
 * FFmpeg video codec names for transcoding.
 */
export type VideoFFmpegCodec = 'h264' | 'hevc' | 'vp8' | 'vp9' | 'av1' | 'mjpeg' | 'rawvideo';

/**
 * Audio codecs supported for RTSP streaming.
 */
export type RTSPAudioCodec = 'aac' | 'opus' | 'pcma';

/**
 * Audio codecs supported for stream probing.
 */
export type ProbeAudioCodec = 'aac' | 'opus' | 'pcma';

/**
 * Motion detection resolution setting.
 * Higher resolution = more accurate but slower.
 */
export type MotionResolution = 'low' | 'medium' | 'high';

/**
 * Video streaming mode for UI playback.
 * - `auto`: Automatically select best method
 * - `webrtc`: WebRTC with UDP (lowest latency)
 * - `webrtc/tcp`: WebRTC with TCP fallback
 * - `mse`: Media Source Extensions (browser native)
 */
export type VideoStreamingMode = 'auto' | 'webrtc' | 'mse' | 'webrtc/tcp';

/**
 * Camera aspect ratio for UI display.
 */
export type CameraAspectRatio = '16:9' | '9:16' | '8:3' | '4:3' | '1:1';

/**
 * Line crossing direction filter.
 * - `both`: Trigger on crossings in either direction
 * - `a-to-b`: Trigger only when crossing from A side to B side
 * - `b-to-a`: Trigger only when crossing from B side to A side
 */
export type LineDirection = 'both' | 'a-to-b' | 'b-to-a';

/**
 * Detection event message type (lifecycle phase).
 */
export type DetectionEventType = 'start' | 'end' | 'update' | 'segment-start' | 'segment-update' | 'segment-end';

/**
 * Event lifecycle state.
 */
export type DetectionEventState = 'active' | 'ended';

/**
 * Event trigger type.
 */
export type EventTriggerType = 'motion' | 'audio' | 'contact' | 'doorbell' | 'switch' | 'light' | 'siren' | 'security_system' | 'line-crossing';

/**
 * Stream direction (from SDP).
 */
export type StreamDirection = 'sendonly' | 'recvonly' | 'sendrecv' | 'inactive';
