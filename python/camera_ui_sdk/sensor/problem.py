from __future__ import annotations

from collections.abc import Mapping
from enum import StrEnum
from typing import Any, Generic, Literal, Protocol, overload, runtime_checkable

from typing_extensions import TypedDict, TypeVar

from ..observable import Observable
from .base import Sensor, SensorCategory, SensorLike, SensorType


class ProblemProperty(StrEnum):
    """Property names of a problem sensor."""

    Detected = "detected"
    """Whether a problem is detected."""


class ProblemSensorProperties(TypedDict):
    """Property values of a problem sensor."""

    detected: bool


class ProblemPropertyChangeData(TypedDict):
    """Property change payload emitted on ProblemSensorLike.onPropertyChanged."""

    property: str
    """Name of the changed property, a ProblemProperty value."""
    value: bool
    """New value of the property."""


TStorage = TypeVar("TStorage", bound=Mapping[str, Any], default=dict[str, Any])


@runtime_checkable
class ProblemSensorLike(SensorLike, Protocol):
    """Read-only proxy interface for a problem sensor."""

    @property
    def type(self) -> SensorType:
        return SensorType.Problem

    @property
    def onPropertyChanged(self) -> Observable[ProblemPropertyChangeData]: ...

    @overload
    def getValue(self, property: Literal[ProblemProperty.Detected]) -> bool | None: ...
    @overload
    def getValue(self, property: str) -> object | None: ...


class ProblemSensor(Sensor[ProblemSensorProperties, TStorage, str], Generic[TStorage]):
    """Generic problem/fault sensor."""

    _requires_frames = False

    def __init__(self, name: str = "Problem Sensor", *, native_id: str | None = None) -> None:
        super().__init__(name, native_id=native_id)
        self._write_state({ProblemProperty.Detected.value: False})

    @property
    def type(self) -> SensorType:
        return SensorType.Problem

    @property
    def category(self) -> SensorCategory:
        return SensorCategory.Sensor

    @property
    def detected(self) -> bool:
        return bool(self.props.detected)

    def setDetected(self, value: bool) -> None:
        """Report the problem state.

        Args:
            value: True when problem is currently detected.

        Example:
            ```python
            problem.setDetected(True)
            ```
        """
        self._write_state({ProblemProperty.Detected.value: value})

    async def updateValue(self, property: str, value: Any) -> None:
        """Read-only sensor: external writes are ignored."""
