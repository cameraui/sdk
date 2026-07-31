from __future__ import annotations

from typing import Literal, NotRequired, TypedDict

FrameWorkerDecoderHardware = Literal[
    "auto",
    "cpu",
    "cuda",
    "vaapi",
    "qsv",
    "videotoolbox",
    "d3d11va",
    "d3d12va",
    "dxva2",
    "vulkan",
    "opencl",
    "drm",
    "rkmpp",
]
"""Hardware backend for the detection decoder. `auto` probes the platform order, `cpu` forces software decoding."""


class FrameWorkerDecoderSettings(TypedDict):
    """Decoder hardware selection for the frame worker."""

    hardware: FrameWorkerDecoderHardware
    """Hardware backend to decode with."""
    device: NotRequired[str]
    """Device the backend opens (GPU index like `0`, or a path like `/dev/dri/renderD128`). Backend default when omitted."""


class CameraFrameWorkerSettings(TypedDict):
    """Frame worker (decoder) settings."""

    fps: int
    """Target frames per second for detection."""
    hqSnapshots: NotRequired[bool]
    """Capture event thumbnails from the highest-resolution source."""
    decoder: NotRequired[FrameWorkerDecoderSettings]
    """Decoder hardware selection. Applies on the machine that decodes this camera (master or assigned worker); an unusable selection falls back to auto."""
    workerDecoder: NotRequired[FrameWorkerDecoderSettings]
    """Decoder hardware selection used instead of `decoder` while this camera decodes on its assigned worker. Falls back to `decoder` when omitted."""


class SnapshotSettings(TypedDict):
    """Snapshot settings for a camera."""

    autoRefresh: bool
    """Enable automatic snapshot refresh."""
    ttl: int
    """Cache TTL in seconds (how long a snapshot is valid)."""
    interval: int
    """Auto-refresh interval in seconds (min: 10, max: 60)."""
