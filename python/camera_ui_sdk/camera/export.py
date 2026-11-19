from __future__ import annotations

from typing import NotRequired, TypedDict


class CameraExportSettings(TypedDict):
    """How other apps reach a camera."""

    onvif: bool
    """Give the camera an ONVIF device of its own on ``onvifPort``."""
    onvifPort: NotRequired[int]
    """Port of the camera's own ONVIF device, set while ``onvif`` is on."""
    rtmp: bool
    """Offer the camera's streams on the RTMP server."""
