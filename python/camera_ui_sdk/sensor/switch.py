from __future__ import annotations

from collections.abc import Mapping
from enum import StrEnum
from typing import Any, Generic, Literal, Protocol, overload, runtime_checkable

from typing_extensions import TypedDict, TypeVar

from ..observable import Observable
from .base import Sensor, SensorCategory, SensorLike, SensorType


class SwitchProperty(StrEnum):
    """Properties for switch controls."""

    On = "on"


class SwitchControlProperties(TypedDict):
    """Property value map for switch controls."""

    on: bool


class SwitchPropertyChangeData(TypedDict):
    """Emitted on SwitchControlLike.onPropertyChanged."""

    property: str  # SwitchProperty value
    value: bool


TStorage = TypeVar("TStorage", bound=Mapping[str, Any], default=dict[str, Any])


@runtime_checkable
class SwitchControlLike(SensorLike, Protocol):
    """Read-only proxy interface for a switch control."""

    @property
    def type(self) -> SensorType:
        return SensorType.Switch

    @overload
    def getValue(self, property: Literal[SwitchProperty.On]) -> bool | None: ...
    @overload
    def getValue(self, property: str) -> object | None: ...

    @property
    def onPropertyChanged(self) -> Observable[SwitchPropertyChangeData]: ...


class SwitchControl(Sensor[SwitchControlProperties, TStorage, str], Generic[TStorage]):
    """Generic on/off switch control. Override `setOn()` / `setOff()` to drive
    hardware and call `await super().setOn()` / `await super().setOff()` after
    success to sync the SDK state. For hardware-pushed updates, call the super
    methods from your event handler — that bypasses any plugin override and only
    syncs state.
    """

    _requires_frames = False

    def __init__(self, name: str = "Switch") -> None:
        super().__init__(name)
        self._write_state({SwitchProperty.On.value: False})

    @property
    def type(self) -> SensorType:
        return SensorType.Switch

    @property
    def category(self) -> SensorCategory:
        return SensorCategory.Control

    @property
    def on(self) -> bool:
        return bool(self.props.on)

    async def setOn(self) -> None:
        """Turn the switch on. Override to drive hardware and call
        `await super().setOn()` after success to sync the SDK state.

        Example:
            ```python
            await sw.setOn()
            ```
        """
        self._write_state({SwitchProperty.On.value: True})

    async def setOff(self) -> None:
        """Turn the switch off. Override to drive hardware and call
        `await super().setOff()` after success to sync the SDK state.

        Example:
            ```python
            await sw.setOff()
            ```
        """
        self._write_state({SwitchProperty.On.value: False})

    async def updateValue(self, property: str, value: Any) -> None:
        """Routes generic property writes to semantic methods."""
        if property == SwitchProperty.On.value:
            if value:
                await self.setOn()
            else:
                await self.setOff()
        # Unknown / non-writable property — ignored.
