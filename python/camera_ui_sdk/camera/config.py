from __future__ import annotations

from typing import Any, Literal, NotRequired, TypedDict

from ..sensor.base import SensorType
from .detection import (
    CameraDetectionSettings,
    DetectionLine,
    DetectionZone,
    PtzAutotrackSettings,
)
from .enums import (
    CameraAspectRatio,
    CameraRole,
    CameraType,
    StreamingRole,
    VideoStreamingMode,
)
from .frames import CameraFrameWorkerSettings, SnapshotSettings
from .streaming import StreamUrls


class CameraInformation(TypedDict, total=False):
    """Camera hardware/firmware information."""

    model: str
    """Camera model name."""
    manufacturer: str
    """Manufacturer name."""
    hardware: str
    """Hardware version/revision."""
    serialNumber: str
    """Device serial number."""
    firmwareVersion: str
    """Current firmware version."""
    supportUrl: str
    """Manufacturer support URL."""


class CameraInput(TypedDict):
    """Camera video input/source with resolved URLs."""

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
    """Keep a keyframe cache for this source, so the view opens faster. Use hotMode to keep the stream connected."""
    muted: NotRequired[bool]
    """Strip the audio track from this source (defaults to False)."""
    urls: StreamUrls
    """Generated streaming URLs."""
    childSourceId: NotRequired[str]
    """Child source ID (for snapshot fallback)."""


class CameraConfigInputSettings(TypedDict):
    """Camera input settings for config."""

    name: str
    """Source display name."""
    role: CameraRole
    """Resolution role."""
    useForSnapshot: bool
    """Use this source for snapshots."""
    hotMode: bool
    """Keep connection always active."""
    preload: bool
    """Keep a keyframe cache for this source, so the view opens faster. Use hotMode to keep the stream connected."""
    muted: NotRequired[bool]
    """Strip the audio track from this source (defaults to False)."""
    childSourceId: NotRequired[str]
    """Child source ID (for snapshot fallback)."""
    urls: NotRequired[list[str]]


class BaseCameraConfig(TypedDict):
    """Base camera configuration (shared fields)."""

    name: str
    """Camera display name."""
    nativeId: NotRequired[str]
    """Native device ID from plugin."""
    isCloud: NotRequired[bool]
    """Whether camera streams from cloud."""
    disabled: NotRequired[bool]
    """Disable this camera."""
    info: NotRequired[CameraInformation]
    """Camera hardware information."""


class CameraConfig(BaseCameraConfig):
    """Full camera configuration with sources."""

    sources: list[CameraConfigInputSettings]
    """Video input sources."""


class CameraUiSettings(TypedDict):
    """UI display settings for a camera."""

    streamingMode: VideoStreamingMode
    """Preferred streaming method."""
    streamingSource: StreamingRole
    """Preferred stream quality."""
    aspectRatio: CameraAspectRatio
    """Display aspect ratio."""


class AssignedPlugin(TypedDict):
    """Plugin assignment info."""

    id: str
    """Plugin ID."""
    name: str
    """Plugin display name."""


class PluginAssignments(TypedDict, total=False):
    """
    Plugin assignments for camera sensors/features.
    Maps sensor types to their assigned plugin(s).
    """

    motion: AssignedPlugin
    """Motion detection plugin."""
    object: AssignedPlugin
    """Object detection plugin."""
    audio: AssignedPlugin
    """Audio detection plugin."""
    face: AssignedPlugin
    """Face detection plugin."""
    licensePlate: AssignedPlugin
    """License plate detection plugin."""
    ptz: AssignedPlugin
    """PTZ control plugin."""
    battery: AssignedPlugin
    """Battery info plugin."""
    clip: AssignedPlugin
    """CLIP embedding plugin."""
    cameraController: AssignedPlugin
    """Camera controller plugin."""
    light: list[AssignedPlugin]
    """Light control plugins."""
    siren: list[AssignedPlugin]
    """Siren control plugins."""
    switch: list[AssignedPlugin]
    """Switch control plugins."""
    securitySystem: list[AssignedPlugin]
    """Security system control plugins."""
    lock: list[AssignedPlugin]
    """Lock control plugins."""
    garage: list[AssignedPlugin]
    """Garage control plugins."""
    contact: list[AssignedPlugin]
    """Contact sensor plugins."""
    occupancy: list[AssignedPlugin]
    """Occupancy sensor plugins."""
    smoke: list[AssignedPlugin]
    """Smoke sensor plugins."""
    leak: list[AssignedPlugin]
    """Leak sensor plugins."""
    doorbell: list[AssignedPlugin]
    """Doorbell trigger plugins."""
    temperature: list[AssignedPlugin]
    """Temperature info plugins."""
    humidity: list[AssignedPlugin]
    """Humidity info plugins."""
    classifier: list[AssignedPlugin]
    """Image classifier plugins."""
    hub: list[AssignedPlugin]
    """Hub/bridge plugins."""


class CameraPluginInfo(TypedDict):
    """Camera source plugin information."""

    id: str
    """Plugin ID."""
    name: str
    """Plugin display name."""


class BaseCamera(TypedDict):
    """Base camera data structure (stored in database)."""

    _id: str
    """Unique camera ID."""
    nativeId: str | None
    """Native device ID from plugin."""
    pluginInfo: CameraPluginInfo | None
    """Source plugin information."""
    name: str
    """Camera display name."""
    room: str
    """Room this camera belongs to."""
    disabled: bool
    """Whether camera is disabled."""
    isCloud: bool
    """Whether camera streams from cloud."""
    info: CameraInformation
    """Camera hardware information."""
    type: CameraType
    """Camera type (camera/doorbell)."""
    snapshotSettings: SnapshotSettings
    """Snapshot settings."""
    detectionZones: list[DetectionZone]
    """Detection zone configurations."""
    detectionLines: list[DetectionLine]
    """Detection line configurations (virtual tripwires)."""
    detectionSettings: CameraDetectionSettings
    """Detection settings."""
    ptzAutotrack: PtzAutotrackSettings
    """PTZ autotracking settings."""
    frameWorkerSettings: CameraFrameWorkerSettings
    """Frame worker settings."""
    interfaceSettings: CameraUiSettings
    """UI display settings."""
    plugins: list[AssignedPlugin]
    """Installed plugins."""
    assignments: PluginAssignments
    """Sensor-to-plugin assignments."""


class Camera(BaseCamera):
    """Camera with resolved video sources."""

    sources: list[CameraInput]
    """Video input sources."""


CameraPublicProperties = Literal[
    "_id",
    "nativeId",
    "pluginInfo",
    "name",
    "disabled",
    "isCloud",
    "info",
    "type",
    "snapshotSettings",
    "detectionZones",
    "detectionSettings",
    "ptzAutotrack",
    "frameWorkerSettings",
    "interfaceSettings",
    "recording",
    "plugins",
    "assignments",
    "sources",
]
"""Camera public property names for observation."""


class SensorEventData(TypedDict):
    """Emitted when a sensor is added or removed."""

    sensorId: str
    """Sensor ID."""
    sensorType: SensorType
    """Sensor type."""


class CameraPropertyObservableObject(TypedDict):
    """Camera property change event."""

    property: str
    """Property name that changed."""
    old_state: Any
    """Previous value."""
    new_state: Any
    """New value."""
