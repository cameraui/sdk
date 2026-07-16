"""Generic notification types — domain-agnostic.

The NotificationManager and notifier plugins talk over RPC and JSON-encode
these types directly.
"""

from __future__ import annotations

from enum import Enum
from typing import Any, NotRequired, Protocol, TypedDict, runtime_checkable

from ..storage import JsonSchema


class Severity(str, Enum):
    """Classifies how urgent a Notification is.

    Notifiers map this to platform-specific delivery characteristics; the
    host bypasses user-configured Quiet Hours for ``Critical``.
    """

    Info = "info"
    """Standard notification — default delivery (sound + banner)."""

    Warn = "warn"
    """Heightened attention; notifiers may use a different sound/colour."""

    Error = "error"
    """Failure or action-required notification."""

    Critical = "critical"
    """Highest-priority delivery on supporting notifiers; bypasses
    user-configured Quiet Hours on the host."""


class NotifierDevice(TypedDict):
    """A push-target managed by a notifier plugin (one phone, one chat, ...).

    Devices are owned by the plugin that registered them; the manager queries
    plugins for their device list rather than maintaining a shared registry.
    """

    id: str
    ownerUserId: str
    name: str
    active: bool
    metadata: NotRequired[dict[str, Any]]


class Notification(TypedDict):
    """Payload published via ``api.notificationManager.publish`` or routed by
    the host. Plugins fill the user-visible fields; the host stamps the
    message id, timestamp and source identifier on receive — plugins do not
    set those.
    """

    title: str
    """Headline shown by every notifier."""

    subtitle: NotRequired[str]
    """Optional second bold line between title and body. Honoured natively
    on iOS (APNs ``alert.subtitle``); other notifiers may fold it into the
    body or ignore it."""

    body: NotRequired[str]
    """Optional secondary text."""

    severity: NotRequired[Severity]
    """Drives DND / Critical-Alerts behaviour and Quiet-Hours bypass.
    Defaults to :attr:`Severity.Info` if omitted."""

    tag: NotRequired[str]
    """Collapse-key (e.g. ``motion:cam-1``). The host uses it to replace an older
    entry with the same tag in the in-app notification list. Delivery is not
    throttled: every publish is sent. Notifiers may map it to a platform
    collapse-id."""

    thumbnail: NotRequired[bytes]
    """Optional inline JPEG attached to the notification."""

    imageUrl: NotRequired[str]
    """Publicly-fetchable URL to a rich image (e.g. a detection snapshot).
    Notifier-agnostic: FCM/APNs and other notifiers fetch it to render the
    image. Preferred over inline ``thumbnail`` bytes when a URL is available;
    empty renders text-only."""

    deepLink: NotRequired[str]
    """Router-relative path consumed by mobile / web tap-handlers (e.g.
    ``/cameras/cam-1?startTs=...``). No host, no scheme."""

    data: NotRequired[dict[str, str]]
    """Plugin-specific context (cameraId, eventId, plugin-defined keys).
    String values keep the wire format predictable across notifier
    implementations."""

    adminOnly: NotRequired[bool]
    """Restricts delivery to users with the master or admin role. Use it for
    operational alerts that concern whoever runs the instance — camera
    offline, disk full, plugin failures — so they don't reach guests the
    instance is merely shared with. Defaults to ``False`` (every user of the
    instance receives it, subject to their own notification settings)."""


@runtime_checkable
class NotifierInterface(Protocol):
    """Implemented by plugins that deliver notifications.

    The NotificationManager invokes these methods over RPC. Plugins own their
    device storage — the manager never persists devices itself.
    """

    async def get_devices(self, owner_user_ids: list[str]) -> list[NotifierDevice]:
        """Return every device this notifier knows about for the given users.
        Each device carries its ``ownerUserId`` so the caller can map results
        back. May return [] when the notifier is unavailable (e.g. license
        invalid). Called frequently — keep cheap."""
        ...

    async def get_device(self, device_id: str) -> NotifierDevice | None:
        """Return a single device by id, or None if not found."""
        ...

    async def send_notification(self, device_ids: list[str], n: Notification) -> None:
        """Deliver a notification to the given devices in one call. Errors are
        logged; the manager never aborts a fan-out because one notifier
        failed."""
        ...

    async def register_device(self, owner_user_id: str, input: dict[str, Any]) -> NotifierDevice:
        """Create a new device on this notifier. ``input`` is plugin-specific
        JSON whose schema the notifier defines; the NotificationManager
        forwards it opaquely."""
        ...

    async def revoke_device(self, device_id: str) -> None:
        """Permanently remove a device. Called when the user revokes the
        device through their notifier-specific UI."""
        ...

    async def update_device(self, device_id: str, patch: dict[str, Any]) -> NotifierDevice | None:
        """Mutate a subset of fields on an existing device. ``patch`` is
        plugin-agnostic (``name``, ``active``); plugins ignore unknown keys.
        Returns the updated device, or None if the id isn't ours so the
        manager can probe the next plugin."""
        ...

    async def notificationSettings(self) -> list[JsonSchema] | None:
        """Return the JSON schema used to render the notifier's settings form
        in the UI. Return None for no schema."""
        ...
