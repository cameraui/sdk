from __future__ import annotations

from collections.abc import Mapping
from enum import IntEnum, StrEnum
from typing import Any, Generic, Literal, Protocol, overload, runtime_checkable

from typing_extensions import TypedDict, TypeVar

from ..internal.shared_utils import round_percent
from ..observable import Observable
from .base import Sensor, SensorCategory, SensorLike, SensorType
from .device import DeviceInfo
from .property_spec import PropertySpecOverride


class CoverState(IntEnum):
    """State of a cover. A target takes ``Open`` and ``Closed``."""

    Open = 0
    Closed = 1
    Opening = 2
    Closing = 3
    Stopped = 4


class CoverKind(StrEnum):
    """What a cover is, it decides how smart homes show it."""

    Awning = "awning"
    Blind = "blind"
    Curtain = "curtain"
    Damper = "damper"
    Door = "door"
    Shade = "shade"
    Shutter = "shutter"
    Window = "window"


class CoverCapability(StrEnum):
    """Optional capabilities of a cover."""

    Position = "position"
    """Cover moves to a position between closed and open."""
    Tilt = "tilt"
    """Cover tilts its slats."""
    Stop = "stop"
    """Cover stops while it moves."""


class CoverProperty(StrEnum):
    """Property names of a cover."""

    CurrentState = "currentState"
    """Current state, a ``CoverState``."""
    TargetState = "targetState"
    """Target state, ``Open`` or ``Closed``."""
    CurrentPosition = "currentPosition"
    """Current position, 0 (closed) to 100 (open)."""
    TargetPosition = "targetPosition"
    """Target position, 0 (closed) to 100 (open)."""
    CurrentTilt = "currentTilt"
    """Current tilt of the slats, 0 (closed) to 100 (open)."""
    TargetTilt = "targetTilt"
    """Target tilt of the slats, 0 (closed) to 100 (open)."""
    Stop = "stop"
    """Command that stops the cover, it reads ``False`` again once handled."""
    ObstructionDetected = "obstructionDetected"
    """Whether something blocks the cover."""
    Kind = "kind"
    """What the cover is, a ``CoverKind``."""


class CoverControlProperties(TypedDict):
    """Property values of a cover."""

    currentState: int
    targetState: int
    currentPosition: int
    targetPosition: int
    currentTilt: int
    targetTilt: int
    stop: bool
    obstructionDetected: bool
    kind: str | None


class CoverPropertyChangeData(TypedDict):
    """Property change payload emitted on CoverControlLike.onPropertyChanged."""

    property: str
    """Name of the changed property, a CoverProperty value."""
    value: CoverState | CoverKind | int | bool | None
    """New value of the property."""


TStorage = TypeVar("TStorage", bound=Mapping[str, Any], default=dict[str, Any])


@runtime_checkable
class CoverControlLike(SensorLike, Protocol):
    """Read-only proxy interface for a cover."""

    @property
    def type(self) -> SensorType:
        return SensorType.Cover

    @property
    def onPropertyChanged(self) -> Observable[CoverPropertyChangeData]: ...

    @property
    def onCapabilitiesChanged(self) -> Observable[list[CoverCapability]]: ...

    @overload
    def getValue(self, property: Literal[CoverProperty.CurrentState]) -> CoverState | None: ...
    @overload
    def getValue(self, property: Literal[CoverProperty.TargetState]) -> CoverState | None: ...
    @overload
    def getValue(self, property: Literal[CoverProperty.CurrentPosition]) -> int | None: ...
    @overload
    def getValue(self, property: Literal[CoverProperty.TargetPosition]) -> int | None: ...
    @overload
    def getValue(self, property: Literal[CoverProperty.CurrentTilt]) -> int | None: ...
    @overload
    def getValue(self, property: Literal[CoverProperty.TargetTilt]) -> int | None: ...
    @overload
    def getValue(self, property: Literal[CoverProperty.Stop]) -> bool | None: ...
    @overload
    def getValue(self, property: Literal[CoverProperty.ObstructionDetected]) -> bool | None: ...
    @overload
    def getValue(self, property: Literal[CoverProperty.Kind]) -> CoverKind | None: ...
    @overload
    def getValue(self, property: str) -> object | None: ...


