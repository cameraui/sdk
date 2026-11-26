from __future__ import annotations

import math
from collections.abc import Mapping
from enum import StrEnum
from typing import Any, Generic, Literal, Protocol, overload, runtime_checkable

from typing_extensions import TypedDict, TypeVar

from ..internal.shared_utils import round_percent
from ..observable import Observable
from .base import Sensor, SensorCategory, SensorLike, SensorType
from .device import DeviceInfo
from .property_spec import PropertySpecOverride


class AirPurifierState(StrEnum):
    """What an air purifier does right now."""

    Inactive = "inactive"
    Idle = "idle"
    Purifying = "purifying"


class AirPurifierCapability(StrEnum):
    """Optional capabilities of an air purifier."""

    State = "state"
    """Purifier reports whether it is purifying or idle while it is on."""
    Speed = "speed"
    """Purifier runs at a set speed."""
    Auto = "auto"
    """Purifier has an automatic mode."""
    Preset = "preset"
    """Purifier offers presets such as sleep or turbo."""
    ChildLock = "childLock"
    """Purifier locks its buttons against children."""
    Filter = "filter"
    """Purifier reports the state of its filter."""


class AirPurifierProperty(StrEnum):
    """Property names of an air purifier."""

    On = "on"
    """``True`` while the purifier is on, a command when written."""
    State = "state"
    """What the purifier does right now, an ``AirPurifierState``."""
    Speed = "speed"
    """Speed in percent."""
    Auto = "auto"
    """``True`` while the purifier runs in its automatic mode."""
    Preset = "preset"
    """Active preset, one of the choices the plugin sets."""
    ChildLock = "childLock"
    """``True`` while the buttons on the purifier are locked."""
    FilterLife = "filterLife"
    """Filter life left in percent."""
    FilterChange = "filterChange"
    """``True`` when the filter needs a change."""


class AirPurifierControlProperties(TypedDict):
    """Property values of an air purifier."""

    on: bool
    state: str | None
    speed: int
    auto: bool
    preset: str | None
    childLock: bool
    filterLife: int | None
    filterChange: bool


class AirPurifierPropertyChangeData(TypedDict):
    """Property change payload emitted on AirPurifierControlLike.onPropertyChanged."""

    property: str
    """Name of the changed property, an AirPurifierProperty value."""
    value: AirPurifierState | bool | int | str | None
    """New value of the property."""


TStorage = TypeVar("TStorage", bound=Mapping[str, Any], default=dict[str, Any])


@runtime_checkable
class AirPurifierControlLike(SensorLike, Protocol):
    """Read-only proxy interface for an air purifier."""

    @property
    def type(self) -> SensorType:
        return SensorType.AirPurifier

    @property
    def onPropertyChanged(self) -> Observable[AirPurifierPropertyChangeData]: ...

    @property
    def onCapabilitiesChanged(self) -> Observable[list[AirPurifierCapability]]: ...

    @overload
    def getValue(self, property: Literal[AirPurifierProperty.On]) -> bool | None: ...
    @overload
    def getValue(self, property: Literal[AirPurifierProperty.State]) -> AirPurifierState | None: ...
    @overload
    def getValue(self, property: Literal[AirPurifierProperty.Speed]) -> int | None: ...
    @overload
    def getValue(self, property: Literal[AirPurifierProperty.Auto]) -> bool | None: ...
    @overload
    def getValue(self, property: Literal[AirPurifierProperty.Preset]) -> str | None: ...
    @overload
    def getValue(self, property: Literal[AirPurifierProperty.ChildLock]) -> bool | None: ...
    @overload
    def getValue(self, property: Literal[AirPurifierProperty.FilterLife]) -> int | None: ...
    @overload
    def getValue(self, property: Literal[AirPurifierProperty.FilterChange]) -> bool | None: ...
    @overload
    def getValue(self, property: str) -> object | None: ...


