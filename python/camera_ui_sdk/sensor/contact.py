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


class ContactKind(StrEnum):
    """What a contact guards, it decides how smart homes show it."""

    Door = "door"
    """A door."""
    GarageDoor = "garage_door"
    """A garage door."""
    Window = "window"
    """A window."""


class ContactProperty(StrEnum):
    """Property names of a contact sensor."""

    Detected = "detected"
    """Whether the contact is open (true = open, false = closed)."""
    Kind = "kind"
    """What the contact guards, a ``ContactKind``."""


class ContactSensorProperties(TypedDict):
    """Property values of a contact sensor."""

    detected: bool
    kind: str | None


class ContactPropertyChangeData(TypedDict):
    """Property change payload emitted on ContactSensorLike.onPropertyChanged."""

    property: str
    """Name of the changed property, a ContactProperty value."""
    value: bool | ContactKind | None
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
    def getValue(self, property: Literal[ContactProperty.Kind]) -> ContactKind | None: ...
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
        return SensorType.Contact

    @property
    def kind(self) -> ContactKind | None:
        """What the contact guards, a ``ContactKind``."""
        value = self.props.kind
        return ContactKind(value) if value is not None else None

    def setKind(self, kind: ContactKind) -> None:
        """Say what the contact guards. Smart homes show it by its kind, a window
        or a door for example, and Home Assistant takes it as the device class.

        Example:
            ```python
            contact.setKind(ContactKind.Window)
            ```
        """
        self._write_state({ContactProperty.Kind.value: kind.value})
        self.setPropertySpec(ContactProperty.Kind.value, {"values": [kind.value]})
