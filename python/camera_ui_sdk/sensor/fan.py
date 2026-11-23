from __future__ import annotations

from collections.abc import Mapping
from enum import StrEnum
from typing import Any, Generic, Literal, Protocol, overload, runtime_checkable

from typing_extensions import TypedDict, TypeVar

from ..internal.shared_utils import round_percent
from ..observable import Observable
from .base import Sensor, SensorCategory, SensorLike, SensorType
from .device import DeviceInfo
from .property_spec import PropertySpecOverride


class FanDirection(StrEnum):
    """Direction a fan turns."""

    Forward = "forward"
    Reverse = "reverse"


class FanCapability(StrEnum):
    """Optional capabilities of a fan."""

    Speed = "speed"
    """Fan runs at a speed between 0 and 100 percent."""
    Direction = "direction"
    """Fan turns forward or in reverse."""
    Oscillation = "oscillation"
    """Fan swings from side to side."""
    Preset = "preset"
    """Fan has presets, such as sleep or breeze."""


class FanProperty(StrEnum):
    """Property names of a fan."""

    On = "on"
    """Whether the fan runs."""
    Speed = "speed"
    """Speed, 0 to 100 percent."""
    Direction = "direction"
    """Direction, a ``FanDirection``."""
    Oscillating = "oscillating"
    """Whether the fan swings from side to side."""
    Preset = "preset"
    """Active preset, one of the choices the device offers."""


class FanControlProperties(TypedDict):
    """Property values of a fan."""

    on: bool
    speed: int
    direction: str
    oscillating: bool
    preset: str | None


class FanPropertyChangeData(TypedDict):
    """Property change payload emitted on FanControlLike.onPropertyChanged."""

    property: str
    """Name of the changed property, a FanProperty value."""
    value: FanDirection | int | bool | str | None
    """New value of the property."""


TStorage = TypeVar("TStorage", bound=Mapping[str, Any], default=dict[str, Any])


@runtime_checkable
class FanControlLike(SensorLike, Protocol):
    """Read-only proxy interface for a fan."""

    @property
    def type(self) -> SensorType:
        return SensorType.Fan

    @property
    def onPropertyChanged(self) -> Observable[FanPropertyChangeData]: ...

    @property
    def onCapabilitiesChanged(self) -> Observable[list[FanCapability]]: ...

    @overload
    def getValue(self, property: Literal[FanProperty.On]) -> bool | None: ...
    @overload
    def getValue(self, property: Literal[FanProperty.Speed]) -> int | None: ...
    @overload
    def getValue(self, property: Literal[FanProperty.Direction]) -> FanDirection | None: ...
    @overload
    def getValue(self, property: Literal[FanProperty.Oscillating]) -> bool | None: ...
    @overload
    def getValue(self, property: Literal[FanProperty.Preset]) -> str | None: ...
    @overload
    def getValue(self, property: str) -> object | None: ...


class FanControl(Sensor[FanControlProperties, TStorage, FanCapability], Generic[TStorage]):
    """A ceiling, desk or other fan. Override ``setOn()``, ``setOff()``,
    ``setSpeed()`` and the other commands to drive hardware and call the
    ``super()`` method after success to sync the SDK state.

    A fan with speeds adds ``FanCapability.Speed``, one that turns both ways
    ``FanCapability.Direction``, one that swings ``FanCapability.Oscillation``.
    Presets are the device's own, add ``FanCapability.Preset`` and set them as
    ``choices``. A fan with a few fixed speeds sets the speed's ``step``, three
    speeds are a step of 33.
    """

    _requires_frames = False

    def __init__(
        self,
        name: str = "Fan",
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
                FanProperty.On.value: False,
                FanProperty.Speed.value: 100,
                FanProperty.Direction.value: FanDirection.Forward.value,
                FanProperty.Oscillating.value: False,
            }
        )

    @property
    def type(self) -> SensorType:
        return SensorType.Fan

    @property
    def category(self) -> SensorCategory:
        return SensorCategory.Control

    @property
    def on(self) -> bool:
        """Whether the fan runs."""
        return bool(self.props.on)

    @property
    def speed(self) -> int:
        """Speed, 0 to 100 percent."""
        return int(self.props.speed or 0)

    @property
    def direction(self) -> FanDirection:
        """Direction the fan turns."""
        value = self.props.direction
        return FanDirection(value) if value is not None else FanDirection.Forward

    @property
    def oscillating(self) -> bool:
        """Whether the fan swings from side to side."""
        return bool(self.props.oscillating)

    @property
    def preset(self) -> str | None:
        """Active preset."""
        return self.props.preset  # type: ignore[no-any-return]

    async def setOn(self) -> None:
        """Turn the fan on. Override to drive hardware and call
        ``await super().setOn()`` after success to sync the SDK state.

        Example:
            ```python
            await fan.setOn()
            ```
        """
        self._write_state({FanProperty.On.value: True})

    async def setOff(self) -> None:
        """Turn the fan off. Override to drive hardware and call
        ``await super().setOff()`` after success to sync the SDK state.

        Example:
            ```python
            await fan.setOff()
            ```
        """
        self._write_state({FanProperty.On.value: False})

    async def setSpeed(self, speed: float) -> None:
        """Set the speed. Override to drive hardware and call
        ``await super().setSpeed(speed)`` after success to sync the SDK state.

        Args:
            speed: 0 to 100 percent.

        Example:
            ```python
            await fan.setSpeed(66)
            ```
        """
        self._write_state({FanProperty.Speed.value: round_percent(speed)})

    async def setDirection(self, direction: FanDirection) -> None:
        """Set the direction. Override to drive hardware and call
        ``await super().setDirection(direction)`` after success to sync the SDK state.

        Args:
            direction: Forward or reverse.

        Example:
            ```python
            await fan.setDirection(FanDirection.Reverse)
            ```
        """
        self._write_state({FanProperty.Direction.value: FanDirection(direction).value})

    async def setOscillating(self, value: bool) -> None:
        """Let the fan swing or stop it. Override to drive hardware and call
        ``await super().setOscillating(value)`` after success to sync the SDK state.

        Args:
            value: ``True`` to swing.

        Example:
            ```python
            await fan.setOscillating(True)
            ```
        """
        self._write_state({FanProperty.Oscillating.value: value})

    async def setPreset(self, value: str) -> None:
        """Set the preset. Override to drive hardware and call
        ``await super().setPreset(value)`` after success to sync the SDK state.

        Args:
            value: One of the preset choices.

        Example:
            ```python
            await fan.setPreset("sleep")
            ```
        """
        self._write_state({FanProperty.Preset.value: value})

    async def updateValue(self, property: str, value: Any) -> None:
        """Routes generic property writes to the semantic setters."""
        if property == FanProperty.On.value:
            if value:
                await self.setOn()
            else:
                await self.setOff()
        elif property == FanProperty.Speed.value:
            await self.setSpeed(float(value))
        elif property == FanProperty.Direction.value:
            await self.setDirection(FanDirection(value))
        elif property == FanProperty.Oscillating.value:
            await self.setOscillating(bool(value))
        elif property == FanProperty.Preset.value:
            await self.setPreset(str(value))
