from __future__ import annotations

from collections.abc import Mapping
from enum import IntEnum, StrEnum
from typing import Any, Generic, Literal, Protocol, overload, runtime_checkable

from typing_extensions import TypedDict, TypeVar

from ..observable import Observable
from .base import Sensor, SensorCategory, SensorLike, SensorType


class LockState(IntEnum):
    """Lock states."""

    Secured = 0
    """Locked."""
    Unsecured = 1
    """Unlocked."""
    Unknown = 2
    """State cannot be determined, e.g. while a motorized lock is moving."""


class LockProperty(StrEnum):
    """Property names of a lock control."""

    CurrentState = "currentState"
    """The actual current state of the lock."""
    TargetState = "targetState"
    """The desired target state (set by user, transitions to currentState)."""


class LockControlProperties(TypedDict):
    """Property values of a lock control."""

    currentState: int
    targetState: int


class LockPropertyChangeData(TypedDict):
    """Property change payload emitted on LockControlLike.onPropertyChanged."""

    property: str
    """Name of the changed property, a LockProperty value."""
    value: LockState
    """New value of the property."""


TStorage = TypeVar("TStorage", bound=Mapping[str, Any], default=dict[str, Any])


@runtime_checkable
class LockControlLike(SensorLike, Protocol):
    """Read-only proxy interface for a lock control."""

    @property
    def type(self) -> SensorType:
        return SensorType.Lock

    @property
    def onPropertyChanged(self) -> Observable[LockPropertyChangeData]: ...

    @overload
    def getValue(self, property: Literal[LockProperty.CurrentState]) -> LockState | None: ...
    @overload
    def getValue(self, property: Literal[LockProperty.TargetState]) -> LockState | None: ...
    @overload
    def getValue(self, property: str) -> object | None: ...


class LockControl(Sensor[LockControlProperties, TStorage, str], Generic[TStorage]):
    """Lock control.

    Override `setTargetState()` to drive hardware and call
    `await super().setTargetState(value)` once the hardware confirms. The base
    implementation updates both `targetState` and `currentState` to the new value.

    For asymmetric flows (long-running unlock with intermediate state) override
    `setTargetState` and write `currentState` separately when transitions complete.
    """

    _requires_frames = False

    def __init__(self, name: str = "Lock", *, native_id: str | None = None) -> None:
        super().__init__(name, native_id=native_id)
        self._write_state(
            {
                LockProperty.CurrentState.value: int(LockState.Secured),
                LockProperty.TargetState.value: int(LockState.Secured),
            }
        )

    @property
    def type(self) -> SensorType:
        return SensorType.Lock

    @property
    def category(self) -> SensorCategory:
        return SensorCategory.Control

    @property
    def currentState(self) -> LockState:
        value = self.props.currentState
        return LockState(value) if value is not None else LockState.Secured

    @property
    def targetState(self) -> LockState:
        value = self.props.targetState
        return LockState(value) if value is not None else LockState.Secured

    async def setTargetState(self, value: LockState) -> None:
        """Set the target state. Override to drive hardware and call
        `await super().setTargetState(value)` after success. The base implementation
        syncs both `targetState` and `currentState` to the new value.

        Args:
            value: Desired lock state from the ``LockState`` enum.

        Example:
            ```python
            from camera_ui_sdk import LockState

            await lock.setTargetState(LockState.Secured)
            ```
        """
        self._write_state(
            {
                LockProperty.TargetState.value: int(value),
                LockProperty.CurrentState.value: int(value),
            }
        )

    def setCurrentState(self, value: LockState) -> None:
        """Publish the actual lock state. Use it when the physical state diverges
        from the requested target: motorized locks that take time to rotate
        (publish ``Unknown`` while moving), or hardware reporting an out-of-band
        state change. Read-only from cross-process consumers (``updateValue``
        ignores it).

        Args:
            value: Current physical lock state from the ``LockState`` enum.

        Example:
            ```python
            from camera_ui_sdk import LockState

            lock.setCurrentState(LockState.Unknown)
            ```
        """
        self._write_state({LockProperty.CurrentState.value: int(value)})

    async def updateValue(self, property: str, value: Any) -> None:
        """Routes generic property writes to the semantic setters.

        Only targetState is externally writable, currentState is observed-only.
        """
        if property == LockProperty.TargetState.value:
            await self.setTargetState(LockState(value))
