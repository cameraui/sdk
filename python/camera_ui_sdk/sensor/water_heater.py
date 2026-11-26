from __future__ import annotations

import math
from collections.abc import Mapping
from enum import StrEnum
from typing import Any, Generic, Literal, Protocol, overload, runtime_checkable

from typing_extensions import TypedDict, TypeVar

from ..observable import Observable
from .base import Sensor, SensorCategory, SensorLike, SensorType
from .device import DeviceInfo
from .property_spec import PropertySpecOverride


class WaterHeaterMode(StrEnum):
    """Operating mode of a water heater."""

    Off = "off"
    Eco = "eco"
    Electric = "electric"
    Gas = "gas"
    HeatPump = "heat_pump"
    HighDemand = "high_demand"
    Performance = "performance"
    Auto = "auto"
    """The device decides by its own schedule or logic."""
    Heat = "heat"
    On = "on"
    """Running in a mode without a name of its own."""


class WaterHeaterCapability(StrEnum):
    """Optional capabilities of a water heater."""

    Away = "away"
    """Water heater has an away mode that saves energy while nobody is home."""


class WaterHeaterProperty(StrEnum):
    """Property names of a water heater."""

    CurrentTemperature = "currentTemperature"
    """Current water temperature in °C."""
    TargetTemperature = "targetTemperature"
    """Target water temperature in °C."""
    Mode = "mode"
    """Operating mode, a ``WaterHeaterMode``, a command when written."""
    Away = "away"
    """``True`` while the away mode is on."""


class WaterHeaterControlProperties(TypedDict):
    """Property values of a water heater."""

    currentTemperature: float | None
    targetTemperature: float
    mode: str
    away: bool


class WaterHeaterPropertyChangeData(TypedDict):
    """Property change payload emitted on WaterHeaterControlLike.onPropertyChanged."""

    property: str
    """Name of the changed property, a WaterHeaterProperty value."""
    value: WaterHeaterMode | bool | float | str | None
    """New value of the property."""


TStorage = TypeVar("TStorage", bound=Mapping[str, Any], default=dict[str, Any])


@runtime_checkable
class WaterHeaterControlLike(SensorLike, Protocol):
    """Read-only proxy interface for a water heater."""

    @property
    def type(self) -> SensorType:
        return SensorType.WaterHeater

    @property
    def onPropertyChanged(self) -> Observable[WaterHeaterPropertyChangeData]: ...

    @property
    def onCapabilitiesChanged(self) -> Observable[list[WaterHeaterCapability]]: ...

    @overload
    def getValue(self, property: Literal[WaterHeaterProperty.CurrentTemperature]) -> float | None: ...
    @overload
    def getValue(self, property: Literal[WaterHeaterProperty.TargetTemperature]) -> float | None: ...
    @overload
    def getValue(self, property: Literal[WaterHeaterProperty.Mode]) -> WaterHeaterMode | None: ...
    @overload
    def getValue(self, property: Literal[WaterHeaterProperty.Away]) -> bool | None: ...
    @overload
    def getValue(self, property: str) -> object | None: ...


class WaterHeaterControl(
    Sensor[WaterHeaterControlProperties, TStorage, WaterHeaterCapability], Generic[TStorage]
):
    """A water heater or boiler that keeps its water at a target temperature.
    Override ``setMode()``, ``setTargetTemperature()`` and ``setAway()`` to
    drive hardware and call the ``super()`` method after success to sync the
    SDK state. Report the water temperature with ``setCurrentTemperature()``.

    Narrow the modes to those the device has with
    ``setPropertySpec(WaterHeaterProperty.Mode, {"values": [...]})``, and its
    temperature range with ``{"min": ..., "max": ..., "step": ...}`` on the
    target temperature. Temperatures are always in °C.

    When the device refuses a command, raise from the override instead of calling
    ``super()``: the write fails for whoever sent it and the state stays as it was.
    """

    _requires_frames = False

    def __init__(
        self,
        name: str = "Water Heater",
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
                WaterHeaterProperty.TargetTemperature.value: 50,
                WaterHeaterProperty.Mode.value: WaterHeaterMode.Off.value,
                WaterHeaterProperty.Away.value: False,
            }
        )

    @property
    def type(self) -> SensorType:
        return SensorType.WaterHeater

    @property
    def category(self) -> SensorCategory:
        return SensorCategory.Control

    @property
    def currentTemperature(self) -> float | None:
        """Current water temperature in °C."""
        return self.props.currentTemperature  # type: ignore[no-any-return]

    @property
    def targetTemperature(self) -> float:
        """Target water temperature in °C."""
        return float(self.props.targetTemperature)

    @property
    def mode(self) -> WaterHeaterMode:
        """Operating mode."""
        value = self.props.mode
        return WaterHeaterMode(value) if value is not None else WaterHeaterMode.Off

    @property
    def away(self) -> bool:
        """``True`` while the away mode is on."""
        return bool(self.props.away)

    async def setMode(self, value: WaterHeaterMode) -> None:
        """Set the operating mode. Override to drive hardware and call
        ``await super().setMode(value)`` after success to sync the SDK state.

        Args:
            value: One of the modes the water heater offers.

        Example:
            ```python
            await boiler.setMode(WaterHeaterMode.Eco)
            ```
        """
        self._write_state({WaterHeaterProperty.Mode.value: WaterHeaterMode(value).value})

    async def setTargetTemperature(self, value: float) -> None:
        """Set the target temperature. Override to drive hardware and call
        ``await super().setTargetTemperature(value)`` after success to sync the SDK state.

        Args:
            value: Target temperature in °C.

        Example:
            ```python
            await boiler.setTargetTemperature(55)
            ```
        """
        self._write_state({WaterHeaterProperty.TargetTemperature.value: value})

    async def setAway(self, away: bool) -> None:
        """Switch the away mode on or off. Override to drive hardware and call
        ``await super().setAway(away)`` after success to sync the SDK state.

        Args:
            away: ``True`` for the away mode.

        Example:
            ```python
            await boiler.setAway(True)
            ```
        """
        self._write_state({WaterHeaterProperty.Away.value: away})

    def setCurrentTemperature(self, value: float) -> None:
        """Report the current water temperature.

        Args:
            value: Water temperature in °C.

        Example:
            ```python
            boiler.setCurrentTemperature(48.5)
            ```
        """
        if not math.isfinite(value):
            return
        self._write_state({WaterHeaterProperty.CurrentTemperature.value: value})

    async def _apply_value(self, property: str, value: Any) -> None:
        """Routes generic property writes to the semantic setters."""
        if property == WaterHeaterProperty.Mode.value:
            await self.setMode(WaterHeaterMode(value))
        elif property == WaterHeaterProperty.TargetTemperature.value:
            await self.setTargetTemperature(float(value))
        elif property == WaterHeaterProperty.Away.value:
            await self.setAway(bool(value))
