from __future__ import annotations

from typing import NotRequired, TypedDict

from ..camera.config import CameraConfigInputSettings, CameraInformation
from ..camera.enums import CameraRole


class CameraInputSettings(TypedDict):
    """Camera input settings (user configuration)."""

    _id: str
    """Unique source ID."""
    name: str
    """Source display name."""
    role: CameraRole
    """Resolution role."""
    useForSnapshot: bool
    """Use this source for snapshots."""
    hotMode: bool
    """Keep connection always active."""
    preload: bool
    """Buffer the last keyframe group so new viewers get a picture faster."""
    muted: NotRequired[bool]
    """Strip the audio track from this source (defaults to False)."""
    urls: list[str]
    """User-provided stream URLs."""
    childSourceId: NotRequired[str]
    """Child source ID (for snapshot fallback)."""


class CameraConfigPartial(TypedDict, total=False):
    """Camera configuration subset for partial updates."""

    name: str
    """Camera display name."""
    nativeId: str
    """Native device ID from plugin."""
    isCloud: bool
    """Whether camera streams from cloud."""
    disabled: bool
    """Disable this camera."""
    info: CameraInformation
    """Camera hardware information."""
    sources: list[CameraConfigInputSettings]
    """Video input sources."""
