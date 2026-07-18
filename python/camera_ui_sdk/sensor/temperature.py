from __future__ import annotations

from collections.abc import Mapping
from enum import StrEnum
from typing import Any, Generic, Literal, Protocol, overload, runtime_checkable

from typing_extensions import TypedDict, TypeVar

from ..observable import Observable
from .base import Sensor, SensorCategory, SensorLike, SensorType


class TemperatureProperty(StrEnum):
    """Properties for temperature info sensors."""

    Current = "current"
    """Current temperature in degrees Celsius."""


class TemperatureInfoProperties(TypedDict):
    """Property value map for temperature info sensors."""

    current: float


class TemperaturePropertyChangeData(TypedDict):
    """Emitted on TemperatureInfoLike.onPropertyChanged."""

    property: str  # TemperatureProperty value
    value: float


TStorage = TypeVar("TStorage", bound=Mapping[str, Any], default=dict[str, Any])


@runtime_checkable
class TemperatureInfoLike(SensorLike, Protocol):
    """Read-only proxy interface for a temperature info sensor."""

    @property
    def type(self) -> SensorType:
        return SensorType.Temperature

    @overload
    def getValue(self, property: Literal[TemperatureProperty.Current]) -> float | None: ...
    @overload
    def getValue(self, property: str) -> object | None: ...

    @property
    def onPropertyChanged(self) -> Observable[TemperaturePropertyChangeData]: ...


class TemperatureInfo(Sensor[TemperatureInfoProperties, TStorage, str], Generic[TStorage]):
    """Temperature info sensor. Reports current temperature in degrees Celsius."""

    _requires_frames = False

    def __init__(self, name: str = "Temperature") -> None:
        super().__init__(name)
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
        """Report a new temperature reading. Clamped to [-270, 100] degrees Celsius."""
        self._write_state({TemperatureProperty.Current.value: max(-270, min(100, value))})

    async def updateValue(self, property: str, value: Any) -> None:
        """Read-only sensor: external writes are ignored."""
        # No-op — temperature is reported by the plugin, not set externally.
