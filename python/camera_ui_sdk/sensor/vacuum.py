from __future__ import annotations

from collections.abc import Mapping
from enum import StrEnum
from typing import Any, Generic, Literal, Protocol, overload, runtime_checkable

from typing_extensions import TypedDict, TypeVar

from ..observable import Observable
from .base import SensorLike, SensorType
from .device import DeviceInfo
from .property_spec import PropertySpecOverride
from .robot import RobotControl


class VacuumActivity(StrEnum):
    """What a vacuum does right now."""

    Cleaning = "cleaning"
    Docked = "docked"
    Idle = "idle"
    Paused = "paused"
    Returning = "returning"
    Error = "error"


class VacuumCommand(StrEnum):
    """Commands a vacuum takes."""

    Start = "start"
    Pause = "pause"
    Stop = "stop"
    Dock = "dock"
    Locate = "locate"
    Spot = "spot"


class VacuumCapability(StrEnum):
    """Optional capabilities of a vacuum."""

    FanSpeed = "fanSpeed"
    """Vacuum cleans with a choice of suction levels."""


class VacuumProperty(StrEnum):
    """Property names of a vacuum."""

    Activity = "activity"
    """What the vacuum does right now, a ``VacuumActivity``."""
    Command = "command"
    """One-off ``VacuumCommand`` when written, empty again right after."""
    FanSpeed = "fanSpeed"
    """Suction level, one of the choices the plugin sets."""


class VacuumControlProperties(TypedDict):
    """Property values of a vacuum."""

    activity: str | None
    command: str
    fanSpeed: str | None


class VacuumPropertyChangeData(TypedDict):
    """Property change payload emitted on VacuumControlLike.onPropertyChanged."""

    property: str
    """Name of the changed property, a VacuumProperty value."""
    value: VacuumActivity | VacuumCommand | str | None
    """New value of the property."""


TStorage = TypeVar("TStorage", bound=Mapping[str, Any], default=dict[str, Any])


@runtime_checkable
class VacuumControlLike(SensorLike, Protocol):
    """Read-only proxy interface for a vacuum."""

    @property
    def type(self) -> SensorType:
        return SensorType.Vacuum

    @property
    def onPropertyChanged(self) -> Observable[VacuumPropertyChangeData]: ...

    @property
    def onCapabilitiesChanged(self) -> Observable[list[VacuumCapability]]: ...

    @overload
    def getValue(self, property: Literal[VacuumProperty.Activity]) -> VacuumActivity | None: ...
    @overload
    def getValue(self, property: Literal[VacuumProperty.Command]) -> VacuumCommand | str | None: ...
    @overload
    def getValue(self, property: Literal[VacuumProperty.FanSpeed]) -> str | None: ...
    @overload
    def getValue(self, property: str) -> object | None: ...


class VacuumControl(RobotControl[VacuumControlProperties, TStorage, VacuumCapability], Generic[TStorage]):
    """A robot vacuum. Override ``start()``, ``pause()``, ``stop()``, ``dock()``,
    ``locate()``, ``spot()`` and ``setFanSpeed()`` to drive hardware and call
    the ``super()`` method after success. Report what the vacuum does with
    ``setActivity()``.

    Narrow the commands to those the vacuum takes with
    ``setPropertySpec(VacuumProperty.Command, {"values": [...]})``. The suction
    levels come as choices with the ``fanSpeed`` capability:
    ``setPropertySpec(VacuumProperty.FanSpeed, {"choices": [...]})``.
    """

    def __init__(
        self,
        name: str = "Vacuum",
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

    @property
    def type(self) -> SensorType:
        return SensorType.Vacuum

    @property
    def fanSpeed(self) -> str | None:
        """Suction level."""
        return self.props.fanSpeed

    async def start(self) -> None:
        """Start or resume cleaning. Override to drive hardware and call
        ``await super().start()`` after success.

        Example:
            ```python
            await vacuum.start()
            ```
        """
        self._sent(VacuumCommand.Start.value)

    async def pause(self) -> None:
        """Pause cleaning where the vacuum is. Override to drive hardware and call
        ``await super().pause()`` after success.

        Example:
            ```python
            await vacuum.pause()
            ```
        """
        self._sent(VacuumCommand.Pause.value)

    async def stop(self) -> None:
        """Stop cleaning. Override to drive hardware and call ``await super().stop()``
        after success.

        Example:
            ```python
            await vacuum.stop()
            ```
        """
        self._sent(VacuumCommand.Stop.value)

    async def dock(self) -> None:
        """Send the vacuum back to its dock. Override to drive hardware and call
        ``await super().dock()`` after success.

        Example:
            ```python
            await vacuum.dock()
            ```
        """
        self._sent(VacuumCommand.Dock.value)

    async def locate(self) -> None:
        """Make the vacuum beep so it can be found. Override to drive hardware and
        call ``await super().locate()`` after success.

        Example:
            ```python
            await vacuum.locate()
            ```
        """
        self._sent(VacuumCommand.Locate.value)

    async def spot(self) -> None:
        """Clean the spot around the vacuum. Override to drive hardware and call
        ``await super().spot()`` after success.

        Example:
            ```python
            await vacuum.spot()
            ```
        """
        self._sent(VacuumCommand.Spot.value)

    async def setFanSpeed(self, value: str) -> None:
        """Set the suction level. Override to drive hardware and call
        ``await super().setFanSpeed(value)`` after success to sync the SDK state.

        Args:
            value: One of the suction level choices.

        Example:
            ```python
            await vacuum.setFanSpeed("turbo")
            ```
        """
        self._write_state({VacuumProperty.FanSpeed.value: value})

    async def updateValue(self, property: str, value: Any) -> None:
        """Routes generic property writes to the semantic setters."""
        if property == VacuumProperty.FanSpeed.value:
            await self.setFanSpeed(str(value))
            return
        if property != VacuumProperty.Command.value:
            return
        if value == VacuumCommand.Start:
            await self.start()
        elif value == VacuumCommand.Pause:
            await self.pause()
        elif value == VacuumCommand.Stop:
            await self.stop()
        elif value == VacuumCommand.Dock:
            await self.dock()
        elif value == VacuumCommand.Locate:
            await self.locate()
        elif value == VacuumCommand.Spot:
            await self.spot()
