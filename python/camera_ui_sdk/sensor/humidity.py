from __future__ import annotations

from collections.abc import Mapping
from enum import StrEnum
from typing import Any, Generic, Literal, Protocol, overload, runtime_checkable

from typing_extensions import TypedDict, TypeVar

from ..observable import Observable
from .base import Sensor, SensorCategory, SensorLike, SensorType


class HumidityProperty(StrEnum):
    """Property names of a humidity sensor."""

    Current = "current"
    """Current relative humidity (0-100%)."""


class HumidityInfoProperties(TypedDict):
    """Property values of a humidity sensor."""

    current: float


class HumidityPropertyChangeData(TypedDict):
    """Property change payload emitted on HumidityInfoLike.onPropertyChanged."""

    property: str
    """Name of the changed property, a HumidityProperty value."""
    value: float
    """New value of the property."""


TStorage = TypeVar("TStorage", bound=Mapping[str, Any], default=dict[str, Any])


@runtime_checkable
class HumidityInfoLike(SensorLike, Protocol):
    """Read-only proxy interface for a humidity sensor."""

    @property
    def type(self) -> SensorType:
        return SensorType.Humidity

    @property
    def onPropertyChanged(self) -> Observable[HumidityPropertyChangeData]: ...

    @overload
    def getValue(self, property: Literal[HumidityProperty.Current]) -> float | None: ...
    @overload
    def getValue(self, property: str) -> object | None: ...


class HumidityInfo(Sensor[HumidityInfoProperties, TStorage, str], Generic[TStorage]):
    """Humidity info sensor. Reports current relative humidity in %."""

    _requires_frames = False

    def __init__(self, name: str = "Humidity", *, native_id: str | None = None) -> None:
        super().__init__(name, native_id=native_id)
        self._write_state({HumidityProperty.Current.value: 50.0})

    @property
    def type(self) -> SensorType:
        return SensorType.Humidity

    @property
    def category(self) -> SensorCategory:
        return SensorCategory.Info

    @property
    def current(self) -> float:
        return float(self.props.current or 0.0)

    def setCurrent(self, value: float) -> None:
        """Report a new humidity reading. Clamped to [0, 100] %.

        Args:
            value: Relative humidity percentage in the range 0-100.

        Example:
            ```python
            humidity.setCurrent(63)
            ```
        """
        self._write_state({HumidityProperty.Current.value: max(0.0, min(100.0, value))})

    async def updateValue(self, property: str, value: Any) -> None:
        """Read-only sensor: external writes are ignored."""
