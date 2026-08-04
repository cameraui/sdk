from __future__ import annotations

from collections.abc import Mapping
from enum import StrEnum
from typing import Any, Generic, Literal, Protocol, overload, runtime_checkable

from typing_extensions import TypedDict, TypeVar

from ..observable import Observable
from .base import Sensor, SensorCategory, SensorLike, SensorType


class CarbonDioxideProperty(StrEnum):
    """Property names of a carbon dioxide sensor."""

    Current = "current"
    """Current CO2 concentration in parts per million."""


class CarbonDioxideInfoProperties(TypedDict):
    """Property values of a carbon dioxide sensor."""

    current: float


class CarbonDioxidePropertyChangeData(TypedDict):
    """Property change payload emitted on CarbonDioxideInfoLike.onPropertyChanged."""

    property: str
    """Name of the changed property, a CarbonDioxideProperty value."""
    value: float
    """New value of the property."""


TStorage = TypeVar("TStorage", bound=Mapping[str, Any], default=dict[str, Any])


@runtime_checkable
class CarbonDioxideInfoLike(SensorLike, Protocol):
    """Read-only proxy interface for a carbon dioxide sensor."""

    @property
    def type(self) -> SensorType:
        return SensorType.CarbonDioxide

    @property
    def onPropertyChanged(self) -> Observable[CarbonDioxidePropertyChangeData]: ...

    @overload
    def getValue(self, property: Literal[CarbonDioxideProperty.Current]) -> float | None: ...
    @overload
    def getValue(self, property: str) -> object | None: ...


class CarbonDioxideInfo(Sensor[CarbonDioxideInfoProperties, TStorage, str], Generic[TStorage]):
    """Carbon dioxide info sensor. Reports current CO2 concentration in ppm."""

    _requires_frames = False

    def __init__(self, name: str = "Carbon Dioxide", *, native_id: str | None = None) -> None:
        super().__init__(name, native_id=native_id)
        self._write_state({CarbonDioxideProperty.Current.value: 400})

    @property
    def type(self) -> SensorType:
        return SensorType.CarbonDioxide

    @property
    def category(self) -> SensorCategory:
        return SensorCategory.Info

    @property
    def current(self) -> float:
        value = self.props.current
        return float(value) if value is not None else 0.0

    def setCurrent(self, value: float) -> None:
        """Report a new CO2 reading. Clamped to [0, 40000] ppm.

        Args:
            value: CO2 reading in parts per million.

        Example:
            ```python
            carbonDioxide.setCurrent(600)
            ```
        """
        self._write_state({CarbonDioxideProperty.Current.value: max(0, min(40000, value))})

    async def updateValue(self, property: str, value: Any) -> None:
        """Read-only sensor: external writes are ignored."""
