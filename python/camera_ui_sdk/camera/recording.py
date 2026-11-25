from __future__ import annotations

from typing import Literal, NotRequired, TypedDict

RecordingMode = Literal["continuous", "event", "adhoc"]
"""
How recordings are captured.
- ``continuous``: record around the clock
- ``event``: record only around detections, padded by the pre-buffer
- ``adhoc``: connect and record only while a detection event runs
"""

RecordingSource = Literal["high", "mid", "low"]
"""Stream tier to record."""


class CameraRecordingSettings(TypedDict):
    """Recording settings for a camera."""

    enabled: bool
    """Whether recording is enabled."""
    mode: RecordingMode
    """Recording mode."""
    preBuffer: float
    """Seconds of video kept before an event (event mode, 0 - 60)."""
    sources: list[RecordingSource]
    """Stream tiers to record."""
    paused: NotRequired[bool]
    """Whether recording is paused. A paused camera keeps its place among the recording cameras."""
    pausedSince: NotRequired[int]
    """When the pause began (Unix ms), set by the server."""
    pausedUntil: NotRequired[int]
    """When the pause ends by itself (Unix ms), none while it has no end."""
