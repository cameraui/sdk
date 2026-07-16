from __future__ import annotations

from typing import Literal

CameraType = Literal["camera", "doorbell"]
"""
Camera device type.
- `camera`: Standard surveillance camera
- `doorbell`: Doorbell camera
"""

ZoneType = Literal["intersect", "contain"]
"""
Detection zone intersection type.
- `intersect`: Trigger when object overlaps the zone at all
- `contain`: Trigger only when object is fully inside the zone
"""

ZoneFilter = Literal["include", "exclude"]
"""
Detection zone filter mode.
- `include`: Only consider detections inside this zone
- `exclude`: Only consider detections outside this zone
"""

CameraRole = Literal["high-resolution", "mid-resolution", "low-resolution", "snapshot"]
"""
Camera stream resolution role.
Used to identify different quality streams from the same camera.
"""

StreamingRole = Literal["high-resolution", "mid-resolution", "low-resolution"]
"""Streaming roles (excludes snapshot)."""

MotionResolution = Literal["low", "medium", "high"]
"""
Motion detection resolution setting.
Higher resolution = more accurate but slower.
"""

AudioCodec = Literal[
    "PCMU", "PCMA", "MPEG4-GENERIC", "opus", "G722", "G726", "MPA", "PCM", "FLAC", "ELD", "PCML", "L16"
]
"""Supported audio codecs (RTP/SDP format names)."""

AudioFFmpegCodec = Literal[
    "pcm_mulaw", "pcm_alaw", "aac", "libopus", "g722", "g726", "mp3", "pcm_s16be", "pcm_s16le", "flac"
]
"""FFmpeg audio codec names for transcoding."""

VideoCodec = Literal["H264", "H265", "VP8", "VP9", "AV1", "JPEG", "RAW"]
"""Supported video codecs (RTP/SDP format names)."""

VideoFFmpegCodec = Literal["h264", "hevc", "vp8", "vp9", "av1", "mjpeg", "rawvideo"]
"""FFmpeg video codec names for transcoding."""

RTSPAudioCodec = Literal["aac", "opus", "pcma"]
"""Audio codecs supported for RTSP streaming."""

ProbeAudioCodec = Literal["aac", "opus", "pcma"]
"""Audio codecs supported for stream probing."""

VideoStreamingMode = Literal["auto", "webrtc", "mse", "webrtc/tcp"]
"""
Video streaming mode for UI playback.
- `auto`: Automatically select best method
- `webrtc`: WebRTC with UDP (lowest latency)
- `webrtc/tcp`: WebRTC with TCP fallback
- `mse`: Media Source Extensions (browser native)
"""

CameraAspectRatio = Literal["16:9", "9:16", "8:3", "4:3", "1:1"]
"""Camera aspect ratio for UI display."""

Point = tuple[float, float]
"""Zone polygon coordinate as [x, y] tuple (0-100 percentage)."""

LineDirection = Literal["both", "a-to-b", "b-to-a"]
"""
Line crossing direction filter.
- `both`: Trigger on crossings in either direction
- `a-to-b`: Trigger only when crossing from A side to B side
- `b-to-a`: Trigger only when crossing from B side to A side
"""

StreamDirection = Literal["sendonly", "recvonly", "sendrecv", "inactive"]
"""Stream direction (from SDP)."""

DetectionEventState = Literal["active", "ended"]
"""Event lifecycle state."""

EventTriggerType = Literal[
    "motion", "audio", "contact", "doorbell", "switch", "light", "siren", "security_system", "line-crossing"
]
"""Event trigger type."""

EVENT_TRIGGER_TYPES: tuple[str, ...] = (
    "motion",
    "audio",
    "contact",
    "doorbell",
    "switch",
    "light",
    "siren",
    "security_system",
    "line-crossing",
)
"""All event trigger types as a runtime-accessible tuple."""

DetectionEventType = Literal["start", "end", "update", "segment-start", "segment-update", "segment-end"]
"""Detection event message type (lifecycle phase)."""
