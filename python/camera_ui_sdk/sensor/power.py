from __future__ import annotations

from collections.abc import Mapping
from enum import StrEnum
from typing import Any, Generic, Literal, Protocol, overload, runtime_checkable

from typing_extensions import TypedDict, TypeVar

from ..observable import Observable
from .base import Sensor, SensorCategory, SensorLike, SensorType


class PowerProperty(StrEnum):
    """Property names of a power sensor."""

    Detected = "detected"
    """Whether power is detected."""


class PowerSensorProperties(TypedDict):
    """Property values of a power sensor."""

    detected: bool


class PowerPropertyChangeData(TypedDict):
    """Property change payload emitted on PowerSensorLike.onPropertyChanged."""

    property: str
    """Name of the changed property, a PowerProperty value."""
    value: bool
    """New value of the property."""


TStorage = TypeVar("TStorage", bound=Mapping[str, Any], default=dict[str, Any])


@runtime_checkable
class PowerSensorLike(SensorLike, Protocol):
    """Read-only proxy interface for a power sensor."""

    @property
    def type(self) -> SensorType:
        return SensorType.Power

    @property
    def onPropertyChanged(self) -> Observable[PowerPropertyChangeData]: ...

    @overload
    def getValue(self, property: Literal[PowerProperty.Detected]) -> bool | None: ...
    @overload
    def getValue(self, property: str) -> object | None: ...


class PowerSensor(Sensor[PowerSensorProperties, TStorage, str], Generic[TStorage]):
    """Power detection sensor."""

    _requires_frames = False

    def __init__(self, name: str = "Power Sensor", *, native_id: str | None = None) -> None:
        super().__init__(name, native_id=native_id)
        self._write_state({PowerProperty.Detected.value: False})

    @property
    def type(self) -> SensorType:
        return SensorType.Power

    @property
    def category(self) -> SensorCategory:
        return SensorCategory.Sensor

    @property
    def detected(self) -> bool:
        return bool(self.props.detected)

    def setDetected(self, value: bool) -> None:
        """Report power detection state.

        Args:
            value: True when power is currently detected.

        Example:
            ```python
            power.setDetected(True)
            ```
        """
        self._write_state({PowerProperty.Detected.value: value})

    async def updateValue(self, property: str, value: Any) -> None:
        """Read-only sensor: external writes are ignored."""
