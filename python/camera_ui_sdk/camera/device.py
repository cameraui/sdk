from __future__ import annotations

from typing import TYPE_CHECKING, Any, Protocol, TypeAlias, runtime_checkable

if TYPE_CHECKING:
    from ..observable import Observable
    from ..sensor.base import Sensor
    from ..storage import DeviceStorage, JsonSchema
    from ..types import LoggerService

from .config import (
    CameraInformation,
    CameraPluginInfo,
    CameraPropertyObservableObject,
    CameraPublicProperties,
    CameraUiSettings,
)
from .detection import CameraDetectionSettings, DetectionLine, DetectionZone, PtzAutotrackSettings
from .enums import CameraRole, CameraType
from .events import DetectionEventPayload
from .frames import CameraFrameWorkerSettings, SnapshotSettings
from .recording import CameraRecordingSettings
from .streaming import (
    ProbeConfig,
    ProbeStream,
    RTSPUrlOptions,
    SnapshotUrlOptions,
    StreamUrls,
)


@runtime_checkable
class CameraSource(Protocol):
    """Camera source with snapshot and probe capabilities."""

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
    muted: bool | None
    """Strip the audio track from this source (defaults to False)."""
    urls: StreamUrls
    """Generated streaming URLs."""
    childSourceId: str | None
    """Child source ID (for snapshot fallback)."""

    async def snapshot(self, forceNew: bool = False) -> bytes | None:
        """
        Get camera snapshot image.

        Args:
            forceNew: Force fresh snapshot (ignore cache).

        Returns:
            JPEG image data or None if unavailable.
        """
        ...

    async def probeStream(
        self, probeConfig: ProbeConfig | None = None, refresh: bool = False
    ) -> ProbeStream | None:
        """
        Probe stream for codec and track information.

        Args:
            probeConfig: What to probe for.
            refresh: Force fresh probe (ignore cache).

        Returns:
            Stream information or None if unavailable.
        """
        ...

    async def getStreamStatus(self) -> str:
        """
        Get the current stream connection status.

        Returns:
            Status string: 'connected', 'connecting', 'error', or 'idle'.
        """
        ...

    def generateSnapshotUrl(self, options: SnapshotUrlOptions | None = None) -> str:
        """
        Generate Snapshot URL with specified options.

        Args:
            options: URL generation options.

        Returns:
            Snapshot URL string.
        """
        ...


@runtime_checkable
class CameraDeviceSource(CameraSource, Protocol):
    """Camera source with full streaming capabilities."""

    def generateRTSPUrl(self, options: RTSPUrlOptions | None = None) -> str:
        """
        Generate RTSP URL with specified options.

        Args:
            options: URL generation options.

        Returns:
            RTSP URL string.
        """
        ...


