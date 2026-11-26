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


class LawnMowerActivity(StrEnum):
    """What a lawn mower does right now."""

    Mowing = "mowing"
    Docked = "docked"
    Paused = "paused"
    Returning = "returning"
    Error = "error"


class LawnMowerCommand(StrEnum):
    """Commands a lawn mower takes."""

    Start = "start"
    Pause = "pause"
    Dock = "dock"


class LawnMowerProperty(StrEnum):
    """Property names of a lawn mower."""

    Activity = "activity"
    """What the mower does right now, a ``LawnMowerActivity``."""
    Command = "command"
    """One-off ``LawnMowerCommand`` when written, empty again right after."""


class LawnMowerControlProperties(TypedDict):
    """Property values of a lawn mower."""

    activity: str | None
    command: str


class LawnMowerPropertyChangeData(TypedDict):
    """Property change payload emitted on LawnMowerControlLike.onPropertyChanged."""

    property: str
    """Name of the changed property, a LawnMowerProperty value."""
    value: LawnMowerActivity | LawnMowerCommand | str | None
    """New value of the property."""


TStorage = TypeVar("TStorage", bound=Mapping[str, Any], default=dict[str, Any])


@runtime_checkable
class LawnMowerControlLike(SensorLike, Protocol):
    """Read-only proxy interface for a lawn mower."""

    @property
    def type(self) -> SensorType:
        return SensorType.LawnMower

    @property
    def onPropertyChanged(self) -> Observable[LawnMowerPropertyChangeData]: ...

    @overload
    def getValue(self, property: Literal[LawnMowerProperty.Activity]) -> LawnMowerActivity | None: ...
    @overload
    def getValue(self, property: Literal[LawnMowerProperty.Command]) -> LawnMowerCommand | str | None: ...
    @overload
    def getValue(self, property: str) -> object | None: ...


class LawnMowerControl(RobotControl[LawnMowerControlProperties, TStorage, str], Generic[TStorage]):
    """A robot lawn mower. Override ``start()``, ``pause()`` and ``dock()`` to drive
    hardware and call the ``super()`` method after success. Report what the
    mower does with ``setActivity()``.

    Narrow the commands to those the mower takes with
    ``setPropertySpec(LawnMowerProperty.Command, {"values": [...]})``.

    When the device refuses a command, raise from the override instead of calling
    ``super()``: the write fails for whoever sent it and the state stays as it was.
    """

    def __init__(
        self,
        name: str = "Lawn Mower",
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
        return SensorType.LawnMower

    async def start(self) -> None:
        """Start or resume mowing. Override to drive hardware and call
        ``await super().start()`` after success.

        Example:
            ```python
            await mower.start()
            ```
        """
        self._sent(LawnMowerCommand.Start.value)

    async def pause(self) -> None:
        """Pause mowing where the mower is. Override to drive hardware and call
        ``await super().pause()`` after success.

        Example:
            ```python
            await mower.pause()
            ```
        """
        self._sent(LawnMowerCommand.Pause.value)

    async def dock(self) -> None:
        """Stop mowing and send the mower back to its dock. Override to drive
        hardware and call ``await super().dock()`` after success.

        Example:
            ```python
            await mower.dock()
            ```
        """
        self._sent(LawnMowerCommand.Dock.value)

    def _is_command(self, property: str) -> bool:
        return property == LawnMowerProperty.Command.value

    async def _apply_value(self, property: str, value: Any) -> None:
        """Routes generic property writes to the semantic setters."""
        if property != LawnMowerProperty.Command.value:
            return
        if value == LawnMowerCommand.Start:
            await self.start()
        elif value == LawnMowerCommand.Pause:
            await self.pause()
        elif value == LawnMowerCommand.Dock:
            await self.dock()
