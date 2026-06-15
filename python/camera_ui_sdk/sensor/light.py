from __future__ import annotations

from collections.abc import Mapping
from enum import Enum
from typing import Any, Generic, Literal, Protocol, overload, runtime_checkable

from typing_extensions import TypedDict, TypeVar

from ..observable import Observable
from .base import Sensor, SensorCategory, SensorLike, SensorType


class LightCapability(str, Enum):
    """Optional capabilities for light controls."""

    Brightness = "brightness"


class LightProperty(str, Enum):
    """Properties for light controls."""

    On = "on"
    Brightness = "brightness"


class LightControlProperties(TypedDict):
    """Property value map for light controls."""

    on: bool
    brightness: int


class LightPropertyChangeData(TypedDict):
    """Emitted on LightControlLike.onPropertyChanged."""

    property: str  # LightProperty value
    value: bool | int


TStorage = TypeVar("TStorage", bound=Mapping[str, Any], default=dict[str, Any])


@runtime_checkable
class LightControlLike(SensorLike, Protocol):
    """Read-only proxy interface for a light control."""

    @property
    def type(self) -> SensorType:
        return SensorType.Light

    @overload
    def getValue(self, property: Literal[LightProperty.On]) -> bool | None: ...
    @overload
    def getValue(self, property: Literal[LightProperty.Brightness]) -> int | None: ...
    @overload
    def getValue(self, property: str) -> object | None: ...

    @property
    def onPropertyChanged(self) -> Observable[LightPropertyChangeData]: ...

    @property
    def onCapabilitiesChanged(self) -> Observable[list[LightCapability]]: ...


class LightControl(Sensor[LightControlProperties, TStorage, LightCapability], Generic[TStorage]):
    """Light control sensor. Override ``setOn()``/``setOff()`` to drive your
    hardware, then ``await super().setOn()`` / ``await super().setOff()`` to
    sync the SDK state.

    Plugins that have no hardware-action use case can leave the methods
    unoverridden — the base implementation just updates the state.

    For hardware-pushed updates (someone manually flipped the switch), call
    ``super().setOn()`` / ``super().setOff()`` from your event handler — that
    bypasses any plugin override and only syncs state.
    """

    _requires_frames = False

    def __init__(self, name: str = "Light") -> None:
        super().__init__(name)
        self._write_state(
            {
                LightProperty.On.value: False,
                LightProperty.Brightness.value: 100,
            }
        )

    @property
    def type(self) -> SensorType:
        return SensorType.Light

    @property
    def category(self) -> SensorCategory:
        return SensorCategory.Control

    @property
    def on(self) -> bool:
        return bool(self.props.on)

    @property
    def brightness(self) -> int:
        value = self.props.brightness
        return int(value) if value is not None else 0

    async def setOn(self) -> None:
        """Turn the light on. Override to drive hardware and call
        ``await super().setOn()`` after the hardware call succeeds to sync the
        SDK state.

        Example:
            ```python
            await light.setOn()
            ```
        """
        self._write_state({LightProperty.On.value: True})

    async def setOff(self) -> None:
        """Turn the light off. Override to drive hardware and call
        ``await super().setOff()`` after the hardware call succeeds to sync the
        SDK state.

        Example:
            ```python
            await light.setOff()
            ```
        """
        self._write_state({LightProperty.On.value: False})

    async def setBrightness(self, value: int) -> None:
        """Set brightness. Override to drive hardware and call
        ``await super().setBrightness(value)`` after the hardware call
        succeeds. The default implementation clamps the value to [0, 100].

        Args:
            value: Brightness level in the range 0–100.

        Example:
            ```python
            await light.setBrightness(75)
            ```
        """
        self._write_state({LightProperty.Brightness.value: max(0, min(100, value))})

    async def updateValue(self, property: str, value: Any) -> None:
        """Routes generic property writes to semantic methods."""
        if property == LightProperty.On.value:
            if value:
                await self.setOn()
            else:
                await self.setOff()
            return
        if property == LightProperty.Brightness.value:
            await self.setBrightness(int(value))
            return
        # Unknown / non-writable property — ignored.
