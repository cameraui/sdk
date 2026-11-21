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


class GasProperty(StrEnum):
    """Property names of a gas sensor."""

    Detected = "detected"
    """Whether gas is detected."""


class GasSensorProperties(TypedDict):
    """Property values of a gas sensor."""

    detected: bool


class GasPropertyChangeData(TypedDict):
    """Property change payload emitted on GasSensorLike.onPropertyChanged."""

    property: str
    """Name of the changed property, a GasProperty value."""
    value: bool
    """New value of the property."""


TStorage = TypeVar("TStorage", bound=Mapping[str, Any], default=dict[str, Any])


@runtime_checkable
class GasSensorLike(SensorLike, Protocol):
    """Read-only proxy interface for a gas sensor."""

    @property
    def type(self) -> SensorType:
        return SensorType.Gas

    @property
    def onPropertyChanged(self) -> Observable[GasPropertyChangeData]: ...

    @overload
    def getValue(self, property: Literal[GasProperty.Detected]) -> bool | None: ...
    @overload
    def getValue(self, property: str) -> object | None: ...


class GasSensor(BinarySensor[GasSensorProperties, TStorage], Generic[TStorage]):
    """Gas detector sensor."""

    def __init__(
        self,
        name: str = "Gas Sensor",
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
        return SensorType.Gas
