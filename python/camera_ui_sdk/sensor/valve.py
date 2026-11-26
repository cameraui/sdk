from __future__ import annotations

import math
from collections.abc import Mapping
from enum import IntEnum, StrEnum
from typing import Any, Generic, Literal, Protocol, overload, runtime_checkable

from typing_extensions import TypedDict, TypeVar

from ..internal.shared_utils import round_percent
from ..observable import Observable
from .base import Sensor, SensorCategory, SensorLike, SensorType
from .device import DeviceInfo
from .property_spec import PropertySpecOverride


class ValveState(IntEnum):
    """State of a valve. A target takes ``Open`` and ``Closed``."""

    Open = 0
    Closed = 1
    Opening = 2
    Closing = 3


class ValveKind(StrEnum):
    """What a valve controls, it decides how smart homes show it."""

    Water = "water"
    Gas = "gas"
    Irrigation = "irrigation"


class ValveCapability(StrEnum):
    """Optional capabilities of a valve."""

    Position = "position"
    """Valve opens to a position between closed and open."""
    Duration = "duration"
    """Valve closes by itself after a set time."""


class ValveProperty(StrEnum):
    """Property names of a valve."""

    CurrentState = "currentState"
    """Current state, a ``ValveState``."""
    TargetState = "targetState"
    """Target state, ``Open`` or ``Closed``."""
    CurrentPosition = "currentPosition"
    """Current position, 0 (closed) to 100 (open)."""
    TargetPosition = "targetPosition"
    """Target position, 0 (closed) to 100 (open)."""
    Duration = "duration"
    """Seconds the valve stays open before it closes by itself."""
    Remaining = "remaining"
    """Seconds left until the open valve closes by itself."""
    Kind = "kind"
    """What the valve controls, a ``ValveKind``."""
    Index = "index"
    """Position of the valve on its device, from 1."""


class ValveControlProperties(TypedDict):
    """Property values of a valve."""

    currentState: int
    targetState: int
    currentPosition: int
    targetPosition: int
    duration: int
    remaining: int
    kind: str | None
    index: int


class ValvePropertyChangeData(TypedDict):
    """Property change payload emitted on ValveControlLike.onPropertyChanged."""

    property: str
    """Name of the changed property, a ValveProperty value."""
    value: ValveState | ValveKind | int | None
    """New value of the property."""


TStorage = TypeVar("TStorage", bound=Mapping[str, Any], default=dict[str, Any])


@runtime_checkable
class ValveControlLike(SensorLike, Protocol):
    """Read-only proxy interface for a valve."""

    @property
    def type(self) -> SensorType:
        return SensorType.Valve

    @property
    def onPropertyChanged(self) -> Observable[ValvePropertyChangeData]: ...

    @property
    def onCapabilitiesChanged(self) -> Observable[list[ValveCapability]]: ...

    @overload
    def getValue(self, property: Literal[ValveProperty.CurrentState]) -> ValveState | None: ...
    @overload
    def getValue(self, property: Literal[ValveProperty.TargetState]) -> ValveState | None: ...
    @overload
    def getValue(self, property: Literal[ValveProperty.CurrentPosition]) -> int | None: ...
    @overload
    def getValue(self, property: Literal[ValveProperty.TargetPosition]) -> int | None: ...
    @overload
    def getValue(self, property: Literal[ValveProperty.Duration]) -> int | None: ...
    @overload
    def getValue(self, property: Literal[ValveProperty.Remaining]) -> int | None: ...
    @overload
    def getValue(self, property: Literal[ValveProperty.Kind]) -> ValveKind | None: ...
    @overload
    def getValue(self, property: Literal[ValveProperty.Index]) -> int | None: ...
    @overload
    def getValue(self, property: str) -> object | None: ...


