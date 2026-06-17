from __future__ import annotations

from typing import TypedDict


class CameraFrameWorkerSettings(TypedDict):
    """Frame worker (decoder) settings."""

    fps: int
    """Target frames per second for detection."""


class SnapshotSettings(TypedDict):
    """Snapshot settings for a camera."""

    autoRefresh: bool
    """Enable automatic snapshot refresh."""
    ttl: int
    """Cache TTL in seconds (how long a snapshot is valid)."""
    interval: int
    """Auto-refresh interval in seconds (min: 10, max: 60)."""
