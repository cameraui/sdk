from __future__ import annotations

from typing import Literal, TypedDict

NotificationSpeed = Literal["immediate", "balanced", "best"]
"""
How long a push waits for a good picture.
- ``immediate``: send right away, with a picture only if one is ready
- ``balanced``: wait up to 2 seconds for the best picture
- ``best``: wait up to 4 seconds for the best picture
"""


class CameraNotificationSettings(TypedDict):
    """Push notification settings for a camera."""

    enabled: bool
    """Whether detections on this camera send a push at all."""
    video: bool
    """Attach a short clip of the moment. Needs recording, uses the lowest recorded quality."""
    audio: list[str]
    """Audio events that send a push. ``other`` covers custom audio labels."""
    sensors: list[str]
    """Sensor triggers that send a push, by sensor type."""
    cooldown: float
    """Minimum seconds between pushes. Critical alerts bypass it and do not count toward it."""
    speed: NotificationSpeed
    """How long a push waits for a good picture."""
