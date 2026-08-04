from __future__ import annotations

from collections.abc import Mapping
from enum import StrEnum
from typing import Any, Generic, Literal, Protocol, overload, runtime_checkable

from typing_extensions import TypedDict, TypeVar

from ..observable import Observable
from .base import Sensor, SensorCategory, SensorLike, SensorType


class TamperProperty(StrEnum):
    """Property names of a tamper sensor."""

    Detected = "detected"
    """Whether tampering is detected."""


class TamperSensorProperties(TypedDict):
    """Property values of a tamper sensor."""

    detected: bool


class TamperPropertyChangeData(TypedDict):
    """Property change payload emitted on TamperSensorLike.onPropertyChanged."""

    property: str
    """Name of the changed property, a TamperProperty value."""
    value: bool
    """New value of the property."""


TStorage = TypeVar("TStorage", bound=Mapping[str, Any], default=dict[str, Any])


@runtime_checkable
class TamperSensorLike(SensorLike, Protocol):
    """Read-only proxy interface for a tamper sensor."""

    @property
    def type(self) -> SensorType:
        return SensorType.Tamper

    @property
    def onPropertyChanged(self) -> Observable[TamperPropertyChangeData]: ...

    @overload
    def getValue(self, property: Literal[TamperProperty.Detected]) -> bool | None: ...
    @overload
    def getValue(self, property: str) -> object | None: ...


class TamperSensor(Sensor[TamperSensorProperties, TStorage, str], Generic[TStorage]):
    """Tamper sensor."""

    _requires_frames = False

    def __init__(self, name: str = "Tamper Sensor", *, native_id: str | None = None) -> None:
        super().__init__(name, native_id=native_id)
        self._write_state({TamperProperty.Detected.value: False})

    @property
    def type(self) -> SensorType:
        return SensorType.Tamper

    @property
    def category(self) -> SensorCategory:
        return SensorCategory.Sensor

    @property
    def detected(self) -> bool:
        return bool(self.props.detected)

    def setDetected(self, value: bool) -> None:
        """Report tampering detection state.

        Args:
            value: True when tamper is currently detected.

        Example:
            ```python
            tamper.setDetected(True)
            ```
        """
        self._write_state({TamperProperty.Detected.value: value})

    async def updateValue(self, property: str, value: Any) -> None:
        """Read-only sensor: external writes are ignored."""
