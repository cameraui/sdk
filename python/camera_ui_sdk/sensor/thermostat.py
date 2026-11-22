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


class ThermostatMode(StrEnum):
    """What a thermostat is set to do."""

    Off = "off"
    Heat = "heat"
    Cool = "cool"
    HeatCool = "heat_cool"
    """Heats and cools to stay inside a target range."""
    Auto = "auto"
    """The device decides by its own schedule or logic."""
    Dry = "dry"
    FanOnly = "fan_only"


class ThermostatAction(StrEnum):
    """What a thermostat does right now."""

    Off = "off"
    Idle = "idle"
    Heating = "heating"
    Cooling = "cooling"
    Drying = "drying"
    Fan = "fan"
    Preheating = "preheating"
    Defrosting = "defrosting"


class ThermostatCapability(StrEnum):
    """Optional capabilities of a thermostat."""

    Range = "range"
    """Thermostat keeps the temperature inside a range, in ``heat_cool`` mode."""
    Action = "action"
    """Thermostat reports what it does right now."""
    Humidity = "humidity"
    """Thermostat reports the humidity."""
    Preset = "preset"
    """Thermostat has presets, such as eco or away."""
    FanMode = "fanMode"
    """Thermostat has fan modes."""
    TargetHumidity = "targetHumidity"
    """Thermostat keeps the humidity at a target."""


class ThermostatProperty(StrEnum):
    """Property names of a thermostat. Temperatures are in °C."""

    CurrentTemperature = "currentTemperature"
    """Current temperature."""
    TargetTemperature = "targetTemperature"
    """Temperature the thermostat heats or cools to."""
    TargetTemperatureLow = "targetTemperatureLow"
    """Lower end of the target range."""
    TargetTemperatureHigh = "targetTemperatureHigh"
    """Upper end of the target range."""
    Mode = "mode"
    """Mode, a ``ThermostatMode``."""
    Action = "action"
    """What the thermostat does right now, a ``ThermostatAction``."""
    CurrentHumidity = "currentHumidity"
    """Current humidity in percent."""
    Preset = "preset"
    """Active preset, one of the choices the device offers."""
    FanMode = "fanMode"
    """Active fan mode, one of the choices the device offers."""
    TargetHumidity = "targetHumidity"
    """Humidity in percent the thermostat keeps."""


class ThermostatControlProperties(TypedDict):
    """Property values of a thermostat."""

    currentTemperature: float | None
    targetTemperature: float
    targetTemperatureLow: float
    targetTemperatureHigh: float
    mode: str
    action: str | None
    currentHumidity: float | None
    preset: str | None
    fanMode: str | None
    targetHumidity: int


class ThermostatPropertyChangeData(TypedDict):
    """Property change payload emitted on ThermostatControlLike.onPropertyChanged."""

    property: str
    """Name of the changed property, a ThermostatProperty value."""
    value: ThermostatMode | ThermostatAction | float | str | None
    """New value of the property."""


TStorage = TypeVar("TStorage", bound=Mapping[str, Any], default=dict[str, Any])


@runtime_checkable
class ThermostatControlLike(SensorLike, Protocol):
    """Read-only proxy interface for a thermostat."""

    @property
    def type(self) -> SensorType:
        return SensorType.Thermostat

    @property
    def onPropertyChanged(self) -> Observable[ThermostatPropertyChangeData]: ...

    @property
    def onCapabilitiesChanged(self) -> Observable[list[ThermostatCapability]]: ...

    @overload
    def getValue(self, property: Literal[ThermostatProperty.CurrentTemperature]) -> float | None: ...
    @overload
    def getValue(self, property: Literal[ThermostatProperty.TargetTemperature]) -> float | None: ...
    @overload
    def getValue(self, property: Literal[ThermostatProperty.TargetTemperatureLow]) -> float | None: ...
    @overload
    def getValue(self, property: Literal[ThermostatProperty.TargetTemperatureHigh]) -> float | None: ...
    @overload
    def getValue(self, property: Literal[ThermostatProperty.Mode]) -> ThermostatMode | None: ...
    @overload
    def getValue(self, property: Literal[ThermostatProperty.Action]) -> ThermostatAction | None: ...
    @overload
    def getValue(self, property: Literal[ThermostatProperty.CurrentHumidity]) -> float | None: ...
    @overload
    def getValue(self, property: Literal[ThermostatProperty.Preset]) -> str | None: ...
    @overload
    def getValue(self, property: Literal[ThermostatProperty.FanMode]) -> str | None: ...
    @overload
    def getValue(self, property: Literal[ThermostatProperty.TargetHumidity]) -> int | None: ...
    @overload
    def getValue(self, property: str) -> object | None: ...


