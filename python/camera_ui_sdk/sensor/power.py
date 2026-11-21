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


class PowerProperty(StrEnum):
    """Property names of a power sensor."""

    Detected = "detected"
    """Whether power is detected."""


class PowerSensorProperties(TypedDict):
    """Property values of a power sensor."""

    detected: bool


class PowerPropertyChangeData(TypedDict):
    """Property change payload emitted on PowerSensorLike.onPropertyChanged."""

    property: str
    """Name of the changed property, a PowerProperty value."""
    value: bool
    """New value of the property."""


TStorage = TypeVar("TStorage", bound=Mapping[str, Any], default=dict[str, Any])


@runtime_checkable
class PowerSensorLike(SensorLike, Protocol):
    """Read-only proxy interface for a power sensor."""

    @property
    def type(self) -> SensorType:
        return SensorType.Power

    @property
    def onPropertyChanged(self) -> Observable[PowerPropertyChangeData]: ...

    @overload
    def getValue(self, property: Literal[PowerProperty.Detected]) -> bool | None: ...
    @overload
    def getValue(self, property: str) -> object | None: ...


class PowerSensor(BinarySensor[PowerSensorProperties, TStorage], Generic[TStorage]):
    """Power detection sensor."""

    def __init__(
        self,
        name: str = "Power Sensor",
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
        return SensorType.Power
