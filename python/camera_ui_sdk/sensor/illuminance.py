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


class IlluminanceProperty(StrEnum):
    """Property names of an illuminance sensor."""

    Current = "current"
    """Current illuminance in lux."""


class IlluminanceInfoProperties(TypedDict):
    """Property values of an illuminance sensor."""

    current: float


class IlluminancePropertyChangeData(TypedDict):
    """Property change payload emitted on IlluminanceInfoLike.onPropertyChanged."""

    property: str
    """Name of the changed property, a IlluminanceProperty value."""
    value: float
    """New value of the property."""


TStorage = TypeVar("TStorage", bound=Mapping[str, Any], default=dict[str, Any])


@runtime_checkable
class IlluminanceInfoLike(SensorLike, Protocol):
    """Read-only proxy interface for an illuminance sensor."""

    @property
    def type(self) -> SensorType:
        return SensorType.Illuminance

    @property
    def onPropertyChanged(self) -> Observable[IlluminancePropertyChangeData]: ...

    @overload
    def getValue(self, property: Literal[IlluminanceProperty.Current]) -> float | None: ...
    @overload
    def getValue(self, property: str) -> object | None: ...


class IlluminanceInfo(MeasurementInfo[IlluminanceInfoProperties, TStorage], Generic[TStorage]):
    """Illuminance info sensor. Reports current light level in lux."""

    _initial = 0.0
    _min = 0.0

    def __init__(
        self,
        name: str = "Illuminance",
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
        return SensorType.Illuminance
