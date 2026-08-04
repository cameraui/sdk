from __future__ import annotations

from collections.abc import Mapping
from enum import StrEnum
from typing import Any, Generic, Literal, Protocol, overload, runtime_checkable

from typing_extensions import TypedDict, TypeVar

from ..observable import Observable
from .base import Sensor, SensorCategory, SensorLike, SensorType


class GasProperty(StrEnum):
    """Property names of a gas sensor."""

    Detected = "detected"
    """Whether gas is detected."""


class GasSensorProperties(TypedDict):
    """Property values of a gas sensor."""

    detected: bool


class GasPropertyChangeData(TypedDict):
    """Property change payload emitted on GasSensorLike.onPropertyChanged."""

    property: str
    """Name of the changed property, a GasProperty value."""
    value: bool
    """New value of the property."""


TStorage = TypeVar("TStorage", bound=Mapping[str, Any], default=dict[str, Any])


@runtime_checkable
class GasSensorLike(SensorLike, Protocol):
    """Read-only proxy interface for a gas sensor."""

    @property
    def type(self) -> SensorType:
        return SensorType.Gas

    @property
    def onPropertyChanged(self) -> Observable[GasPropertyChangeData]: ...

    @overload
    def getValue(self, property: Literal[GasProperty.Detected]) -> bool | None: ...
    @overload
    def getValue(self, property: str) -> object | None: ...


class GasSensor(Sensor[GasSensorProperties, TStorage, str], Generic[TStorage]):
    """Gas detector sensor."""

    _requires_frames = False

    def __init__(self, name: str = "Gas Sensor", *, native_id: str | None = None) -> None:
        super().__init__(name, native_id=native_id)
        self._write_state({GasProperty.Detected.value: False})

    @property
    def type(self) -> SensorType:
        return SensorType.Gas

    @property
    def category(self) -> SensorCategory:
        return SensorCategory.Sensor

    @property
    def detected(self) -> bool:
        return bool(self.props.detected)

    def setDetected(self, value: bool) -> None:
        """Report gas detection state.

        Args:
            value: True when gas is currently detected.

        Example:
            ```python
            gas.setDetected(True)
            ```
        """
        self._write_state({GasProperty.Detected.value: value})

    async def updateValue(self, property: str, value: Any) -> None:
        """Read-only sensor: external writes are ignored."""
