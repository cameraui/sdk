from __future__ import annotations

from collections.abc import Mapping
from enum import StrEnum
from typing import Any, Generic, Literal, Protocol, overload, runtime_checkable

from typing_extensions import TypedDict, TypeVar

from ..observable import Observable
from .base import SensorLike, SensorType
from .binary import BinarySensor
from .device import DeviceInfo
from .property_spec import PropertySpecOverride


class OccupancyProperty(StrEnum):
    """Property names of an occupancy sensor."""

    Detected = "detected"
    """Whether occupancy is detected (true = occupied)."""


class OccupancySensorProperties(TypedDict):
    """Property values of an occupancy sensor."""

    detected: bool


class OccupancyPropertyChangeData(TypedDict):
    """Property change payload emitted on OccupancySensorLike.onPropertyChanged."""

    property: str
    """Name of the changed property, an OccupancyProperty value."""
    value: bool
    """New value of the property."""


TStorage = TypeVar("TStorage", bound=Mapping[str, Any], default=dict[str, Any])


@runtime_checkable
class OccupancySensorLike(SensorLike, Protocol):
    """Read-only proxy interface for an occupancy sensor."""

    @property
    def type(self) -> SensorType:
        return SensorType.Occupancy

    @property
    def onPropertyChanged(self) -> Observable[OccupancyPropertyChangeData]: ...

    @overload
    def getValue(self, property: Literal[OccupancyProperty.Detected]) -> bool | None: ...
    @overload
    def getValue(self, property: str) -> object | None: ...


class OccupancySensor(BinarySensor[OccupancySensorProperties, TStorage], Generic[TStorage]):
    """Occupancy sensor for detecting presence in a room or area."""

    def __init__(
        self,
        name: str = "Occupancy Sensor",
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
        return SensorType.Occupancy
