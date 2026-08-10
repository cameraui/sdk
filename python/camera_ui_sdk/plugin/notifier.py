from __future__ import annotations

from enum import StrEnum
from typing import Any, NotRequired, Protocol, TypedDict, runtime_checkable

from ..storage import JsonSchema


class Severity(StrEnum):
    """Classifies how urgent a Notification is.

    Notifiers map this to platform-specific delivery characteristics; the
    host bypasses user-configured Quiet Hours for ``Critical``.
    """

    Info = "info"
    """Standard notification, default delivery (sound + banner)."""

    Warn = "warn"
    """Heightened attention; notifiers may use a different sound or colour."""

    Error = "error"
    """Failure or action-required notification."""

    Critical = "critical"
    """Highest-priority delivery on supporting notifiers; bypasses Quiet Hours."""


class NotifierDevice(TypedDict):
    """A push-target managed by a notifier plugin (one phone, one chat, ...).

    Devices are owned by the plugin that registered them; the manager queries
    plugins for their device list rather than maintaining a shared registry.
    """

    id: str
    """Plugin-assigned device id, unique within the notifier."""

    ownerUserId: str
    """User the device belongs to."""

    name: str
    """Display name shown in the UI."""

    active: bool
    """False while the user has muted this device; the manager skips it."""

    metadata: NotRequired[dict[str, Any]]
    """Plugin-specific extras (push tokens, chat ids, platform hints)."""


class Notification(TypedDict):
    """Payload published via ``api.notificationManager.publish`` or routed by
    the host. Plugins fill the user-visible fields; the host stamps the
    message id, timestamp and source identifier on receive.
    """

    title: str
    """Headline shown by every notifier."""

    subtitle: NotRequired[str]
    """Optional second bold line, honoured natively on iOS; other notifiers may fold it into the body."""

    body: NotRequired[str]
    """Optional secondary text."""

    severity: NotRequired[Severity]
    """Drives DND / Critical-Alerts behaviour and Quiet-Hours bypass. Defaults to :attr:`Severity.Info`."""

    tag: NotRequired[str]
    """Collapse-key (e.g. ``motion:cam-1``). The host replaces an older entry
    with the same tag in the in-app list. Delivery is not throttled: every
    publish is sent. Notifiers may map it to a platform collapse-id."""

    thumbnail: NotRequired[bytes]
    """Optional inline JPEG attached to the notification."""

    imageUrl: NotRequired[str]
    """Publicly-fetchable URL to a rich image (e.g. a detection snapshot).
    Preferred over inline ``thumbnail`` bytes when a URL is available; empty
    renders text-only."""

    deepLink: NotRequired[str]
    """Router-relative path for mobile / web tap-handlers (e.g. ``/cameras/cam-1``). No host, no scheme."""

    data: NotRequired[dict[str, str]]
    """Plugin-specific context (cameraId, eventId, plugin-defined keys), string values only."""

    adminOnly: NotRequired[bool]
    """Restricts delivery to users with the master or admin role. Use it for
    operational alerts (camera offline, disk full, plugin failures) so they
    don't reach guests the instance is merely shared with. Defaults to
    ``False``."""

    silent: NotRequired[bool]
    """Delivers without sound, vibration or badge increment: meant for publishes
    that replace an earlier notification with the same ``tag`` (e.g. a richer
    description superseding the initial alert). The banner still updates.
    Ignored when ``severity`` is :attr:`Severity.Critical`. Defaults to
    ``False``."""


@runtime_checkable
class NotifierInterface(Protocol):
    """Implemented by plugins that deliver notifications.

    The NotificationManager invokes these methods over RPC. Plugins own their
    device storage, the manager never persists devices itself.
    """

    async def get_devices(self, owner_user_ids: list[str]) -> list[NotifierDevice]:
        """Return the devices this notifier knows for the given users, each
        carrying its ``ownerUserId``. Return [] when the notifier is
        unavailable (e.g. invalid license). Called often, keep it cheap."""
        ...

    async def get_device(self, device_id: str) -> NotifierDevice | None:
        """Return a single device by id, or None if not found."""
        ...

    async def send_notification(self, device_ids: list[str], n: Notification) -> None:
        """Deliver a notification to the given devices in one call. Errors are logged, a failing notifier never aborts the fan-out."""
        ...

    async def register_device(self, owner_user_id: str, input: dict[str, Any]) -> NotifierDevice:
        """Create a new device. ``input`` is plugin-specific JSON the manager forwards opaquely."""
        ...

    async def revoke_device(self, device_id: str) -> None:
        """Permanently remove a device. Called when the user revokes it through their notifier-specific UI."""
        ...

    async def update_device(self, device_id: str, patch: dict[str, Any]) -> NotifierDevice | None:
        """Mutate ``name`` / ``active`` on an existing device. Return None if the id isn't ours so the manager can probe the next plugin."""
        ...

    async def notificationSettings(self) -> list[JsonSchema] | None:
        """Return the JSON schema used to render the notifier's settings form in the UI, or None for no schema."""
        ...
