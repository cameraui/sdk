from __future__ import annotations

from collections.abc import Mapping
from enum import StrEnum
from typing import Any, Generic, Literal, Protocol, overload, runtime_checkable

from typing_extensions import TypedDict, TypeVar

from ..observable import Observable
from .base import Sensor, SensorCategory, SensorLike, SensorType


class TemperatureProperty(StrEnum):
    """Property names of a temperature sensor."""

    Current = "current"
    """Current temperature in degrees Celsius."""


class TemperatureInfoProperties(TypedDict):
    """Property values of a temperature sensor."""

    current: float


class TemperaturePropertyChangeData(TypedDict):
    """Property change payload emitted on TemperatureInfoLike.onPropertyChanged."""

    property: str
    """Name of the changed property, a TemperatureProperty value."""
    value: float
    """New value of the property."""


TStorage = TypeVar("TStorage", bound=Mapping[str, Any], default=dict[str, Any])


@runtime_checkable
class TemperatureInfoLike(SensorLike, Protocol):
    """Read-only proxy interface for a temperature sensor."""

    @property
    def type(self) -> SensorType:
        return SensorType.Temperature

    @property
    def onPropertyChanged(self) -> Observable[TemperaturePropertyChangeData]: ...

    @overload
    def getValue(self, property: Literal[TemperatureProperty.Current]) -> float | None: ...
    @overload
    def getValue(self, property: str) -> object | None: ...


class TemperatureInfo(Sensor[TemperatureInfoProperties, TStorage, str], Generic[TStorage]):
    """Temperature info sensor. Reports current temperature in degrees Celsius."""

    _requires_frames = False

    def __init__(self, name: str = "Temperature", *, native_id: str | None = None) -> None:
        super().__init__(name, native_id=native_id)
        self._write_state({TemperatureProperty.Current.value: 20})

    @property
    def type(self) -> SensorType:
        return SensorType.Temperature

    @property
    def category(self) -> SensorCategory:
        return SensorCategory.Info

    @property
    def current(self) -> float:
        value = self.props.current
        return float(value) if value is not None else 0.0

    def setCurrent(self, value: float) -> None:
        """Report a new temperature reading. Clamped to [-270, 100] degrees Celsius.

        Args:
            value: Temperature reading in degrees Celsius.

        Example:
            ```python
            temperature.setCurrent(21.5)
            ```
        """
        self._write_state({TemperatureProperty.Current.value: max(-270, min(100, value))})

    async def updateValue(self, property: str, value: Any) -> None:
        """Read-only sensor: external writes are ignored."""
