from __future__ import annotations

from collections.abc import Mapping
from enum import Enum
from typing import Any, Generic, Literal, Protocol, overload, runtime_checkable

from typing_extensions import TypedDict, TypeVar

from ..observable import Observable
from .base import Sensor, SensorCategory, SensorLike, SensorType


class SirenCapability(str, Enum):
    """Optional capabilities for siren controls."""

    Volume = "volume"


class SirenProperty(str, Enum):
    """Properties for siren controls."""

    Active = "active"
    Volume = "volume"


class SirenControlProperties(TypedDict):
    """Property value map for siren controls."""

    active: bool
    volume: int


class SirenPropertyChangeData(TypedDict):
    """Emitted on SirenControlLike.onPropertyChanged."""

    property: str  # SirenProperty value
    value: bool | int


TStorage = TypeVar("TStorage", bound=Mapping[str, Any], default=dict[str, Any])


@runtime_checkable
class SirenControlLike(SensorLike, Protocol):
    """Read-only proxy interface for a siren control."""

    @property
    def type(self) -> SensorType:
        return SensorType.Siren

    @overload
    def getValue(self, property: Literal[SirenProperty.Active]) -> bool | None: ...
    @overload
    def getValue(self, property: Literal[SirenProperty.Volume]) -> int | None: ...
    @overload
    def getValue(self, property: str) -> object | None: ...

    @property
    def onPropertyChanged(self) -> Observable[SirenPropertyChangeData]: ...

    @property
    def onCapabilitiesChanged(self) -> Observable[list[SirenCapability]]: ...


class SirenControl(Sensor[SirenControlProperties, TStorage, SirenCapability], Generic[TStorage]):
    """Siren control sensor. Override `setActive()`/`setInactive()` to drive
    your hardware, then `await super().setActive()` / `await super().setInactive()`
    to sync the SDK state.
    """

    _requires_frames = False

    def __init__(self, name: str = "Siren") -> None:
        super().__init__(name)
        self._write_state(
            {
                SirenProperty.Active.value: False,
                SirenProperty.Volume.value: 100,
            }
        )

    @property
    def type(self) -> SensorType:
        return SensorType.Siren

    @property
    def category(self) -> SensorCategory:
        return SensorCategory.Control

    @property
    def active(self) -> bool:
        return bool(self.props.active)

    @property
    def volume(self) -> int:
        value = self.props.volume
        return int(value) if value is not None else 0

    async def setActive(self) -> None:
        """Activate the siren. Override to drive hardware and call
        `await super().setActive()` after success to sync the SDK state.
        """
        self._write_state({SirenProperty.Active.value: True})

    async def setInactive(self) -> None:
        """Deactivate the siren. Override to drive hardware and call
        `await super().setInactive()` after success to sync the SDK state.
        """
        self._write_state({SirenProperty.Active.value: False})

    async def setVolume(self, value: int) -> None:
        """Set volume. Override to drive hardware and call
        `await super().setVolume(value)` after success. The default implementation
        clamps the value to [0, 100].
        """
        self._write_state({SirenProperty.Volume.value: max(0, min(100, value))})

    async def updateValue(self, property: str, value: Any) -> None:
        """Routes generic property writes to semantic methods."""
        if property == SirenProperty.Active.value:
            if value:
                await self.setActive()
            else:
                await self.setInactive()
            return
        if property == SirenProperty.Volume.value:
            await self.setVolume(int(value))
            return
        # Unknown / non-writable property — ignored.
