from __future__ import annotations

from typing import NotRequired, TypedDict


class CameraPrivacy(TypedDict):
    """Privacy mode of a camera."""

    enabled: bool
    """Whether privacy mode is on. Nobody sees the camera live, its snapshots or its shares."""
    pauseRecording: bool
    """Whether recording and detection pause too while privacy mode is on."""
    since: NotRequired[int]
    """When privacy mode began (Unix ms), set by the server."""
    until: NotRequired[int]
    """When privacy mode ends by itself (Unix ms), none while it has no end."""
