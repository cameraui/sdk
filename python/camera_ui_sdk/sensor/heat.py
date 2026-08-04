from __future__ import annotations

from collections.abc import Mapping
from enum import StrEnum
from typing import Any, Generic, Literal, Protocol, overload, runtime_checkable

from typing_extensions import TypedDict, TypeVar

from ..observable import Observable
from .base import Sensor, SensorCategory, SensorLike, SensorType


class HeatProperty(StrEnum):
    """Property names of a heat sensor."""

    Detected = "detected"
    """Whether abnormal heat is detected."""


class HeatSensorProperties(TypedDict):
    """Property values of a heat sensor."""

    detected: bool


class HeatPropertyChangeData(TypedDict):
    """Property change payload emitted on HeatSensorLike.onPropertyChanged."""

    property: str
    """Name of the changed property, a HeatProperty value."""
    value: bool
    """New value of the property."""


TStorage = TypeVar("TStorage", bound=Mapping[str, Any], default=dict[str, Any])


@runtime_checkable
class HeatSensorLike(SensorLike, Protocol):
    """Read-only proxy interface for a heat sensor."""

    @property
    def type(self) -> SensorType:
        return SensorType.Heat

    @property
    def onPropertyChanged(self) -> Observable[HeatPropertyChangeData]: ...

    @overload
    def getValue(self, property: Literal[HeatProperty.Detected]) -> bool | None: ...
    @overload
    def getValue(self, property: str) -> object | None: ...


class HeatSensor(Sensor[HeatSensorProperties, TStorage, str], Generic[TStorage]):
    """Heat alarm sensor."""

    _requires_frames = False

    def __init__(self, name: str = "Heat Sensor", *, native_id: str | None = None) -> None:
        super().__init__(name, native_id=native_id)
        self._write_state({HeatProperty.Detected.value: False})

    @property
    def type(self) -> SensorType:
        return SensorType.Heat

    @property
    def category(self) -> SensorCategory:
        return SensorCategory.Sensor

    @property
    def detected(self) -> bool:
        return bool(self.props.detected)

    def setDetected(self, value: bool) -> None:
        """Report abnormal heat detection state.

        Args:
            value: True when heat is currently detected.

        Example:
            ```python
            heat.setDetected(True)
            ```
        """
        self._write_state({HeatProperty.Detected.value: value})

    async def updateValue(self, property: str, value: Any) -> None:
        """Read-only sensor: external writes are ignored."""
