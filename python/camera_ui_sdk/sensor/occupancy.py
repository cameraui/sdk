from __future__ import annotations

from collections.abc import Mapping
from enum import Enum
from typing import Any, Generic, Literal, Protocol, overload, runtime_checkable

from typing_extensions import TypedDict, TypeVar

from ..observable import Observable
from .base import Sensor, SensorCategory, SensorLike, SensorType


class OccupancyProperty(str, Enum):
    """Properties for occupancy sensors."""

    Detected = "detected"


class OccupancySensorProperties(TypedDict):
    """Property value map for occupancy sensors."""

    detected: bool


class OccupancyPropertyChangeData(TypedDict):
    """Emitted on OccupancySensorLike.onPropertyChanged."""

    property: str  # OccupancyProperty value
    value: bool


TStorage = TypeVar("TStorage", bound=Mapping[str, Any], default=dict[str, Any])


@runtime_checkable
class OccupancySensorLike(SensorLike, Protocol):
    """Read-only proxy interface for an occupancy sensor."""

    @property
    def type(self) -> SensorType:
        return SensorType.Occupancy

    @overload
    def getValue(self, property: Literal[OccupancyProperty.Detected]) -> bool | None: ...
    @overload
    def getValue(self, property: str) -> object | None: ...

    @property
    def onPropertyChanged(self) -> Observable[OccupancyPropertyChangeData]: ...


class OccupancySensor(Sensor[OccupancySensorProperties, TStorage, str], Generic[TStorage]):
    """Occupancy sensor for detecting presence in a room or area."""

    _requires_frames = False

    def __init__(self, name: str = "Occupancy Sensor") -> None:
        super().__init__(name)
        self._write_state({OccupancyProperty.Detected.value: False})

    @property
    def type(self) -> SensorType:
        return SensorType.Occupancy

    @property
    def category(self) -> SensorCategory:
        return SensorCategory.Sensor

    @property
    def detected(self) -> bool:
        return bool(self.props.detected)

    def setDetected(self, value: bool) -> None:
        """Report occupancy state.

        Args:
            value: True when the area is currently occupied.

        Example:
            ```python
            occupancy.setDetected(True)
            ```
        """
        self._write_state({OccupancyProperty.Detected.value: value})

    async def updateValue(self, property: str, value: Any) -> None:
        """Read-only sensor: external writes are ignored."""
        # No-op — occupancy state is reported by the plugin, not set externally.
