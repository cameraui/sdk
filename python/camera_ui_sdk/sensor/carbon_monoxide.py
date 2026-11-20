from __future__ import annotations

from collections.abc import Mapping
from enum import StrEnum
from typing import Any, Generic, Literal, Protocol, overload, runtime_checkable

from typing_extensions import TypedDict, TypeVar

from ..observable import Observable
from .base import SensorLike, SensorType
from .binary import BinarySensor


class CarbonMonoxideProperty(StrEnum):
    """Property names of a carbon monoxide sensor."""

    Detected = "detected"
    """Whether carbon monoxide is detected."""


class CarbonMonoxideSensorProperties(TypedDict):
    """Property values of a carbon monoxide sensor."""

    detected: bool


class CarbonMonoxidePropertyChangeData(TypedDict):
    """Property change payload emitted on CarbonMonoxideSensorLike.onPropertyChanged."""

    property: str
    """Name of the changed property, a CarbonMonoxideProperty value."""
    value: bool
    """New value of the property."""


TStorage = TypeVar("TStorage", bound=Mapping[str, Any], default=dict[str, Any])


@runtime_checkable
class CarbonMonoxideSensorLike(SensorLike, Protocol):
    """Read-only proxy interface for a carbon monoxide sensor."""

    @property
    def type(self) -> SensorType:
        return SensorType.CarbonMonoxide

    @property
    def onPropertyChanged(self) -> Observable[CarbonMonoxidePropertyChangeData]: ...

    @overload
    def getValue(self, property: Literal[CarbonMonoxideProperty.Detected]) -> bool | None: ...
    @overload
    def getValue(self, property: str) -> object | None: ...


class CarbonMonoxideSensor(BinarySensor[CarbonMonoxideSensorProperties, TStorage], Generic[TStorage]):
    """Carbon monoxide detector sensor."""

    def __init__(
        self,
        name: str = "Carbon Monoxide Sensor",
        *,
        native_id: str | None = None,
        origin: str | None = None,
        address: str | None = None,
    ) -> None:
        super().__init__(name, native_id=native_id, origin=origin, address=address)

    @property
    def type(self) -> SensorType:
        return SensorType.CarbonMonoxide
