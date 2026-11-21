from __future__ import annotations

from collections.abc import Mapping
from enum import StrEnum
from typing import Any, Generic, Literal, Protocol, overload, runtime_checkable

from typing_extensions import TypedDict, TypeVar

from ..observable import Observable
from .base import SensorLike, SensorType
from .device import DeviceInfo
from .measurement import MeasurementInfo
from .property_spec import PropertySpecOverride


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


class HumidityInfo(MeasurementInfo[HumidityInfoProperties, TStorage], Generic[TStorage]):
    """Humidity info sensor. Reports current relative humidity in %."""

    _initial = 50.0
    _min = 0.0
    _max = 100.0

    def __init__(
        self,
        name: str = "Humidity",
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

    @property
    def type(self) -> SensorType:
        return SensorType.Humidity