class ValveControl(Sensor[ValveControlProperties, TStorage, ValveCapability], Generic[TStorage]):
    """A water or gas valve, or an irrigation zone. Override
    ``setTargetState()``, ``setTargetPosition()`` and ``setDuration()`` to drive
    hardware and call the ``super()`` method after success to sync the SDK
    state. Report what the hardware does with ``setCurrentState()``,
    ``setCurrentPosition()`` and ``setRemaining()``.

    A valve that opens part way adds ``ValveCapability.Position``, one that
    closes by itself after a set time ``ValveCapability.Duration``.
    ``setKind()`` says what the valve controls, ``index`` orders the zones of
    one irrigation controller.

    When the device refuses a command, raise from the override instead of calling
    ``super()``: the write fails for whoever sent it and the state stays as it was.
    """

    _requires_frames = False

    def __init__(
        self,
        name: str = "Valve",
        *,
        index: int = 0,
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
                ValveProperty.CurrentState.value: int(ValveState.Closed),
                ValveProperty.TargetState.value: int(ValveState.Closed),
                ValveProperty.CurrentPosition.value: 0,
                ValveProperty.TargetPosition.value: 0,
                ValveProperty.Duration.value: 600,
                ValveProperty.Remaining.value: 0,
                ValveProperty.Index.value: index,
            }
        )

    @property
    def type(self) -> SensorType:
        return SensorType.Valve

    @property
    def category(self) -> SensorCategory:
        return SensorCategory.Control

    @property
    def currentState(self) -> ValveState:
        """Current state."""
        value = self.props.currentState
        return ValveState(value) if value is not None else ValveState.Closed

    @property
    def targetState(self) -> ValveState:
        """Target state."""
        value = self.props.targetState
        return ValveState(value) if value is not None else ValveState.Closed

    @property
    def currentPosition(self) -> int:
        """Current position, 0 (closed) to 100 (open)."""
        return int(self.props.currentPosition or 0)

    @property
    def targetPosition(self) -> int:
        """Target position, 0 (closed) to 100 (open)."""
        return int(self.props.targetPosition or 0)

    @property
    def duration(self) -> int:
        """Seconds the valve stays open before it closes by itself."""
        return int(self.props.duration or 0)

    @property
    def remaining(self) -> int:
        """Seconds left until the open valve closes by itself."""
        return int(self.props.remaining or 0)

    @property
    def kind(self) -> ValveKind | None:
        """What the valve controls."""
        value = self.props.kind
        return ValveKind(value) if value is not None else None

    @property
    def index(self) -> int:
        """Position of the valve on its device, 0 when not set."""
        return int(self.props.index or 0)

    async def setTargetState(self, value: ValveState) -> None:
        """Open or close the valve. Override to drive hardware and call
        ``await super().setTargetState(value)`` after success to sync the SDK state.

        Args:
            value: ``ValveState.Open`` or ``ValveState.Closed``.

        Example:
            ```python
            await valve.setTargetState(ValveState.Open)
            ```
        """
        self._write_state(
            {
                ValveProperty.TargetState.value: int(value),
                ValveProperty.CurrentState.value: int(value),
            }
        )

    def setCurrentState(self, value: ValveState) -> None:
        """Report the state of the valve.

        Args:
            value: What the valve does right now.

        Example:
            ```python
            valve.setCurrentState(ValveState.Opening)
            ```
        """
        self._write_state({ValveProperty.CurrentState.value: int(value)})

    async def setTargetPosition(self, position: float) -> None:
        """Open the valve to a position. Override to drive hardware and call
        ``await super().setTargetPosition(position)`` after success to sync the SDK state.

        Args:
            position: 0 (closed) to 100 (open).

        Example:
            ```python
            await valve.setTargetPosition(50)
            ```
        """
        value = round_percent(position)
        self._write_state(
            {ValveProperty.TargetPosition.value: value, ValveProperty.CurrentPosition.value: value}
        )

    def setCurrentPosition(self, position: float) -> None:
        """Report the position of the valve.

        Args:
            position: 0 (closed) to 100 (open).

        Example:
            ```python
            valve.setCurrentPosition(30)
            ```
        """
        self._write_state({ValveProperty.CurrentPosition.value: round_percent(position)})

    async def setDuration(self, seconds: float) -> None:
        """Set how long the valve stays open. Override to drive hardware and call
        ``await super().setDuration(seconds)`` after success to sync the SDK state.

        Args:
            seconds: Seconds until the open valve closes by itself.

        Example:
            ```python
            await valve.setDuration(900)
            ```
        """
        self._write_state({ValveProperty.Duration.value: max(0, math.floor(seconds + 0.5))})

    def setRemaining(self, seconds: float) -> None:
        """Report how long the open valve has left.

        Args:
            seconds: Seconds until it closes by itself, 0 when closed.

        Example:
            ```python
            valve.setRemaining(420)
            ```
        """
        self._write_state({ValveProperty.Remaining.value: max(0, math.floor(seconds + 0.5))})

    def setKind(self, kind: ValveKind) -> None:
        """Say what the valve controls. Smart homes show it by its kind, and Home
        Assistant takes it as the device class.

        Args:
            kind: What the valve controls.

        Example:
            ```python
            valve.setKind(ValveKind.Gas)
            ```
        """
        self._write_state({ValveProperty.Kind.value: kind.value})
        self.setPropertySpec(ValveProperty.Kind.value, {"values": [kind.value]})

    async def _apply_value(self, property: str, value: Any) -> None:
        """Routes generic property writes to the semantic setters."""
        if property == ValveProperty.TargetState.value:
            await self.setTargetState(ValveState(value))
        elif property == ValveProperty.TargetPosition.value:
            await self.setTargetPosition(float(value))
        elif property == ValveProperty.Duration.value:
            await self.setDuration(float(value))
