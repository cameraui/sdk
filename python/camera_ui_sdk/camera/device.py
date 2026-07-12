from __future__ import annotations

from collections.abc import Callable
from typing import TYPE_CHECKING, Any, Protocol, TypeAlias, runtime_checkable

if TYPE_CHECKING:
    from ..observable import Disposable, Observable
    from ..sensor.base import Sensor, SensorLike, SensorType
    from ..storage import DeviceStorage, JsonSchema
    from ..types import LoggerService

from .config import (
    CameraInformation,
    CameraPluginInfo,
    CameraPropertyObservableObject,
    CameraPublicProperties,
    CameraUiSettings,
    SensorEventData,
)
from .detection import CameraDetectionSettings, DetectionLine, DetectionZone, PtzAutotrackSettings
from .enums import CameraRole, CameraType
from .events import DetectionEventPayload
from .frames import CameraFrameWorkerSettings, SnapshotSettings
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
    """Preload stream on startup."""
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

    def getSourceById(self, id: str) -> CameraDeviceSource | None:
        """
        Get a source by its ID.

        Args:
            id: The source ID.

        Returns:
            The matching source, or None if not found.
        """
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
    def logger(self) -> LoggerService:
        """Logger service for this camera."""
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

    def getSensors(self) -> list[SensorLike]:
        """Get all sensors attached to this camera (owned + foreign)."""
        ...

    def getSensor(self, sensorId: str) -> SensorLike | None:
        """Get sensor by ID (checks owned and foreign sensors)."""
        ...

    def getSensorsByType(self, sensorType: SensorType) -> list[SensorLike]:
        """Get all sensors of a specific type (owned + foreign)."""
        ...

    def onSensorProperty(
        self,
        sensor_type: SensorType,
        property: str,
        callback: Callable[[Any, int, SensorLike], None],
    ) -> Disposable:
        """
        Subscribe to a specific property on a sensor type with full lifecycle management.
        Automatically subscribes/unsubscribes when sensors of the given type are added/removed.

        Args:
            sensor_type: The sensor type to watch.
            property: The property name to observe.
            callback: Called with (value, timestamp_ms, sensor) when the property changes.

        Returns:
            Disposable to stop all subscriptions.
        """
        ...

    async def addSensor(self, sensor: Sensor[Any, Any, Any]) -> None:
        """
        Add a sensor to this camera.

        Args:
            sensor: Sensor instance to add.
        """
        ...

    async def removeSensor(self, sensorId: str) -> None:
        """
        Remove a sensor from this camera.

        Args:
            sensorId: ID of sensor to remove.
        """
        ...

    @property
    def onSensorAdded(self) -> Observable[SensorEventData]:
        """Observable for sensor additions. Emits SensorEventData when a sensor from another plugin is added."""
        ...

    @property
    def onSensorRemoved(self) -> Observable[SensorEventData]:
        """Observable for sensor removals. Emits SensorEventData when a sensor from another plugin is removed."""
        ...

    @property
    def onDetectionEvent(self) -> Observable[DetectionEventPayload]:
        """Observable for detection events (start/update/end). Thumbnails in segments are only populated on 'end' events."""
        ...

    async def implement(self, impl: CameraImplementation) -> None:
        """
        Register a camera implementation for streaming and/or snapshot.

        The impl value should implement StreamingInterface, SnapshotInterface,
        or both.

        Args:
            impl: Object or class implementing camera interfaces
        """
        ...

    def createStorage(self, schemas: list[JsonSchema]) -> DeviceStorage:
        """
        Create storage for plugin-specific camera configuration.

        Args:
            schemas: Schema definitions for the storage

        Returns:
            Typed device storage instance
        """
        ...


@runtime_checkable
class StreamingInterface(Protocol):
    async def streamUrl(self, source_id: str) -> str:
        """
        Get the streaming URL for a source.

        Args:
            source_id: The ID of the source

        Returns:
            The streaming URL (e.g., rtsp://, rtmp://, or custom protocol)
        """
        ...


@runtime_checkable
class SnapshotInterface(Protocol):
    async def snapshot(self, source_id: str, force_new: bool = False) -> bytes | None:
        """
        Get a snapshot image from the camera.

        Args:
            source_id: The source ID to get the snapshot from
            force_new: If True, bypass cache and get a fresh snapshot

        Returns:
            Image data as bytes, or None if unavailable
        """
        ...


CameraImplementation: TypeAlias = StreamingInterface | SnapshotInterface
