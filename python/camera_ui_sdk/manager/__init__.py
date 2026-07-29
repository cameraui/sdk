from __future__ import annotations

from typing import TYPE_CHECKING, Any, Literal, NotRequired, Protocol, TypedDict, runtime_checkable

if TYPE_CHECKING:
    from ..camera import CameraDevice
    from ..observable import Observable
    from ..plugin import BasePlugin, PluginInfo, PluginInterface
    from ..plugin.notifier import Notification
    from ..sensor.base import Sensor


class CoreManagerEvent(TypedDict):
    """
    Core manager event payload.

    The host currently publishes one event type, ``cloudAccountChanged``.
    Subscribe via ``coreManager.onEvent`` to react to it.
    """

    type: str
    """Event type identifier (e.g. ``cloudAccountChanged``)."""

    data: Any
    """Event-specific data payload. Shape depends on the event type."""


@runtime_checkable
class CoreManager(Protocol):
    """
    Core manager interface for system-level operations.

    Provides access to cross-cutting services like the FFmpeg binary path,
    server addresses, the cloud server id, inter-plugin lookup, and a stream
    of core system events.

    Accessed via `api.coreManager` in plugins.

    Example:
        ```python
        ffmpeg_path = await api.coreManager.getFFmpegPath()
        addresses = await api.coreManager.getServerAddresses()


        def on_event(e):
            if e["type"] == "cloudAccountChanged":
                print("Cloud account state:", e["data"])


        api.coreManager.onEvent.subscribe(on_event)
        ```
    """

    @property
    def onEvent(self) -> Observable[CoreManagerEvent]:
        """
        Observable for core manager events (e.g. cloud account changes).

        Example:
            ```python
            api.coreManager.onEvent.subscribe(lambda e: print(e["type"], e["data"]))
            ```
        """
        ...

    async def connectToPlugin(self, pluginName: str) -> BasePlugin | None:
        """
        Connect to another plugin by name.

        Args:
            pluginName: Name of the plugin to connect to

        Returns:
            Plugin instance or None if not found. Cast to specific interface as needed.
        """
        ...

    async def getFFmpegPath(self) -> str:
        """
        Get the FFmpeg executable path.

        Returns:
            Path to FFmpeg binary
        """
        ...

    async def getServerAddresses(self) -> list[str]:
        """
        Get server addresses (IP addresses the server is listening on).

        Returns:
            List of server addresses
        """
        ...

    async def getCloudServerId(self) -> str:
        """
        Get the cloud server identity this server is registered as.

        Returns the cloud ``server_id`` from the active cloud pairing, or an
        empty string when the server is not connected to the cloud.

        Returns:
            Cloud server id, or an empty string if not paired
        """
        ...

    async def getPluginsByInterface(self, interfaceName: PluginInterface) -> list[PluginInfo]:
        """
        Get all installed, enabled plugins that implement a specific interface.

        Plugins the admin disabled are excluded. A returned plugin may still be
        starting up or may have crashed, so a call into one can fail.

        Args:
            interfaceName: Plugin interface name (e.g., 'ClipDetection')

        Returns:
            List of plugin info dicts with id, name, contract
        """
        ...


@runtime_checkable
class SensorManager(Protocol):
    """
    Sensor manager for standalone sensors: devices that are not part of a
    camera's hardware (smart plugs, imported smart-home devices, hubs).

    The host persists each sensor as its own entity: the user assigns it to
    cameras, renames it and decides whether it is exported to HomeKit/HA/MQTT.
    Sensors that belong to a camera's hardware are registered via
    ``camera.addSensor()`` instead.

    Accessed via `api.sensorManager` in plugins.

    Example:
        ```python
        lock = LockControl("Front Door", native_id="lock.front_door")
        await api.sensorManager.addSensor(lock)
        ```
    """

    async def addSensor(self, sensor: Sensor[Any, Any, Any]) -> None:
        """
        Register a standalone sensor with the host.

        The host reconciles it against the persisted entity by
        ``(pluginId, nativeId)``, or by ``(type, name)`` when no native_id is
        set, and replaces the sensor's provisional ``id`` with the persistent
        entity id. Camera assignment is the user's decision and happens in the UI.

        Args:
            sensor: Sensor instance to register
        """
        ...

    async def removeSensor(self, sensor: Sensor[Any, Any, Any]) -> None:
        """
        Unregister a sensor. The persisted entity stays (shows disconnected)
        unless the user deletes it in the UI.

        Args:
            sensor: Sensor instance to unregister
        """
        ...

    def getSensors(self) -> list[Sensor[Any, Any, Any]]:
        """
        Get all sensors this plugin has registered in this session.

        Returns:
            Sensor instances owned by this plugin
        """
        ...


@runtime_checkable
class DeviceManager(Protocol):
    """
    Device manager interface for camera operations.
    Provides methods to push discovered cameras and get camera devices.

    Accessed via `api.deviceManager` in plugins.

    Example:
        ```python
        # Get a camera by ID or name
        camera = await api.deviceManager.getCamera("Front Door")

        # Push discovered cameras (for cloud-based discovery)
        discovered = await fetch_cameras_from_cloud()
        await api.deviceManager.pushDiscoveredCameras(discovered)
        ```
    """

    async def pushDiscoveredCameras(self, cameras: list[DiscoveredCamera]) -> None:
        """
        Push discovered cameras to the backend.
        Use this when cameras are discovered asynchronously (e.g., after cloud login).
        Cameras become visible in the UI without waiting for the next poll.
        Only available for CameraController and CameraAndSensorProvider plugins.

        Args:
            cameras: List of discovered cameras to push
        """
        ...

    async def getCamera(self, cameraIdOrName: str) -> CameraDevice | None:
        """
        Get a camera by ID or name.

        Args:
            cameraIdOrName: Camera ID or name

        Returns:
            Camera device or None if not found
        """
        ...


