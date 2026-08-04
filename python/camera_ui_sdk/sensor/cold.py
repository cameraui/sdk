from __future__ import annotations

from collections.abc import Mapping
from enum import StrEnum
from typing import Any, Generic, Literal, Protocol, overload, runtime_checkable

from typing_extensions import TypedDict, TypeVar

from ..observable import Observable
from .base import Sensor, SensorCategory, SensorLike, SensorType


class ColdProperty(StrEnum):
    """Property names of a cold sensor."""

    Detected = "detected"
    """Whether abnormal cold is detected."""


class ColdSensorProperties(TypedDict):
    """Property values of a cold sensor."""

    detected: bool


class ColdPropertyChangeData(TypedDict):
    """Property change payload emitted on ColdSensorLike.onPropertyChanged."""

    property: str
    """Name of the changed property, a ColdProperty value."""
    value: bool
    """New value of the property."""


TStorage = TypeVar("TStorage", bound=Mapping[str, Any], default=dict[str, Any])


@runtime_checkable
class ColdSensorLike(SensorLike, Protocol):
    """Read-only proxy interface for a cold sensor."""

    @property
    def type(self) -> SensorType:
        return SensorType.Cold

    @property
    def onPropertyChanged(self) -> Observable[ColdPropertyChangeData]: ...

    @overload
    def getValue(self, property: Literal[ColdProperty.Detected]) -> bool | None: ...
    @overload
    def getValue(self, property: str) -> object | None: ...


class ColdSensor(Sensor[ColdSensorProperties, TStorage, str], Generic[TStorage]):
    """Cold alarm sensor."""

    _requires_frames = False

    def __init__(self, name: str = "Cold Sensor", *, native_id: str | None = None) -> None:
        super().__init__(name, native_id=native_id)
        self._write_state({ColdProperty.Detected.value: False})

    @property
    def type(self) -> SensorType:
        return SensorType.Cold

    @property
    def category(self) -> SensorCategory:
        return SensorCategory.Sensor

    @property
    def detected(self) -> bool:
        return bool(self.props.detected)

    def setDetected(self, value: bool) -> None:
        """Report abnormal cold detection state.

        Args:
            value: True when cold is currently detected.

        Example:
            ```python
            cold.setDetected(True)
            ```
        """
        self._write_state({ColdProperty.Detected.value: value})

    async def updateValue(self, property: str, value: Any) -> None:
        """Read-only sensor: external writes are ignored."""
