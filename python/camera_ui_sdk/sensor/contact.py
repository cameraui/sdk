from __future__ import annotations

from collections.abc import Mapping
from enum import StrEnum
from typing import Any, Generic, Literal, Protocol, overload, runtime_checkable

from typing_extensions import TypedDict, TypeVar

from ..observable import Observable
from .base import SensorLike, SensorType
from .binary import BinarySensor


class ContactProperty(StrEnum):
    """Property names of a contact sensor."""

    Detected = "detected"
    """Whether the contact is open (true = open, false = closed)."""


class ContactSensorProperties(TypedDict):
    """Property values of a contact sensor."""

    detected: bool


class ContactPropertyChangeData(TypedDict):
    """Property change payload emitted on ContactSensorLike.onPropertyChanged."""

    property: str
    """Name of the changed property, a ContactProperty value."""
    value: bool
    """New value of the property."""


TStorage = TypeVar("TStorage", bound=Mapping[str, Any], default=dict[str, Any])


@runtime_checkable
class ContactSensorLike(SensorLike, Protocol):
    """Read-only proxy interface for a contact sensor."""

    @property
    def type(self) -> SensorType:
        return SensorType.Contact

    @property
    def onPropertyChanged(self) -> Observable[ContactPropertyChangeData]: ...

    @overload
    def getValue(self, property: Literal[ContactProperty.Detected]) -> bool | None: ...
    @overload
    def getValue(self, property: str) -> object | None: ...


class ContactSensor(BinarySensor[ContactSensorProperties, TStorage], Generic[TStorage]):
    """Contact sensor for door/window open-close state."""

    def __init__(
        self,
        name: str = "Contact Sensor",
        *,
        native_id: str | None = None,
        origin: str | None = None,
        address: str | None = None,
    ) -> None:
        super().__init__(name, native_id=native_id, origin=origin, address=address)

    @property
    def type(self) -> SensorType:
        return SensorType.Contact
