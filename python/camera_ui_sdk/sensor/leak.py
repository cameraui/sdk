from __future__ import annotations

from collections.abc import Mapping
from enum import StrEnum
from typing import Any, Generic, Literal, Protocol, overload, runtime_checkable

from typing_extensions import TypedDict, TypeVar

from ..observable import Observable
from .base import Sensor, SensorCategory, SensorLike, SensorType


class LeakProperty(StrEnum):
    """Property names of a leak sensor."""

    Detected = "detected"
    """Whether a leak is detected."""


class LeakSensorProperties(TypedDict):
    """Property values of a leak sensor."""

    detected: bool


class LeakPropertyChangeData(TypedDict):
    """Property change payload emitted on LeakSensorLike.onPropertyChanged."""

    property: str
    """Name of the changed property, a LeakProperty value."""
    value: bool
    """New value of the property."""


TStorage = TypeVar("TStorage", bound=Mapping[str, Any], default=dict[str, Any])


@runtime_checkable
class LeakSensorLike(SensorLike, Protocol):
    """Read-only proxy interface for a leak sensor."""

    @property
    def type(self) -> SensorType:
        return SensorType.Leak

    @property
    def onPropertyChanged(self) -> Observable[LeakPropertyChangeData]: ...

    @overload
    def getValue(self, property: Literal[LeakProperty.Detected]) -> bool | None: ...
    @overload
    def getValue(self, property: str) -> object | None: ...


class LeakSensor(Sensor[LeakSensorProperties, TStorage, str], Generic[TStorage]):
    """Water leak detector sensor."""

    _requires_frames = False

    def __init__(self, name: str = "Leak Sensor", *, native_id: str | None = None) -> None:
        super().__init__(name, native_id=native_id)
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
