from __future__ import annotations

from typing import Literal, TypedDict

RecordingMode = Literal["continuous", "event", "adhoc"]
"""
How recordings are captured.
- ``continuous``: record around the clock
- ``event``: record only around detections, padded by the pre-buffer
- ``adhoc``: record only when started manually
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
