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


class TamperProperty(StrEnum):
    """Property names of a tamper sensor."""

    Detected = "detected"
    """Whether tampering is detected."""


class TamperSensorProperties(TypedDict):
    """Property values of a tamper sensor."""

    detected: bool


class TamperPropertyChangeData(TypedDict):
    """Property change payload emitted on TamperSensorLike.onPropertyChanged."""

    property: str
    """Name of the changed property, a TamperProperty value."""
    value: bool
    """New value of the property."""


TStorage = TypeVar("TStorage", bound=Mapping[str, Any], default=dict[str, Any])


@runtime_checkable
class TamperSensorLike(SensorLike, Protocol):
    """Read-only proxy interface for a tamper sensor."""

    @property
    def type(self) -> SensorType:
        return SensorType.Tamper

    @property
    def onPropertyChanged(self) -> Observable[TamperPropertyChangeData]: ...

    @overload
    def getValue(self, property: Literal[TamperProperty.Detected]) -> bool | None: ...
    @overload
    def getValue(self, property: str) -> object | None: ...


class TamperSensor(BinarySensor[TamperSensorProperties, TStorage], Generic[TStorage]):
    """Tamper sensor."""

    def __init__(
        self,
        name: str = "Tamper Sensor",
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
        return SensorType.Tamper
