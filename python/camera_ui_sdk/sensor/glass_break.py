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


class GlassBreakProperty(StrEnum):
    """Property names of a glass break sensor."""

    Detected = "detected"
    """Whether breaking glass is detected."""


class GlassBreakSensorProperties(TypedDict):
    """Property values of a glass break sensor."""

    detected: bool


class GlassBreakPropertyChangeData(TypedDict):
    """Property change payload emitted on GlassBreakSensorLike.onPropertyChanged."""

    property: str
    """Name of the changed property, a GlassBreakProperty value."""
    value: bool
    """New value of the property."""


TStorage = TypeVar("TStorage", bound=Mapping[str, Any], default=dict[str, Any])


@runtime_checkable
class GlassBreakSensorLike(SensorLike, Protocol):
    """Read-only proxy interface for a glass break sensor."""

    @property
    def type(self) -> SensorType:
        return SensorType.GlassBreak

    @property
    def onPropertyChanged(self) -> Observable[GlassBreakPropertyChangeData]: ...

    @overload
    def getValue(self, property: Literal[GlassBreakProperty.Detected]) -> bool | None: ...
    @overload
    def getValue(self, property: str) -> object | None: ...


class GlassBreakSensor(BinarySensor[GlassBreakSensorProperties, TStorage], Generic[TStorage]):
    """Glass break detector sensor."""

    def __init__(
        self,
        name: str = "Glass Break Sensor",
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
        return SensorType.GlassBreak
