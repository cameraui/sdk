from __future__ import annotations

from typing_extensions import TypedDict

from ..camera.enums import DetectionEventType
from ..camera.events import DetectionEvent


class DetectionEventMessage(TypedDict):
    type: DetectionEventType
    data: DetectionEvent
