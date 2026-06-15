from __future__ import annotations

from typing import Literal, NotRequired, TypedDict

from .enums import (
    AudioCodec,
    AudioFFmpegCodec,
    ProbeAudioCodec,
    RTSPAudioCodec,
    StreamDirection,
    VideoCodec,
    VideoFFmpegCodec,
)


class Go2RtcWSSource(TypedDict):
    """WebSocket streaming URLs from go2rtc."""

    webrtc: str
    """WebRTC signaling endpoint."""
    mse: str
    """MSE streaming endpoint."""


class Go2RtcRTSPSource(TypedDict):
    """RTSP streaming URLs from go2rtc."""

    base: str
    """Base RTSP URL."""
    default: str
    """Default stream (video + audio)."""
    muted: str
    """Video only (muted)."""
    audioOnly: str
    """Audio only (no video)."""
    aac: str
    """Stream with AAC audio URL."""
    opus: str
    """Stream with Opus audio URL."""
    pcma: str
    """Stream with PCMA audio URL."""
    onvif: str
    """ONVIF URL."""
    prebuffered: str
    """Prebuffered stream URL."""
    noGop: str
    """Stream URL with GOP cache disabled."""


class Go2RtcSnapshotSource(TypedDict):
    """Snapshot/image URLs from go2rtc."""

    mp4: str
    """MP4 single-frame video URL."""
    jpeg: str
    """JPEG snapshot URL."""
    mjpeg: str
    """MJPEG stream URL."""


class StreamUrls(TypedDict):
    """Collection of all streaming URLs for a camera source."""

    ws: Go2RtcWSSource
    """WebSocket URLs."""
    rtsp: Go2RtcRTSPSource
    """RTSP URLs."""
    snapshot: Go2RtcSnapshotSource
    """Snapshot URLs."""


class ProbeConfig(TypedDict, total=False):
    """Configuration for stream probing."""

    video: bool
    """Include video track info."""
    audio: bool | Literal["all"] | list[ProbeAudioCodec]
    """Include audio track info (true, 'all', or specific codecs)."""
    microphone: bool
    """Include microphone/backchannel info."""


class FMTPInfo(TypedDict):
    """Format parameters (fmtp) from SDP."""

    payload: int
    """RTP payload type number."""
    config: str
    """Codec-specific configuration string."""


class AudioCodecProperties(TypedDict):
    """Audio codec properties from stream probe."""

    sampleRate: int
    """Audio sample rate in Hz."""
    channels: int
    """Number of audio channels."""
    payloadType: int
    """RTP payload type."""
    fmtpInfo: NotRequired[FMTPInfo]
    """Optional format parameters."""


class VideoCodecProperties(TypedDict):
    """Video codec properties from stream probe."""

    clockRate: int
    """Video clock rate."""
    payloadType: int
    """RTP payload type."""
    fmtpInfo: NotRequired[FMTPInfo]
    """Optional format parameters."""


class AudioStreamInfo(TypedDict):
    """Audio stream information from probe."""

    codec: AudioCodec
    """Audio codec."""
    ffmpegCodec: AudioFFmpegCodec
    """FFmpeg codec name."""
    properties: AudioCodecProperties
    """Codec properties."""
    direction: StreamDirection
    """Stream direction."""


class VideoStreamInfo(TypedDict):
    """Video stream information from probe."""

    codec: VideoCodec
    """Video codec."""
    ffmpegCodec: VideoFFmpegCodec
    """FFmpeg codec name."""
    properties: VideoCodecProperties
    """Codec properties."""
    direction: StreamDirection
    """Stream direction."""


class ProbeStream(TypedDict):
    """Stream probe result containing SDP and track information."""

    sdp: str
    """Raw SDP string."""
    audio: list[AudioStreamInfo]
    """Available audio tracks."""
    video: list[VideoStreamInfo]
    """Available video tracks."""


class RTSPUrlOptions(TypedDict, total=False):
    """Options for generating RTSP URLs."""

    video: bool
    """Include video track."""
    audio: bool | RTSPAudioCodec | list[RTSPAudioCodec]
    """Include audio track(s)."""
    gop: bool
    """Request keyframe at start (GOP)."""
    prebuffer: bool
    """Use prebuffered stream."""
    audioSingleTrack: bool
    """Combine audio tracks into single track."""
    backchannel: bool
    """Enable backchannel (two-way audio)."""
    timeout: int
    """Connection timeout in s."""


class SnapshotUrlOptions(TypedDict, total=False):
    """Options for generating snapshot URLs."""

    width: int
    """Output width in pixels."""
    height: int
    """Output height in pixels."""
    rotate: Literal[90, 180, 270, -90]
    """Rotation in degrees."""
    cache: str
    """Cache key/strategy."""
    hw: Literal["vaapi", "v4l2m2m", "cuda", "dxva2", "videotoolbox", "rkmpp"]
    """Hardware acceleration backend."""
    gop: bool
    """Request keyframe at start (GOP)."""
    prebuffer: bool
    """Use prebuffered stream."""
