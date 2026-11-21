from __future__ import annotations

from collections.abc import Mapping
from enum import StrEnum
from typing import Any, Generic, Literal, Protocol, overload, runtime_checkable

from typing_extensions import TypedDict, TypeVar

from ..observable import Observable
from .base import SensorLike, SensorType
from .device import DeviceInfo
from .measurement import MeasurementInfo


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


class CarbonDioxideInfo(MeasurementInfo[CarbonDioxideInfoProperties, TStorage], Generic[TStorage]):
    """Carbon dioxide info sensor. Reports current CO2 concentration in ppm."""

    _initial = 400.0
    _min = 0.0

    def __init__(
        self,
        name: str = "Carbon Dioxide",
        *,
        native_id: str | None = None,
        origin: str | None = None,
        address: str | None = None,
        device: DeviceInfo | None = None,
        primary: bool = False,
    ) -> None:
        super().__init__(
            name, native_id=native_id, origin=origin, address=address, device=device, primary=primary
        )

    @property
    def type(self) -> SensorType:
        return SensorType.CarbonDioxide
