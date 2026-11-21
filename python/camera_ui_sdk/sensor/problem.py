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


class ProblemProperty(StrEnum):
    """Property names of a problem sensor."""

    Detected = "detected"
    """Whether a problem is detected."""


class ProblemSensorProperties(TypedDict):
    """Property values of a problem sensor."""

    detected: bool


class ProblemPropertyChangeData(TypedDict):
    """Property change payload emitted on ProblemSensorLike.onPropertyChanged."""

    property: str
    """Name of the changed property, a ProblemProperty value."""
    value: bool
    """New value of the property."""


TStorage = TypeVar("TStorage", bound=Mapping[str, Any], default=dict[str, Any])


@runtime_checkable
class ProblemSensorLike(SensorLike, Protocol):
    """Read-only proxy interface for a problem sensor."""

    @property
    def type(self) -> SensorType:
        return SensorType.Problem

    @property
    def onPropertyChanged(self) -> Observable[ProblemPropertyChangeData]: ...

    @overload
    def getValue(self, property: Literal[ProblemProperty.Detected]) -> bool | None: ...
    @overload
    def getValue(self, property: str) -> object | None: ...


class ProblemSensor(BinarySensor[ProblemSensorProperties, TStorage], Generic[TStorage]):
    """Generic problem/fault sensor."""

    def __init__(
        self,
        name: str = "Problem Sensor",
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
        return SensorType.Problem
