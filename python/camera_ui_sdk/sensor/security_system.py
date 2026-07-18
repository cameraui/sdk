from __future__ import annotations

from collections.abc import Mapping
from enum import IntEnum, StrEnum
from typing import Any, Generic, Literal, Protocol, overload, runtime_checkable

from typing_extensions import TypedDict, TypeVar

from ..observable import Observable
from .base import Sensor, SensorCategory, SensorLike, SensorType


class SecuritySystemState(IntEnum):
    """Security system arm/disarm states (HomeKit-compatible values)."""

    StayArm = 0
    """Armed, occupants home."""
    AwayArm = 1
    """Armed, occupants away."""
    NightArm = 2
    """Armed for night mode."""
    Disarmed = 3
    """System disarmed."""
    AlarmTriggered = 4
    """Alarm is triggered."""


class SecuritySystemProperty(StrEnum):
    """Properties for security system controls."""

    CurrentState = "currentState"
    """The actual current state of the security system."""
    TargetState = "targetState"
    """The desired target state (set by user, transitions to currentState)."""


class SecuritySystemProperties(TypedDict):
    """Property value map for security system controls."""

    currentState: int
    targetState: int


class SecuritySystemPropertyChangeData(TypedDict):
    """Emitted on SecuritySystemLike.onPropertyChanged."""

    property: str  # SecuritySystemProperty value
    value: SecuritySystemState


TStorage = TypeVar("TStorage", bound=Mapping[str, Any], default=dict[str, Any])


@runtime_checkable
class SecuritySystemLike(SensorLike, Protocol):
    """Read-only proxy interface for a security system control."""

    @property
    def type(self) -> SensorType:
        return SensorType.SecuritySystem

    @overload
    def getValue(
        self, property: Literal[SecuritySystemProperty.CurrentState]
    ) -> SecuritySystemState | None: ...
    @overload
    def getValue(
        self, property: Literal[SecuritySystemProperty.TargetState]
    ) -> SecuritySystemState | None: ...
    @overload
    def getValue(self, property: str) -> object | None: ...

    @property
    def onPropertyChanged(self) -> Observable[SecuritySystemPropertyChangeData]: ...


class SecuritySystem(Sensor[SecuritySystemProperties, TStorage, str], Generic[TStorage]):
    """Security system control.

    Override `setTargetState()` to drive hardware and call
    `await super().setTargetState(value)` once the hardware confirms — the base
    implementation updates both `targetState` and `currentState`.
    """

    _requires_frames = False

    def __init__(self, name: str = "Security System") -> None:
        super().__init__(name)
        self._write_state(
            {
                SecuritySystemProperty.CurrentState.value: int(SecuritySystemState.Disarmed),
                SecuritySystemProperty.TargetState.value: int(SecuritySystemState.Disarmed),
            }
        )

    @property
    def type(self) -> SensorType:
        return SensorType.SecuritySystem

    @property
    def category(self) -> SensorCategory:
        return SensorCategory.Control

    @property
    def currentState(self) -> SecuritySystemState:
        value = self.props.currentState
        return SecuritySystemState(value) if value is not None else SecuritySystemState.Disarmed

    @property
    def targetState(self) -> SecuritySystemState:
        value = self.props.targetState
        return SecuritySystemState(value) if value is not None else SecuritySystemState.Disarmed

    async def setTargetState(self, value: SecuritySystemState) -> None:
        """Set the target state. Override to drive hardware and call
        `await super().setTargetState(value)` after success — the base implementation
        syncs both `targetState` and `currentState` to the new value.

        Args:
            value: Desired armed/disarmed state from ``SecuritySystemState``.

        Example:
            ```python
            from camera_ui_sdk import SecuritySystemState

            await alarm.setTargetState(SecuritySystemState.AwayArm)
            ```
        """
        self._write_state(
            {
                SecuritySystemProperty.TargetState.value: int(value),
                SecuritySystemProperty.CurrentState.value: int(value),
            }
        )

    def setCurrentState(self, value: SecuritySystemState) -> None:
        """Publish the actual security system state. Use this to drive
        transitions that diverge from the user-requested target — most notably
        the ``AlarmTriggered`` state when an intruder is detected, or
        arming-delay intermediate states. Read-only from cross-process
        consumers (``updateValue`` ignores it).

        Args:
            value: Current security system state from ``SecuritySystemState``.

        Example:
            ```python
            from camera_ui_sdk import SecuritySystemState

            alarm.setCurrentState(SecuritySystemState.AlarmTriggered)
            ```
        """
        self._write_state({SecuritySystemProperty.CurrentState.value: int(value)})

    async def updateValue(self, property: str, value: Any) -> None:
        """Routes generic property writes to semantic methods."""
        if property == SecuritySystemProperty.TargetState.value:
            await self.setTargetState(SecuritySystemState(value))
        # Unknown / non-writable property (incl. currentState) — ignored.