class CoverControl(Sensor[CoverControlProperties, TStorage, CoverCapability], Generic[TStorage]):
    """A blind, shutter, awning, curtain or other cover. Override
    ``setTargetState()``, ``setTargetPosition()`` and ``setTargetTilt()`` to
    drive hardware and call the ``super()`` method after success to sync the
    SDK state. Report what the hardware does with ``setCurrentState()``,
    ``setCurrentPosition()`` and ``setCurrentTilt()``.

    A cover that moves to positions adds ``CoverCapability.Position``, one with
    slats ``CoverCapability.Tilt``, one that stops on command
    ``CoverCapability.Stop`` and overrides ``stop()``. ``setKind()`` says what
    the cover is.

    When the device refuses a command, raise from the override instead of calling
    ``super()``: the write fails for whoever sent it and the state stays as it was.
    """

    _requires_frames = False

    def __init__(
        self,
        name: str = "Cover",
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
                CoverProperty.CurrentState.value: int(CoverState.Closed),
                CoverProperty.TargetState.value: int(CoverState.Closed),
                CoverProperty.CurrentPosition.value: 0,
                CoverProperty.TargetPosition.value: 0,
                CoverProperty.CurrentTilt.value: 0,
                CoverProperty.TargetTilt.value: 0,
                CoverProperty.Stop.value: False,
                CoverProperty.ObstructionDetected.value: False,
            }
        )

    @property
    def type(self) -> SensorType:
        return SensorType.Cover

    @property
    def category(self) -> SensorCategory:
        return SensorCategory.Control

    @property
    def currentState(self) -> CoverState:
        """Current state."""
        value = self.props.currentState
        return CoverState(value) if value is not None else CoverState.Closed

    @property
    def targetState(self) -> CoverState:
        """Target state."""
        value = self.props.targetState
        return CoverState(value) if value is not None else CoverState.Closed

    @property
    def currentPosition(self) -> int:
        """Current position, 0 (closed) to 100 (open)."""
        return int(self.props.currentPosition or 0)

    @property
    def targetPosition(self) -> int:
        """Target position, 0 (closed) to 100 (open)."""
        return int(self.props.targetPosition or 0)

    @property
    def currentTilt(self) -> int:
        """Current tilt of the slats, 0 (closed) to 100 (open)."""
        return int(self.props.currentTilt or 0)

    @property
    def targetTilt(self) -> int:
        """Target tilt of the slats, 0 (closed) to 100 (open)."""
        return int(self.props.targetTilt or 0)

    @property
    def obstructionDetected(self) -> bool:
        """Whether something blocks the cover."""
        return bool(self.props.obstructionDetected)

    @property
    def kind(self) -> CoverKind | None:
        """What the cover is."""
        value = self.props.kind
        return CoverKind(value) if value is not None else None

    async def setTargetState(self, value: CoverState) -> None:
        """Open or close the cover. Override to drive hardware and call
        ``await super().setTargetState(value)`` after success to sync the SDK state.

        Args:
            value: ``CoverState.Open`` or ``CoverState.Closed``.

        Example:
            ```python
            await cover.setTargetState(CoverState.Open)
            ```
        """
        self._write_state(
            {
                CoverProperty.TargetState.value: int(value),
                CoverProperty.CurrentState.value: int(value),
            }
        )

    async def stop(self) -> None:
        """Stop the cover. Override to drive hardware and call
        ``await super().stop()`` after success, which reports the cover as
        stopped. The ``stop`` property is a command and stays ``False``.

        Example:
            ```python
            await cover.stop()
            ```
        """
        self._write_state({CoverProperty.CurrentState.value: int(CoverState.Stopped)})

    def setCurrentState(self, value: CoverState) -> None:
        """Report the state of the cover.

        Example:
            ```python
            cover.setCurrentState(CoverState.Opening)
            ```
        """
        self._write_state({CoverProperty.CurrentState.value: int(value)})

    async def setTargetPosition(self, position: float) -> None:
        """Move the cover to a position. Override to drive hardware and call
        ``await super().setTargetPosition(position)`` after success to sync the SDK state.

        Args:
            position: 0 (closed) to 100 (open).

        Example:
            ```python
            await cover.setTargetPosition(50)
            ```
        """
        value = round_percent(position)
        self._write_state(
            {CoverProperty.TargetPosition.value: value, CoverProperty.CurrentPosition.value: value}
        )

    def setCurrentPosition(self, position: float) -> None:
        """Report the position of the cover.

        Args:
            position: 0 (closed) to 100 (open).

        Example:
            ```python
            cover.setCurrentPosition(30)
            ```
        """
        self._write_state({CoverProperty.CurrentPosition.value: round_percent(position)})

    async def setTargetTilt(self, tilt: float) -> None:
        """Tilt the slats. Override to drive hardware and call
        ``await super().setTargetTilt(tilt)`` after success to sync the SDK state.

        Args:
            tilt: 0 (closed) to 100 (open).

        Example:
            ```python
            await cover.setTargetTilt(100)
            ```
        """
        value = round_percent(tilt)
        self._write_state({CoverProperty.TargetTilt.value: value, CoverProperty.CurrentTilt.value: value})

    def setCurrentTilt(self, tilt: float) -> None:
        """Report the tilt of the slats.

        Args:
            tilt: 0 (closed) to 100 (open).

        Example:
            ```python
            cover.setCurrentTilt(40)
            ```
        """
        self._write_state({CoverProperty.CurrentTilt.value: round_percent(tilt)})

    def setObstructionDetected(self, value: bool) -> None:
        """Report whether something blocks the cover.

        Example:
            ```python
            cover.setObstructionDetected(True)
            ```
        """
        self._write_state({CoverProperty.ObstructionDetected.value: value})

    def setKind(self, kind: CoverKind) -> None:
        """Say what the cover is. Smart homes show it by its kind, a window or
        a door for example, and Home Assistant takes it as the device class.

        Example:
            ```python
            cover.setKind(CoverKind.Shutter)
            ```
        """
        self._write_state({CoverProperty.Kind.value: kind.value})
        self.setPropertySpec(CoverProperty.Kind.value, {"values": [kind.value]})

    def _is_command(self, property: str) -> bool:
        return property == CoverProperty.Stop.value

    async def _apply_value(self, property: str, value: Any) -> None:
        """Routes generic property writes to the semantic setters."""
        if property == CoverProperty.TargetState.value:
            await self.setTargetState(CoverState(value))
        elif property == CoverProperty.TargetPosition.value:
            await self.setTargetPosition(float(value))
        elif property == CoverProperty.TargetTilt.value:
            await self.setTargetTilt(float(value))
        elif property == CoverProperty.Stop.value and value:
            await self.stop()
