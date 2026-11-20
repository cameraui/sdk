from __future__ import annotations

from collections.abc import Mapping
from enum import StrEnum
from typing import Any, Generic, Literal, Protocol, overload, runtime_checkable

from typing_extensions import TypedDict, TypeVar

from ..observable import Observable
from .base import SensorLike, SensorType
from .binary import BinarySensor


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


class HeatSensor(BinarySensor[HeatSensorProperties, TStorage], Generic[TStorage]):
    """Heat alarm sensor."""

    def __init__(
        self,
        name: str = "Heat Sensor",
        *,
        native_id: str | None = None,
        origin: str | None = None,
        address: str | None = None,
    ) -> None:
        super().__init__(name, native_id=native_id, origin=origin, address=address)

    @property
    def type(self) -> SensorType:
        return SensorType.Heat
