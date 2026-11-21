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


class PresenceProperty(StrEnum):
    """Property names of a presence sensor."""

    Detected = "detected"
    """Whether the person is at home."""
    Zone = "zone"
    """Name of the zone the person is in while away, empty at home or when unknown."""


class PresenceSensorProperties(TypedDict):
    """Property values of a presence sensor."""

    detected: bool
    zone: str


class PresencePropertyChangeData(TypedDict):
    """Property change payload emitted on PresenceSensorLike.onPropertyChanged."""

    property: str
    """Name of the changed property, a PresenceProperty value."""
    value: bool | str
    """New value of the property."""


TStorage = TypeVar("TStorage", bound=Mapping[str, Any], default=dict[str, Any])


@runtime_checkable
class PresenceSensorLike(SensorLike, Protocol):
    """Read-only proxy interface for a presence sensor."""

    @property
    def type(self) -> SensorType:
        return SensorType.Presence

    @property
    def onPropertyChanged(self) -> Observable[PresencePropertyChangeData]: ...

    @overload
    def getValue(self, property: Literal[PresenceProperty.Detected]) -> bool | None: ...
    @overload
    def getValue(self, property: Literal[PresenceProperty.Zone]) -> str | None: ...
    @overload
    def getValue(self, property: str) -> object | None: ...


class PresenceSensor(BinarySensor[PresenceSensorProperties, TStorage], Generic[TStorage]):
    """Whether one person is at home, such as from a phone's location or a tracker.
    Unlike an occupancy sensor it follows a person, not a room.
    """

    def __init__(
        self,
        name: str = "Presence",
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
        self._write_state({PresenceProperty.Zone.value: ""})

    @property
    def type(self) -> SensorType:
        return SensorType.Presence

    @property
    def zone(self) -> str:
        """Name of the zone the person is in while away, empty at home or when unknown."""
        return str(self.props.zone or "")

    def setZone(self, zone: str) -> None:
        """Report the zone the person is in while away.

        Args:
            zone: Name of the zone, such as ``Work``. Empty when the zone is unknown.

        Example:
            ```python
            presence.setDetected(False)
            presence.setZone("Work")
            ```
        """
        self._write_state({PresenceProperty.Zone.value: zone})
