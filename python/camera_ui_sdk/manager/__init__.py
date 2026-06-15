from __future__ import annotations

from typing import TYPE_CHECKING, Any, Literal, NotRequired, Protocol, TypedDict, runtime_checkable

if TYPE_CHECKING:
    from ..camera import CameraDevice
    from ..observable import Observable
    from ..plugin import BasePlugin, PluginInfo, PluginInterface
    from ..plugin.notifier import Notification


class CoreManagerEvent(TypedDict):
    """
    Core manager event payload.

    Emitted when a core system event occurs (e.g. cloud account changes,
    remote-server availability, plugin lifecycle changes). Subscribe via
    ``coreManager.onEvent`` to react to system-level state changes.
    """

    type: str
    """Event type identifier (e.g. ``cloudAccountChanged``)."""

    data: Any
    """Event-specific data payload. Shape depends on the event type."""


@runtime_checkable
class CoreManager(Protocol):
    """
    Core manager interface for system operations.

    Provides access to system-level functionality like FFmpeg path,
    server addresses, and inter-plugin communication.

    Accessed via `api.coreManager` in plugins.

    Example:
        ```python
        # Get FFmpeg path for spawning processes
        ffmpeg_path = await api.coreManager.getFFmpegPath()

        # Get server addresses for stream URLs
        addresses = await api.coreManager.getServerAddresses()
        ```
    """

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

    async def getPluginsByInterface(self, interfaceName: PluginInterface) -> list[PluginInfo]:
        """
        Get all active plugins that implement a specific interface.

        Args:
            interfaceName: Plugin interface name (e.g., 'ClipDetection')

        Returns:
            List of plugin info dicts with id, name, contract
        """
        ...

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


@runtime_checkable
class DeviceManager(Protocol):
    """
    Device manager interface for camera operations.
    Provides methods to get cameras and push discovered cameras.

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
        Cameras will be immediately visible in the UI for adoption.

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


class CreateDownloadOptions(TypedDict):
    """Options for creating a download."""

    filePath: str
    """Absolute path to the file on disk."""

    filename: NotRequired[str]
    """Filename for Content-Disposition header."""

    mimeType: NotRequired[str]
    """MIME type for Content-Type header."""

    ttlMs: NotRequired[int]
    """Time-to-live in milliseconds."""

    cleanup: NotRequired[Literal["never", "on-expiry", "on-download"]]
    """When the file on disk is deleted (registry always expires at TTL).

    - ``never`` (default): file persists; caller manages it.
    - ``on-expiry``: deleted at TTL. Can be fetched N times during the
      window — correct mode for notification images that fan out to
      multiple devices/recipients.
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
    payloads, share recipients). Shape: ``<externalUrl>/api/download/<token>``
    — the token in the URL is the auth. Empty string when the server has
    no external URL configured (LAN-only deployments); fall back to
    ``url`` for in-app callers."""

    expiresAt: int
    """Unix timestamp (ms) when the token expires."""


@runtime_checkable
class DownloadManager(Protocol):
    """
    Download manager interface for token-based file downloads.

    Allows plugins to register files for HTTP download via a token URL.
    No JWT authentication is needed — the token itself is the auth.

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

    Plugins call ``publish`` to ask the host to fan a Notification out to
    every installed Notifier-plugin and the
    in-app UI. The host applies user settings (master toggle, per-source
    toggle, quiet hours) and the publishing plugin's declared capabilities;
    calls from plugins without
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
        delivery is async and failures there never
        propagate back here.

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
    # Signed request
    # Download types
    "CreateDownloadOptions",
    "CreateStreamDownloadOptions",
    "DownloadToken",
    # Discovery types
    "DiscoveredCamera",
]
