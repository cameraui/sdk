from __future__ import annotations

from collections.abc import Mapping
from enum import Enum
from typing import Any, Generic, Literal, Protocol, overload, runtime_checkable

from typing_extensions import TypedDict, TypeVar

from ..observable import Observable
from .base import Sensor, SensorCategory, SensorLike, SensorType


class HumidityProperty(str, Enum):
    """Properties for humidity info sensors."""

    Current = "current"


class HumidityInfoProperties(TypedDict):
    """Property value map for humidity info sensors."""

    current: float


class HumidityPropertyChangeData(TypedDict):
    """Emitted on HumidityInfoLike.onPropertyChanged."""

    property: str  # HumidityProperty value
    value: float


TStorage = TypeVar("TStorage", bound=Mapping[str, Any], default=dict[str, Any])


@runtime_checkable
class HumidityInfoLike(SensorLike, Protocol):
    """Read-only proxy interface for a humidity info sensor."""

    @property
    def type(self) -> SensorType:
        return SensorType.Humidity

    @overload
    def getValue(self, property: Literal[HumidityProperty.Current]) -> float | None: ...
    @overload
    def getValue(self, property: str) -> object | None: ...

    @property
    def onPropertyChanged(self) -> Observable[HumidityPropertyChangeData]: ...


class HumidityInfo(Sensor[HumidityInfoProperties, TStorage, str], Generic[TStorage]):
    """Humidity info sensor. Reports current relative humidity in %."""

    _requires_frames = False

    def __init__(self, name: str = "Humidity") -> None:
        super().__init__(name)
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
        """Report a new humidity reading. Clamped to [0, 100] %."""
        self._write_state({HumidityProperty.Current.value: max(0.0, min(100.0, value))})

    async def updateValue(self, property: str, value: Any) -> None:
        """Read-only sensor: external writes are ignored."""
        # No-op — humidity is reported by the plugin, not set externally.