class DiscoveredCamera(TypedDict):
    """
    Discovered camera from a discovery provider.

    Represents a camera found during network scanning or cloud lookup that
    can be adopted into the system. Push these via
    ``deviceManager.pushDiscoveredCameras`` so the user can pick them in
    the UI without waiting for the next discovery poll.
    """

    id: str
    """Unique, stable identifier for this discovered camera (used for deduplication)."""

    name: str
    """Display name shown in the UI adoption list."""

    manufacturer: NotRequired[str]
    """Camera manufacturer label (optional)."""

    model: NotRequired[str]
    """Camera model label (optional)."""

    address: NotRequired[str]
    """Network address (IP or hostname) shown in the UI to disambiguate same-model cameras."""


class CreateDownloadOptions(TypedDict):
    """Options for creating a download."""

    filePath: str
    """Absolute path to the file on disk."""

    filename: NotRequired[str]
    """Filename for Content-Disposition header (defaults to basename of filePath)."""

    mimeType: NotRequired[str]
    """MIME type for Content-Type header (defaults to application/octet-stream)."""

    ttlMs: NotRequired[int]
    """Time-to-live in milliseconds (defaults to 10 minutes)."""

    cleanup: NotRequired[Literal["never", "on-expiry", "on-download"]]
    """When the file on disk is deleted (registry always expires at TTL).

    - ``never`` (default): file persists; caller manages it.
    - ``on-expiry``: deleted at TTL. Can be fetched N times during the
      window, the right mode for notification images that fan out to
      multiple devices or recipients.
    - ``on-download``: deleted after first successful download OR on TTL,
      whichever first. One-shot mode for things like backup exports."""


class CreateStreamDownloadOptions(CreateDownloadOptions):
    """Options for creating a streaming download (progressive file tailing)."""

    markerPath: str
    """Path to a marker file that signals export is still in progress."""


class DownloadToken(TypedDict):
    """Token returned after registering a download."""

    token: str
    """Unique download token."""

    url: str
    """In-app, same-origin URL: ``/api/download/<token>``.
    Use for callers already authenticated against this server."""

    publicUrl: str
    """Externally-reachable, session-less URL the server publishes for
    out-of-band fetchers (push-notification image attachments, FCM / APNs
    payloads, share recipients). Shape: ``<externalUrl>/api/download/<token>``,
    where the token is the auth. Empty string when the server has no external
    URL configured (LAN-only deployments); fall back to ``url`` for in-app
    callers."""

    expiresAt: int
    """Unix timestamp (ms) when the token expires."""


@runtime_checkable
class DownloadManager(Protocol):
    """
    Download manager interface for token-based file downloads.

    Plugins register a file and get back a token URL. No JWT is involved, the
    token itself is the auth.

    Accessed via ``api.downloadManager`` in plugins.

    Example:
        ```python
        result = await api.downloadManager.createDownload(
            {
                "filePath": "/tmp/export.mp4",
                "filename": "recording.mp4",
                "mimeType": "video/mp4",
                "ttlMs": 600000,
                "cleanup": "on-download",
            }
        )
        token, url = result["token"], result["url"]
        ```
    """

    async def createDownload(self, options: CreateDownloadOptions) -> DownloadToken:
        """
        Register a file for download and get a token-based URL.

        Args:
            options: Download options

        Returns:
            Token, URL, and expiry information
        """
        ...

    async def createStreamDownload(self, options: CreateStreamDownloadOptions) -> DownloadToken:
        """
        Register a streaming file for progressive download.

        The file is tailed during writing; the marker file signals completion.

        Args:
            options: Streaming download options (includes markerPath)

        Returns:
            Token, URL, and expiry information
        """
        ...

    async def deleteDownload(self, token: str) -> None:
        """
        Remove a download token and optionally delete the file.

        Args:
            token: The download token to remove
        """
        ...


@runtime_checkable
class NotificationManager(Protocol):
    """
    Notification manager interface for publishing notifications into the host.

    Plugins call ``publish`` to ask the host to fan a Notification out to every
    installed Notifier-plugin and the in-app UI. The host applies user settings
    (master toggle, per-source toggle, quiet hours) and the publishing plugin's
    declared capabilities; calls from plugins without
    :attr:`PluginCapability.PublishNotifications` are silently dropped.

    Accessed via ``api.notificationManager`` in plugins.

    Example:
        ```python
        await api.notificationManager.publish(
            {
                "title": "Camera offline",
                "body": "Front Door stopped recording",
                "severity": Severity.Warn,
                "deepLink": "/cameras/front-door",
                "data": {"cameraId": "front-door"},
            }
        )
        ```
    """

    async def publish(self, notification: Notification) -> None:
        """
        Send a notification to the host for fan-out to every installed
        Notifier-plugin and the in-app UI.

        Resolves once the publish was handed to the transport. Downstream
        delivery is async and failures there never propagate back here.

        Args:
            notification: Notification payload to publish.
        """
        ...


__all__ = [
    # Manager interfaces
    "CoreManager",
    "CoreManagerEvent",
    "DeviceManager",
    "DownloadManager",
    "NotificationManager",
    "SensorManager",
    # Download types
    "CreateDownloadOptions",
    "CreateStreamDownloadOptions",
    "DownloadToken",
    # Discovery types
    "DiscoveredCamera",
]
