from __future__ import annotations

from collections.abc import Awaitable, Callable
from enum import Enum
from typing import TYPE_CHECKING, Any, Protocol, runtime_checkable

if TYPE_CHECKING:
    from ..manager import CoreManager, DeviceManager, DownloadManager, NotificationManager

APIListener = Callable[[], None] | Callable[[], Awaitable[None]]
"""Listener for plugin lifecycle events. May be a plain callable or a
coroutine function — the runtime awaits the latter."""


class API_EVENT(Enum):
    """Lifecycle events emitted on the PluginAPI EventEmitter.

    Plugins subscribe with ``api.on(API_EVENT.X, handler)`` to react to
    host-driven phase changes.
    """

    FINISH_LAUNCHING = "finishLaunching"
    """Emitted exactly once after the plugin has been constructed, all
    assigned cameras have been wired up, and ``configureCameras()`` has
    returned. Use this to start background work that must wait until the
    camera set is stable (timers, model warm-up, outbound connections)."""

    SHUTDOWN = "shutdown"
    """Emitted when the host is tearing the plugin down (graceful stop,
    reload or process exit). Listeners must release resources synchronously
    enough to finish before the host kills the process — open files,
    sockets, timers, child processes."""


@runtime_checkable
class PluginAPI(Protocol):
    """The PluginAPI is injected into the plugin at runtime and exposes the
    system services the plugin is allowed to talk to. It also acts as an
    EventEmitter for plugin lifecycle events (see :class:`API_EVENT`).

    The API is passed to the plugin constructor and should be stored for
    later use.

    Example:
        ```python
        class MyPlugin(BasePlugin):
            def __init__(self, logger, api, storage):
                super().__init__(logger, api, storage)
                # Access FFmpeg path
                ffmpeg = await api.coreManager.getFFmpegPath()
        ```
    """

    @property
    def coreManager(self) -> CoreManager:
        """System-level operations such as the FFmpeg path and the server
        addresses used for media URLs (HTTP/RTSP)."""
        ...

    @property
    def deviceManager(self) -> DeviceManager:
        """Owns the camera devices assigned to this plugin and publishes
        camera-state changes."""
        ...

    @property
    def downloadManager(self) -> DownloadManager:
        """Mints token-protected download URLs for files the plugin wants to
        expose to the UI (e.g. clip exports, snapshots)."""
        ...

    @property
    def notificationManager(self) -> NotificationManager:
        """Publishes notifications into the host so they fan out to every
        installed Notifier-plugin and the in-app UI. Requires
        :attr:`PluginCapability.PublishNotifications` in the plugin contract."""
        ...

    @property
    def storagePath(self) -> str:
        """Absolute path to the plugin's writable storage directory.
        Created and cleaned up by the host. Use it for caches, models,
        sqlite/bolt files."""
        ...

    def on(self, event: API_EVENT, f: APIListener) -> Any:
        """Subscribe to a lifecycle event.

        Args:
            event: Lifecycle event to subscribe to.
            f: Event listener (sync callable or coroutine function).

        Returns:
            Self for chaining.
        """
        ...

    def once(self, event: API_EVENT, f: APIListener) -> Any:
        """Subscribe to a lifecycle event for one delivery only.

        Args:
            event: Lifecycle event to subscribe to.
            f: Event listener (sync callable or coroutine function).

        Returns:
            Self for chaining.
        """
        ...

    def off(self, event: API_EVENT, f: APIListener) -> None:
        """Remove a previously registered listener (alias of
        :meth:`removeListener`).

        Args:
            event: Lifecycle event the listener was registered for.
            f: Listener to remove.
        """
        ...

    def removeListener(self, event: API_EVENT, f: APIListener) -> None:
        """Remove a previously registered listener.

        Args:
            event: Lifecycle event the listener was registered for.
            f: Listener to remove.
        """
        ...

    def removeAllListeners(self, event: API_EVENT | None = None) -> None:
        """Remove every listener for ``event``, or every listener entirely if
        no event is given.

        Args:
            event: Lifecycle event whose listeners should be removed, or
                ``None`` to clear all listeners.
        """
        ...
