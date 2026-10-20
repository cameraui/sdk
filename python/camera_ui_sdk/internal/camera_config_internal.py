from __future__ import annotations

from typing import NotRequired, TypedDict

from ..camera.config import CameraConfigInputSettings, CameraInformation
from ..camera.enums import CameraRole, StreamingRole


class CameraInputSettings(TypedDict):
    _id: str
    name: str
    role: CameraRole
    useForSnapshot: bool
    hotMode: bool
    preload: bool
    muted: NotRequired[bool]
    urls: list[str]
    childSourceId: NotRequired[str]
    childCameraId: NotRequired[str]
    childCameraRole: NotRequired[StreamingRole]


class CameraConfigPartial(TypedDict, total=False):
    name: str
    nativeId: str
    isCloud: bool
    disabled: bool
    info: CameraInformation
    sources: list[CameraConfigInputSettings]
