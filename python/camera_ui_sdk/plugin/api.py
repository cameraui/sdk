from __future__ import annotations

from collections.abc import Awaitable, Callable
from enum import Enum
from typing import TYPE_CHECKING, Any, Protocol, runtime_checkable

if TYPE_CHECKING:
    from ..manager import CoreManager, DeviceManager, DownloadManager, NotificationManager, SensorManager

APIListener = Callable[[], None] | Callable[[], Awaitable[None]]
"""Listener for plugin lifecycle events. Coroutine functions are awaited."""


class API_EVENT(Enum):
    """Lifecycle events emitted on the PluginAPI EventEmitter.

    Plugins subscribe with ``api.on(API_EVENT.X, handler)`` to react to
    host-driven phase changes.
    """

    FINISH_LAUNCHING = "finishLaunching"
    """Emitted once after every assigned camera is wired up and ``configureCameras()`` returned. Start timers and warm-ups here."""

    SHUTDOWN = "shutdown"
    """Emitted when the host tears the plugin down. Release files, sockets, timers and child processes now."""


@runtime_checkable
class PluginAPI(Protocol):
    """The PluginAPI is injected into the plugin at runtime and exposes the
    system services the plugin is allowed to talk to. It also acts as an
    EventEmitter for plugin lifecycle events (see :class:`API_EVENT`).

    Example:
        ```python
        class MyPlugin(BasePlugin):
            async def configureCameras(self, cameras):
                ffmpeg = await self.api.coreManager.getFFmpegPath()
        ```
    """

    @property
    def coreManager(self) -> CoreManager:
        """System-level operations: the FFmpeg path and the server addresses used for media URLs (HTTP/RTSP)."""
        ...

    @property
    def deviceManager(self) -> DeviceManager:
        """Owns the camera devices assigned to this plugin and publishes camera-state changes."""
        ...

    @property
    def sensorManager(self) -> SensorManager:
        """Registers standalone sensors: entities of their own, persisted across restarts, assignable to cameras by the user."""
        ...

    @property
    def downloadManager(self) -> DownloadManager:
        """Mints token-protected download URLs for files the plugin exposes to the UI (clip exports, snapshots)."""
        ...

    @property
    def notificationManager(self) -> NotificationManager:
        """Publishes notifications to every installed notifier and the in-app UI. Requires :attr:`PluginCapability.PublishNotifications`."""
        ...

    @property
    def storagePath(self) -> str:
        """Absolute path to the plugin's writable storage directory, created and cleaned up by the host."""
        ...

    def on(self, event: API_EVENT, f: APIListener) -> Any:
        """Subscribe to a lifecycle event. Returns self for chaining."""
        ...

    def once(self, event: API_EVENT, f: APIListener) -> Any:
        """Subscribe to a lifecycle event for one delivery only. Returns self for chaining."""
        ...

    def off(self, event: API_EVENT, f: APIListener) -> None:
        """Remove a previously registered listener (alias of :meth:`removeListener`)."""
        ...

    def removeListener(self, event: API_EVENT, f: APIListener) -> None:
        """Remove a previously registered listener."""
        ...

    def removeAllListeners(self, event: API_EVENT | None = None) -> None:
        """Remove every listener for ``event``, or every listener when no event is given."""
        ...
