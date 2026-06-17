from __future__ import annotations

from collections.abc import Mapping
from enum import Enum, IntEnum
from typing import Any, Generic, Literal, Protocol, overload, runtime_checkable

from typing_extensions import TypedDict, TypeVar

from ..observable import Observable
from .base import Sensor, SensorCategory, SensorLike, SensorType


class GarageState(IntEnum):
    """Garage door states (HomeKit-compatible values)."""

    Open = 0
    Closed = 1
    Opening = 2
    Closing = 3
    Stopped = 4


class GarageProperty(str, Enum):
    """Properties for garage controls."""

    CurrentState = "currentState"
    TargetState = "targetState"
    ObstructionDetected = "obstructionDetected"


class GarageControlProperties(TypedDict):
    """Property value map for garage controls."""

    currentState: int
    targetState: int
    obstructionDetected: bool


class GaragePropertyChangeData(TypedDict):
    """Emitted on GarageControlLike.onPropertyChanged."""

    property: str  # GarageProperty value
    value: GarageState | bool


TStorage = TypeVar("TStorage", bound=Mapping[str, Any], default=dict[str, Any])


@runtime_checkable
class GarageControlLike(SensorLike, Protocol):
    """Read-only proxy interface for a garage control."""

    @property
    def type(self) -> SensorType:
        return SensorType.Garage

    @overload
    def getValue(self, property: Literal[GarageProperty.CurrentState]) -> GarageState | None: ...
    @overload
    def getValue(self, property: Literal[GarageProperty.TargetState]) -> GarageState | None: ...
    @overload
    def getValue(self, property: Literal[GarageProperty.ObstructionDetected]) -> bool | None: ...
    @overload
    def getValue(self, property: str) -> object | None: ...

    @property
    def onPropertyChanged(self) -> Observable[GaragePropertyChangeData]: ...


class GarageControl(Sensor[GarageControlProperties, TStorage, str], Generic[TStorage]):
    """Garage door control.

    Override `setTargetState()` to drive hardware and call
    `await super().setTargetState(value)` once the hardware confirms — the base
    implementation updates both `targetState` and `currentState`.

    For long-running transitions (Opening/Closing intermediate states) override
    `setTargetState` and write `currentState` separately as the door moves.
    """

    _requires_frames = False

    def __init__(self, name: str = "Garage") -> None:
        super().__init__(name)
        self._write_state(
            {
                GarageProperty.CurrentState.value: int(GarageState.Closed),
                GarageProperty.TargetState.value: int(GarageState.Closed),
                GarageProperty.ObstructionDetected.value: False,
            }
        )

    @property
    def type(self) -> SensorType:
        return SensorType.Garage

    @property
    def category(self) -> SensorCategory:
        return SensorCategory.Control

    @property
    def currentState(self) -> GarageState:
        value = self.props.currentState
        return GarageState(value) if value is not None else GarageState.Closed

    @property
    def targetState(self) -> GarageState:
        value = self.props.targetState
        return GarageState(value) if value is not None else GarageState.Closed

    @property
    def obstructionDetected(self) -> bool:
        return bool(self.props.obstructionDetected)

    async def setTargetState(self, value: GarageState) -> None:
        """Set the target state. Override to drive hardware and call
        `await super().setTargetState(value)` after success — the base implementation
        syncs both `targetState` and `currentState` to the new value.

        Args:
            value: Desired target state from the ``GarageState`` enum.

        Example:
            ```python
            from camera_ui_sdk import GarageState

            await garage.setTargetState(GarageState.Open)
            ```
        """
        self._write_state(
            {
                GarageProperty.TargetState.value: int(value),
                GarageProperty.CurrentState.value: int(value),
            }
        )

    def setCurrentState(self, value: GarageState) -> None:
        """Publish the actual door state. Use this to drive long-running
        transitions (e.g. Open → Closing → Closed) independently of the
        user-requested target state. Read-only from cross-process consumers
        (``updateValue`` ignores it).

        Args:
            value: Current physical door state from the ``GarageState`` enum.

        Example:
            ```python
            from camera_ui_sdk import GarageState

            garage.setCurrentState(GarageState.Closing)
            ```
        """
        self._write_state({GarageProperty.CurrentState.value: int(value)})

    def setObstructionDetected(self, value: bool) -> None:
        """Publish the obstruction-detected state. Read-only from the consumer
        side (``updateValue`` ignores it) — plugin code calls this when its
        hardware reports an obstruction sensor change.

        Args:
            value: True when an obstruction is currently detected.

        Example:
            ```python
            garage.setObstructionDetected(True)
            ```
        """
        self._write_state({GarageProperty.ObstructionDetected.value: value})

    async def updateValue(self, property: str, value: Any) -> None:
        """Routes generic property writes to semantic methods."""
        if property == GarageProperty.TargetState.value:
            await self.setTargetState(GarageState(value))
        # Unknown / non-writable property (incl. currentState, obstructionDetected) — ignored.
