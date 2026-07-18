from __future__ import annotations

import threading
from collections.abc import Mapping
from enum import StrEnum
from typing import Any, Generic, Literal, Protocol, overload, runtime_checkable

from typing_extensions import TypedDict, TypeVar

from ..observable import Observable
from .base import Sensor, SensorCategory, SensorLike, SensorType


class DoorbellProperty(StrEnum):
    """Properties for doorbell triggers."""

    Ring = "ring"
    """Whether the doorbell is currently ringing."""


class DoorbellTriggerProperties(TypedDict):
    """Property value map for doorbell triggers."""

    ring: bool


class DoorbellPropertyChangeData(TypedDict):
    """Emitted on DoorbellTriggerLike.onPropertyChanged."""

    property: str  # DoorbellProperty value
    value: bool


TStorage = TypeVar("TStorage", bound=Mapping[str, Any], default=dict[str, Any])


@runtime_checkable
class DoorbellTriggerLike(SensorLike, Protocol):
    """Read-only proxy interface for a doorbell trigger."""

    @property
    def type(self) -> SensorType:
        return SensorType.Doorbell

    @overload
    def getValue(self, property: Literal[DoorbellProperty.Ring]) -> bool | None: ...
    @overload
    def getValue(self, property: str) -> object | None: ...

    @property
    def onPropertyChanged(self) -> Observable[DoorbellPropertyChangeData]: ...


#: Auto-reset duration after `trigger()` is called (ms).
RING_AUTO_RESET_MS = 2000


class DoorbellTrigger(Sensor[DoorbellTriggerProperties, TStorage, str], Generic[TStorage]):
    """Doorbell trigger sensor.

    Plugin authors call `trigger()` to fire a doorbell event. The `ring` property
    is set to True and automatically reset to False after a short delay
    (``RING_AUTO_RESET_MS``). Calling `trigger()` again while still ringing
    resets the timer (extends the ring phase).
    """

    _requires_frames = False

    def __init__(self, name: str = "Doorbell") -> None:
        super().__init__(name)
        self._ring_reset_timer: threading.Timer | None = None
        self._write_state({DoorbellProperty.Ring.value: False})

    @property
    def type(self) -> SensorType:
        return SensorType.Doorbell

    @property
    def category(self) -> SensorCategory:
        return SensorCategory.Trigger

    @property
    def ring(self) -> bool:
        return bool(self.props.ring)

    def trigger(self) -> None:
        """Trigger a doorbell ring. Sets ``ring = True`` and auto-resets after a
        short delay. Re-triggering while still ringing extends the ring phase.

        Example:
            ```python
            doorbell.trigger()
            ```
        """
        if self._ring_reset_timer is not None:
            self._ring_reset_timer.cancel()
            self._ring_reset_timer = None

        self._write_state({DoorbellProperty.Ring.value: True})

        def _reset() -> None:
            self._ring_reset_timer = None
            self._write_state({DoorbellProperty.Ring.value: False})

        self._ring_reset_timer = threading.Timer(RING_AUTO_RESET_MS / 1000.0, _reset)
        self._ring_reset_timer.daemon = True
        self._ring_reset_timer.start()

    async def updateValue(self, property: str, value: Any) -> None:
        """Cross-process consumer entry point. Writing ``ring=true`` (any
        truthy value) dispatches to ``trigger()`` so a UI test button or
        external automation can fire the doorbell using the same flow as a
        real hardware ring (auto-reset included). Writing ``ring=false`` is
        ignored — the auto-reset timer owns the off transition.
        """
        if property == DoorbellProperty.Ring.value and value:
            self.trigger()

    def _cleanup(self) -> None:
        if self._ring_reset_timer is not None:
            self._ring_reset_timer.cancel()
            self._ring_reset_timer = None
        super()._cleanup()