@runtime_checkable
class CameraDevice(Protocol):
    """
    Main camera device interface.
    Provides access to camera streams, sensors, and services.
    """

    @property
    def id(self) -> str:
        """Unique camera ID."""
        ...

    @property
    def nativeId(self) -> str | None:
        """Native device ID from plugin."""
        ...

    @property
    def pluginInfo(self) -> CameraPluginInfo | None:
        """Source plugin information."""
        ...

    @property
    def disabled(self) -> bool:
        """Whether camera is disabled."""
        ...

    @property
    def name(self) -> str:
        """Camera display name."""
        ...

    @property
    def room(self) -> str:
        """Room this camera belongs to."""
        ...

    @property
    def type(self) -> CameraType:
        """Camera type (camera/doorbell)."""
        ...

    @property
    def snapshotSettings(self) -> SnapshotSettings:
        """Snapshot settings."""
        ...

    @property
    def info(self) -> CameraInformation:
        """Camera hardware information."""
        ...

    @property
    def isCloud(self) -> bool:
        """Whether camera streams from cloud."""
        ...

    @property
    def detectionZones(self) -> list[DetectionZone]:
        """Detection zone configurations."""
        ...

    @property
    def detectionLines(self) -> list[DetectionLine]:
        """Detection line configurations (virtual tripwires)."""
        ...

    @property
    def detectionSettings(self) -> CameraDetectionSettings:
        """Detection settings."""
        ...

    @property
    def ptzAutotrack(self) -> PtzAutotrackSettings:
        """PTZ autotracking settings."""
        ...

    @property
    def recordingSettings(self) -> CameraRecordingSettings:
        """Recording settings."""
        ...

    @property
    def snooze(self) -> bool:
        """Whether detections are snoozed (paused)."""
        ...

    @property
    def frameWorkerSettings(self) -> CameraFrameWorkerSettings:
        """Frame worker settings."""
        ...

    @property
    def interfaceSettings(self) -> CameraUiSettings:
        """UI display settings."""
        ...

    @property
    def sources(self) -> list[CameraDeviceSource]:
        """All video sources."""
        ...

    @property
    def streamSource(self) -> CameraDeviceSource:
        """Primary streaming source."""
        ...

    @property
    def highResolutionSource(self) -> CameraDeviceSource | None:
        """High resolution source (if available)."""
        ...

    @property
    def midResolutionSource(self) -> CameraDeviceSource | None:
        """Mid resolution source (if available)."""
        ...

    @property
    def lowResolutionSource(self) -> CameraDeviceSource | None:
        """Low resolution source (if available)."""
        ...

    @property
    def snapshotSource(self) -> CameraSource | None:
        """Snapshot source (if available)."""
        ...

    @property
    def connected(self) -> bool:
        """Whether camera is connected."""
        ...

    @property
    def frameWorkerConnected(self) -> bool:
        """Whether frame worker is connected."""
        ...

    @property
    def onConnected(self) -> Observable[bool]:
        """Observable for connection state changes."""
        ...

    @property
    def onFrameWorkerConnected(self) -> Observable[bool]:
        """Observable for frame worker state changes."""
        ...

    @property
    def onDetectionEvent(self) -> Observable[DetectionEventPayload]:
        """
        Observable for detection events.

        Emits 'start', 'update', 'end', 'segment-start', 'segment-update' and 'segment-end'.
        Segments ride on the segment-* messages only, thumbnails on 'segment-start'
        and 'segment-end'.
        """
        ...

    @property
    def logger(self) -> LoggerService:
        """Logger service for this camera."""
        ...

    def getSourceById(self, id: str) -> CameraDeviceSource | None:
        """
        Get a source by its ID.

        Args:
            id: The source ID.

        Returns:
            The matching source, or None if not found.
        """
        ...

    def createStorage(self, schemas: list[JsonSchema]) -> DeviceStorage:
        """
        Create storage for plugin-specific camera configuration.

        Args:
            schemas: Schema definitions for the storage.

        Returns:
            Typed device storage instance.
        """
        ...

    async def connect(self) -> None:
        """
        Tell the server this camera is online.

        Only the plugin that owns this camera (via pluginInfo) may connect it.
        """
        ...

    async def disconnect(self) -> None:
        """
        Tell the server this camera is offline.

        Only the plugin that owns this camera (via pluginInfo) may disconnect it.
        """
        ...

    def onPropertyChange(
        self, property: CameraPublicProperties | list[CameraPublicProperties]
    ) -> Observable[CameraPropertyObservableObject]:
        """
        Observe camera property changes.

        Args:
            property: Property name(s) to observe.

        Returns:
            Observable emitting old and new values.
        """
        ...

    async def addSensor(self, sensor: Sensor[Any, Any, Any]) -> None:
        """
        Register a sensor that belongs to this camera's hardware (spotlight,
        siren, PTZ, battery, ...). The host assigns it to this camera and
        reconciles it across restarts like a standalone sensor.

        Args:
            sensor: Sensor instance to register.
        """
        ...

    async def removeSensor(self, sensorId: str) -> None:
        """
        Unregister a sensor this plugin registered on this camera. The
        persisted entity stays (shows disconnected) unless the user deletes it.

        Args:
            sensorId: ID of sensor to unregister.
        """
        ...

    async def implement(self, impl: CameraImplementation) -> None:
        """
        Register a camera implementation for streaming and/or snapshot.

        The impl value should implement StreamingInterface, SnapshotInterface,
        or both.

        Args:
            impl: Object or class implementing camera interfaces.
        """
        ...


@runtime_checkable
class StreamingInterface(Protocol):
    """Optional implementation that provides stream URLs."""

    async def streamUrl(self, source_id: str) -> str:
        """
        Get the streaming URL for a source.

        Args:
            source_id: The ID of the source.

        Returns:
            The streaming URL (e.g. rtsp://, rtmp://, or custom protocol).
        """
        ...


@runtime_checkable
class SnapshotInterface(Protocol):
    """Optional implementation that provides snapshots."""

    async def snapshot(self, source_id: str, force_new: bool = False) -> bytes | None:
        """
        Get a snapshot image from the camera.

        Args:
            source_id: The source ID to get the snapshot from.
            force_new: If True, bypass cache and get a fresh snapshot.

        Returns:
            Image data as bytes, or None if unavailable.
        """
        ...


CameraImplementation: TypeAlias = StreamingInterface | SnapshotInterface
"""Value accepted by CameraDevice.implement: streaming, snapshot, or both."""