class ThermostatControl(
    Sensor[ThermostatControlProperties, TStorage, ThermostatCapability], Generic[TStorage]
):
    """A thermostat or air conditioner. Temperatures are in °C, a plugin
    converts from the device's unit. Override ``setTargetTemperature()``,
    ``setMode()`` and the other commands to drive hardware and call the
    ``super()`` method after success to sync the SDK state. Report readings
    with ``setCurrentTemperature()``, ``setAction()`` and ``setCurrentHumidity()``.

    Narrow the modes to those the device has with
    ``setPropertySpec(ThermostatProperty.Mode, {"values": [...]})``, and its
    temperature range with ``{"min": ..., "max": ..., "step": ...}`` on the
    target properties. Presets and fan modes are the device's own, set them as
    ``choices``.
    """

    _requires_frames = False

    def __init__(
        self,
        name: str = "Thermostat",
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
                ThermostatProperty.TargetTemperature.value: 20,
                ThermostatProperty.TargetTemperatureLow.value: 18,
                ThermostatProperty.TargetTemperatureHigh.value: 24,
                ThermostatProperty.Mode.value: ThermostatMode.Off.value,
                ThermostatProperty.TargetHumidity.value: 50,
            }
        )

    @property
    def type(self) -> SensorType:
        return SensorType.Thermostat

    @property
    def category(self) -> SensorCategory:
        return SensorCategory.Control

    @property
    def currentTemperature(self) -> float | None:
        """Current temperature in °C."""
        return self.props.currentTemperature

    @property
    def targetTemperature(self) -> float:
        """Target temperature in °C."""
        return float(self.props.targetTemperature)

    @property
    def targetTemperatureLow(self) -> float:
        """Lower end of the target range in °C."""
        return float(self.props.targetTemperatureLow)

    @property
    def targetTemperatureHigh(self) -> float:
        """Upper end of the target range in °C."""
        return float(self.props.targetTemperatureHigh)

    @property
    def mode(self) -> ThermostatMode:
        """Mode."""
        value = self.props.mode
        return ThermostatMode(value) if value is not None else ThermostatMode.Off

    @property
    def action(self) -> ThermostatAction | None:
        """What the thermostat does right now."""
        value = self.props.action
        return ThermostatAction(value) if value is not None else None

    @property
    def currentHumidity(self) -> float | None:
        """Current humidity in percent."""
        return self.props.currentHumidity

    @property
    def preset(self) -> str | None:
        """Active preset."""
        return self.props.preset

    @property
    def fanMode(self) -> str | None:
        """Active fan mode."""
        return self.props.fanMode

    @property
    def targetHumidity(self) -> int:
        """Target humidity in percent."""
        return int(self.props.targetHumidity or 0)

    async def setTargetTemperature(self, value: float) -> None:
        """Set the target temperature. Override to drive hardware and call
        ``await super().setTargetTemperature(value)`` after success to sync the SDK state.

        Args:
            value: Temperature in °C.

        Example:
            ```python
            await thermostat.setTargetTemperature(21.5)
            ```
        """
        self._write_state({ThermostatProperty.TargetTemperature.value: value})

    async def setTargetTemperatureLow(self, value: float) -> None:
        """Set the lower end of the target range. Override to drive hardware and
        call ``await super().setTargetTemperatureLow(value)`` after success to
        sync the SDK state.

        Args:
            value: Temperature in °C.

        Example:
            ```python
            await thermostat.setTargetTemperatureLow(19)
            ```
        """
        self._write_state({ThermostatProperty.TargetTemperatureLow.value: value})

    async def setTargetTemperatureHigh(self, value: float) -> None:
        """Set the upper end of the target range. Override to drive hardware and
        call ``await super().setTargetTemperatureHigh(value)`` after success to
        sync the SDK state.

        Args:
            value: Temperature in °C.

        Example:
            ```python
            await thermostat.setTargetTemperatureHigh(24)
            ```
        """
        self._write_state({ThermostatProperty.TargetTemperatureHigh.value: value})

    async def setMode(self, value: ThermostatMode) -> None:
        """Set the mode. Override to drive hardware and call
        ``await super().setMode(value)`` after success to sync the SDK state.

        Example:
            ```python
            await thermostat.setMode(ThermostatMode.Heat)
            ```
        """
        self._write_state({ThermostatProperty.Mode.value: ThermostatMode(value).value})

    async def setPreset(self, value: str) -> None:
        """Set the preset. Override to drive hardware and call
        ``await super().setPreset(value)`` after success to sync the SDK state.

        Args:
            value: One of the preset choices.

        Example:
            ```python
            await thermostat.setPreset("eco")
            ```
        """
        self._write_state({ThermostatProperty.Preset.value: value})

    async def setFanMode(self, value: str) -> None:
        """Set the fan mode. Override to drive hardware and call
        ``await super().setFanMode(value)`` after success to sync the SDK state.

        Args:
            value: One of the fan mode choices.

        Example:
            ```python
            await thermostat.setFanMode("low")
            ```
        """
        self._write_state({ThermostatProperty.FanMode.value: value})

    async def setTargetHumidity(self, value: float) -> None:
        """Set the target humidity. Override to drive hardware and call
        ``await super().setTargetHumidity(value)`` after success to sync the SDK state.

        Args:
            value: Humidity in percent.

        Example:
            ```python
            await thermostat.setTargetHumidity(45)
            ```
        """
        self._write_state({ThermostatProperty.TargetHumidity.value: round_percent(value)})

    def setCurrentTemperature(self, value: float) -> None:
        """Report the current temperature.

        Args:
            value: Temperature in °C.

        Example:
            ```python
            thermostat.setCurrentTemperature(20.4)
            ```
        """
        self._write_state({ThermostatProperty.CurrentTemperature.value: value})

    def setAction(self, value: ThermostatAction) -> None:
        """Report what the thermostat does right now.

        Example:
            ```python
            thermostat.setAction(ThermostatAction.Heating)
            ```
        """
        self._write_state({ThermostatProperty.Action.value: ThermostatAction(value).value})

    def setCurrentHumidity(self, value: float) -> None:
        """Report the current humidity.

        Args:
            value: Humidity in percent.

        Example:
            ```python
            thermostat.setCurrentHumidity(45)
            ```
        """
        self._write_state({ThermostatProperty.CurrentHumidity.value: max(0.0, min(100.0, value))})

    async def updateValue(self, property: str, value: Any) -> None:
        """Routes generic property writes to the semantic setters."""
        if property == ThermostatProperty.TargetTemperature.value:
            await self.setTargetTemperature(float(value))
        elif property == ThermostatProperty.TargetTemperatureLow.value:
            await self.setTargetTemperatureLow(float(value))
        elif property == ThermostatProperty.TargetTemperatureHigh.value:
            await self.setTargetTemperatureHigh(float(value))
        elif property == ThermostatProperty.Mode.value:
            await self.setMode(ThermostatMode(value))
        elif property == ThermostatProperty.Preset.value:
            await self.setPreset(str(value))
        elif property == ThermostatProperty.FanMode.value:
            await self.setFanMode(str(value))
        elif property == ThermostatProperty.TargetHumidity.value:
            await self.setTargetHumidity(float(value))
