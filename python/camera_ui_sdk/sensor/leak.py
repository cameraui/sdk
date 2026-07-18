from __future__ import annotations

from collections.abc import Mapping
from enum import StrEnum
from typing import Any, Generic, Literal, Protocol, overload, runtime_checkable

from typing_extensions import TypedDict, TypeVar

from ..observable import Observable
from .base import Sensor, SensorCategory, SensorLike, SensorType


class LeakProperty(StrEnum):
    """Properties for leak sensors."""

    Detected = "detected"
    """Whether a leak is detected."""


class LeakSensorProperties(TypedDict):
    """Property value map for leak sensors."""

    detected: bool


class LeakPropertyChangeData(TypedDict):
    """Emitted on LeakSensorLike.onPropertyChanged."""

    property: str  # LeakProperty value
    value: bool


TStorage = TypeVar("TStorage", bound=Mapping[str, Any], default=dict[str, Any])


@runtime_checkable
class LeakSensorLike(SensorLike, Protocol):
    """Read-only proxy interface for a leak sensor."""

    @property
    def type(self) -> SensorType:
        return SensorType.Leak

    @overload
    def getValue(self, property: Literal[LeakProperty.Detected]) -> bool | None: ...
    @overload
    def getValue(self, property: str) -> object | None: ...

    @property
    def onPropertyChanged(self) -> Observable[LeakPropertyChangeData]: ...


class LeakSensor(Sensor[LeakSensorProperties, TStorage, str], Generic[TStorage]):
    """Leak sensor for water leak detection."""

    _requires_frames = False

    def __init__(self, name: str = "Leak Sensor") -> None:
        super().__init__(name)
        self._write_state({LeakProperty.Detected.value: False})

    @property
    def type(self) -> SensorType:
        return SensorType.Leak

    @property
    def category(self) -> SensorCategory:
        return SensorCategory.Sensor

    @property
    def detected(self) -> bool:
        return bool(self.props.detected)

    def setDetected(self, value: bool) -> None:
        """Report leak detection state.

        Args:
            value: True when a water leak is currently detected.

        Example:
            ```python
            leak.setDetected(True)
            ```
        """
        self._write_state({LeakProperty.Detected.value: value})

    async def updateValue(self, property: str, value: Any) -> None:
        """Read-only sensor: external writes are ignored."""
        # No-op — leak state is reported by the plugin, not set externally.
