from __future__ import annotations

from collections.abc import Mapping
from enum import StrEnum
from typing import Any, Generic, Literal, Protocol, overload, runtime_checkable

from typing_extensions import TypedDict, TypeVar

from ..observable import Observable
from .base import SensorLike, SensorType
from .measurement import MeasurementInfo


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


class TemperatureInfo(MeasurementInfo[TemperatureInfoProperties, TStorage], Generic[TStorage]):
    """Temperature info sensor. Reports current temperature in degrees Celsius."""

    _initial = 20.0
    _min = -273.15

    def __init__(
        self,
        name: str = "Temperature",
        *,
        native_id: str | None = None,
        origin: str | None = None,
        address: str | None = None,
    ) -> None:
        super().__init__(name, native_id=native_id, origin=origin, address=address)

    @property
    def type(self) -> SensorType:
        return SensorType.Temperature
