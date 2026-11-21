from __future__ import annotations

import threading
from collections.abc import Mapping
from enum import StrEnum
from typing import Any, Generic, Literal, NotRequired, Protocol, overload, runtime_checkable

from typing_extensions import TypedDict, TypeVar

from ..observable import Observable
from .base import Sensor, SensorCategory, SensorLike, SensorType
from .device import DeviceInfo
from .property_spec import PropertySpecOverride


class AccessProperty(StrEnum):
    """Property names of an access reader."""

    Result = "result"
    """Result of the attempt in progress, empty between attempts."""
    Method = "method"
    """How the last attempt was made."""
    User = "user"
    """Who made the last attempt, empty when unknown."""


class AccessResult(StrEnum):
    """Result of an access attempt."""

    Granted = "granted"
    """Access was granted."""
    Denied = "denied"
    """Access was denied."""


class AccessMethod(StrEnum):
    """How an access attempt was made."""

    Fingerprint = "fingerprint"
    """Fingerprint."""
    Nfc = "nfc"
    """NFC card or tag."""
    Pin = "pin"
    """PIN code."""
    Face = "face"
    """Face recognition at the device."""
    App = "app"
    """App on a phone."""


class AccessTriggerProperties(TypedDict):
    """Property values of an access reader."""

    result: str
    method: str
    user: str


class AccessAttempt(TypedDict):
    """Details of an access attempt, as the device reports them."""

    method: NotRequired[AccessMethod]
    """How the attempt was made."""
    user: NotRequired[str]
    """Who made it, when the device knows."""


class AccessPropertyChangeData(TypedDict):
    """Property change payload emitted on AccessTriggerLike.onPropertyChanged."""

    property: str
    """Name of the changed property, an AccessProperty value."""
    value: str
    """New value of the property."""


TStorage = TypeVar("TStorage", bound=Mapping[str, Any], default=dict[str, Any])


@runtime_checkable
class AccessTriggerLike(SensorLike, Protocol):
    """Read-only proxy interface for an access reader."""

    @property
    def type(self) -> SensorType:
        return SensorType.Access

    @property
    def onPropertyChanged(self) -> Observable[AccessPropertyChangeData]: ...

    @overload
    def getValue(
        self, property: Literal[AccessProperty.Result, AccessProperty.Method, AccessProperty.User]
    ) -> str | None: ...
    @overload
    def getValue(self, property: str) -> object | None: ...


#: Time a result stays set before the reader is idle again (ms).
ACCESS_AUTO_RESET_MS = 2000


class AccessTrigger(Sensor[AccessTriggerProperties, TStorage, str], Generic[TStorage]):
    """Access reader, such as a fingerprint or NFC reader on a doorbell or a keypad.

    Call ``report()`` for each attempt: ``result`` is set and goes back to empty
    after ``ACCESS_AUTO_RESET_MS``, method and user stay until the next attempt.
    """

    _requires_frames = False

    def __init__(
        self,
        name: str = "Access",
        *,
        native_id: str | None = None,
        origin: str | None = None,
        address: str | None = None,
        device: DeviceInfo | None = None,
        primary: bool = False,
        property_specs: Mapping[str, PropertySpecOverride] | None = None,
    ) -> None:
        super().__init__(
            name,
            native_id=native_id,
            origin=origin,
            address=address,
            device=device,
            primary=primary,
            property_specs=property_specs,
        )
        self._result_reset_timer: threading.Timer | None = None
        self._write_state(
            {AccessProperty.Result.value: "", AccessProperty.Method.value: "", AccessProperty.User.value: ""}
        )

    @property
    def type(self) -> SensorType:
        return SensorType.Access

    @property
    def category(self) -> SensorCategory:
        return SensorCategory.Trigger

    @property
    def result(self) -> str:
        """Result of the attempt in progress, empty between attempts."""
        return str(self.props.result or "")

    @property
    def method(self) -> str:
        """How the last attempt was made."""
        return str(self.props.method or "")

    @property
    def user(self) -> str:
        """Who made the last attempt, empty when unknown."""
        return str(self.props.user or "")

    def report(self, result: AccessResult, attempt: AccessAttempt | None = None) -> None:
        """Report an access attempt. An attempt while the last result is still set
        counts as a new one.

        Args:
            result: Whether access was granted.
            attempt: How the attempt was made and by whom.

        Example:
            ```python
            reader.report(AccessResult.Granted, {"method": AccessMethod.Fingerprint, "user": "Anna"})
            ```
        """
        details = attempt or {}
        if self._result_reset_timer is not None:
            self._result_reset_timer.cancel()
        if self.props.result:
            self._write_state({AccessProperty.Result.value: ""})
        self._write_state(
            {
                AccessProperty.Method.value: details.get("method", ""),
                AccessProperty.User.value: details.get("user", ""),
            }
        )
        self._write_state({AccessProperty.Result.value: result.value})

        def _reset() -> None:
            self._result_reset_timer = None
            self._write_state({AccessProperty.Result.value: ""})

        self._result_reset_timer = threading.Timer(ACCESS_AUTO_RESET_MS / 1000.0, _reset)
        self._result_reset_timer.daemon = True
        self._result_reset_timer.start()

    async def updateValue(self, property: str, value: Any) -> None:
        """An access reader takes no writes, attempts come from the device."""

    def _cleanup(self) -> None:
        if self._result_reset_timer is not None:
            self._result_reset_timer.cancel()
            self._result_reset_timer = None
        super()._cleanup()