class AirPurifierControl(
    Sensor[AirPurifierControlProperties, TStorage, AirPurifierCapability], Generic[TStorage]
):
    """An air purifier. Override ``setOn()``, ``setOff()``, ``setSpeed()``,
    ``setAuto()``, ``setPreset()`` and ``setChildLock()`` to drive hardware and
    call the ``super()`` method after success to sync the SDK state. Report
    what the purifier does and how its filter is with ``setState()``,
    ``setFilterLife()`` and ``setFilterChange()``.

    Each optional part comes with its ``AirPurifierCapability``. The presets it
    offers come as choices:
    ``setPropertySpec(AirPurifierProperty.Preset, {"choices": [...]})``.

    When the device refuses a command, raise from the override instead of calling
    ``super()``: the write fails for whoever sent it and the state stays as it was.
    """

    _requires_frames = False

    def __init__(
        self,
        name: str = "Air Purifier",
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
        self._write_state(
            {
                AirPurifierProperty.On.value: False,
                AirPurifierProperty.Speed.value: 100,
                AirPurifierProperty.Auto.value: False,
                AirPurifierProperty.ChildLock.value: False,
                AirPurifierProperty.FilterChange.value: False,
            }
        )

    @property
    def type(self) -> SensorType:
        return SensorType.AirPurifier

    @property
    def category(self) -> SensorCategory:
        return SensorCategory.Control

    @property
    def on(self) -> bool:
        """``True`` while the purifier is on."""
        return bool(self.props.on)

    @property
    def state(self) -> AirPurifierState | None:
        """What the purifier does right now."""
        value = self.props.state
        return AirPurifierState(value) if value is not None else None

    @property
    def speed(self) -> int:
        """Speed in percent."""
        return int(self.props.speed or 0)

    @property
    def auto(self) -> bool:
        """``True`` while the purifier runs in its automatic mode."""
        return bool(self.props.auto)

    @property
    def preset(self) -> str | None:
        """Active preset."""
        return self.props.preset  # type: ignore[no-any-return]

    @property
    def childLock(self) -> bool:
        """``True`` while the buttons on the purifier are locked."""
        return bool(self.props.childLock)

    @property
    def filterLife(self) -> int | None:
        """Filter life left in percent."""
        return self.props.filterLife  # type: ignore[no-any-return]

    @property
    def filterChange(self) -> bool:
        """``True`` when the filter needs a change."""
        return bool(self.props.filterChange)

    async def setOn(self) -> None:
        """Turn the purifier on. Override to drive hardware and call
        ``await super().setOn()`` after success to sync the SDK state.

        Example:
            ```python
            await purifier.setOn()
            ```
        """
        self._write_state({AirPurifierProperty.On.value: True})

    async def setOff(self) -> None:
        """Turn the purifier off. Override to drive hardware and call
        ``await super().setOff()`` after success to sync the SDK state.

        Example:
            ```python
            await purifier.setOff()
            ```
        """
        self._write_state({AirPurifierProperty.On.value: False})

    async def setSpeed(self, speed: float) -> None:
        """Set the speed. Override to drive hardware and call
        ``await super().setSpeed(speed)`` after success to sync the SDK state.

        Args:
            speed: 0 to 100 percent.

        Example:
            ```python
            await purifier.setSpeed(60)
            ```
        """
        self._write_state({AirPurifierProperty.Speed.value: round_percent(speed)})

    async def setAuto(self, auto: bool) -> None:
        """Switch the automatic mode on or off. Override to drive hardware and
        call ``await super().setAuto(auto)`` after success to sync the SDK state.

        Args:
            auto: ``True`` for the automatic mode, ``False`` for a set speed.

        Example:
            ```python
            await purifier.setAuto(True)
            ```
        """
        self._write_state({AirPurifierProperty.Auto.value: auto})

    async def setPreset(self, value: str) -> None:
        """Set the preset. Override to drive hardware and call
        ``await super().setPreset(value)`` after success to sync the SDK state.

        Args:
            value: One of the preset choices.

        Example:
            ```python
            await purifier.setPreset("sleep")
            ```
        """
        self._write_state({AirPurifierProperty.Preset.value: value})

    async def setChildLock(self, locked: bool) -> None:
        """Lock or unlock the buttons on the purifier. Override to drive hardware
        and call ``await super().setChildLock(locked)`` after success to sync
        the SDK state.

        Args:
            locked: ``True`` locks the buttons.

        Example:
            ```python
            await purifier.setChildLock(True)
            ```
        """
        self._write_state({AirPurifierProperty.ChildLock.value: locked})

    def setState(self, value: AirPurifierState) -> None:
        """Report what the purifier does right now.

        Args:
            value: Inactive, idle or purifying.

        Example:
            ```python
            purifier.setState(AirPurifierState.Idle)
            ```
        """
        self._write_state({AirPurifierProperty.State.value: AirPurifierState(value).value})

    def setFilterLife(self, percent: float) -> None:
        """Report how much filter life is left.

        Args:
            percent: 0 to 100 percent.

        Example:
            ```python
            purifier.setFilterLife(35)
            ```
        """
        if not math.isfinite(percent):
            return
        self._write_state({AirPurifierProperty.FilterLife.value: round_percent(percent)})

    def setFilterChange(self, change: bool) -> None:
        """Report whether the filter needs a change.

        Args:
            change: ``True`` when the filter needs a change.

        Example:
            ```python
            purifier.setFilterChange(True)
            ```
        """
        self._write_state({AirPurifierProperty.FilterChange.value: change})

    async def _apply_value(self, property: str, value: Any) -> None:
        """Routes generic property writes to the semantic setters."""
        if property == AirPurifierProperty.On.value:
            if value:
                await self.setOn()
            else:
                await self.setOff()
        elif property == AirPurifierProperty.Speed.value:
            await self.setSpeed(float(value))
        elif property == AirPurifierProperty.Auto.value:
            await self.setAuto(bool(value))
        elif property == AirPurifierProperty.Preset.value:
            await self.setPreset(str(value))
        elif property == AirPurifierProperty.ChildLock.value:
            await self.setChildLock(bool(value))
