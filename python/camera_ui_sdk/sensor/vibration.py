from __future__ import annotations

from collections.abc import Mapping
from enum import StrEnum
from typing import Any, Generic, Literal, Protocol, overload, runtime_checkable

from typing_extensions import TypedDict, TypeVar

from ..observable import Observable
from .base import Sensor, SensorCategory, SensorLike, SensorType


class VibrationProperty(StrEnum):
    """Property names of a vibration sensor."""

    Detected = "detected"
    """Whether vibration is detected."""


class VibrationSensorProperties(TypedDict):
    """Property values of a vibration sensor."""

    detected: bool


class VibrationPropertyChangeData(TypedDict):
    """Property change payload emitted on VibrationSensorLike.onPropertyChanged."""

    property: str
    """Name of the changed property, a VibrationProperty value."""
    value: bool
    """New value of the property."""


TStorage = TypeVar("TStorage", bound=Mapping[str, Any], default=dict[str, Any])


@runtime_checkable
class VibrationSensorLike(SensorLike, Protocol):
    """Read-only proxy interface for a vibration sensor."""

    @property
    def type(self) -> SensorType:
        return SensorType.Vibration

    @property
    def onPropertyChanged(self) -> Observable[VibrationPropertyChangeData]: ...

    @overload
    def getValue(self, property: Literal[VibrationProperty.Detected]) -> bool | None: ...
    @overload
    def getValue(self, property: str) -> object | None: ...


class VibrationSensor(Sensor[VibrationSensorProperties, TStorage, str], Generic[TStorage]):
    """Vibration sensor."""

    _requires_frames = False

    def __init__(self, name: str = "Vibration Sensor", *, native_id: str | None = None) -> None:
        super().__init__(name, native_id=native_id)
        self._write_state({VibrationProperty.Detected.value: False})

    @property
    def type(self) -> SensorType:
        return SensorType.Vibration

    @property
    def category(self) -> SensorCategory:
        return SensorCategory.Sensor

    @property
    def detected(self) -> bool:
        return bool(self.props.detected)

    def setDetected(self, value: bool) -> None:
        """Report vibration detection state.

        Args:
            value: True when vibration is currently detected.

        Example:
            ```python
            vibration.setDetected(True)
            ```
        """
        self._write_state({VibrationProperty.Detected.value: value})

    async def updateValue(self, property: str, value: Any) -> None:
        """Read-only sensor: external writes are ignored."""
