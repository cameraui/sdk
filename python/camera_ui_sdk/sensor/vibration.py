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


class VibrationProperty(StrEnum):
    """Property names of a vibration sensor."""

    Detected = "detected"
    """Whether vibration is detected."""


class VibrationSensorProperties(TypedDict):
    """Property values of a vibration sensor."""

    detected: bool


class VibrationPropertyChangeData(TypedDict):
    """Property change payload emitted on VibrationSensorLike.onPropertyChanged."""

    property: str
    """Name of the changed property, a VibrationProperty value."""
    value: bool
    """New value of the property."""


TStorage = TypeVar("TStorage", bound=Mapping[str, Any], default=dict[str, Any])


@runtime_checkable
class VibrationSensorLike(SensorLike, Protocol):
    """Read-only proxy interface for a vibration sensor."""

    @property
    def type(self) -> SensorType:
        return SensorType.Vibration

    @property
    def onPropertyChanged(self) -> Observable[VibrationPropertyChangeData]: ...

    @overload
    def getValue(self, property: Literal[VibrationProperty.Detected]) -> bool | None: ...
    @overload
    def getValue(self, property: str) -> object | None: ...


class VibrationSensor(BinarySensor[VibrationSensorProperties, TStorage], Generic[TStorage]):
    """Vibration sensor."""

    def __init__(
        self,
        name: str = "Vibration Sensor",
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
        return SensorType.Vibration
