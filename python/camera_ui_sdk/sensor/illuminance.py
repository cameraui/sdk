from __future__ import annotations

from collections.abc import Mapping
from enum import StrEnum
from typing import Any, Generic, Literal, Protocol, overload, runtime_checkable

from typing_extensions import TypedDict, TypeVar

from ..observable import Observable
from .base import Sensor, SensorCategory, SensorLike, SensorType


class IlluminanceProperty(StrEnum):
    """Property names of an illuminance sensor."""

    Current = "current"
    """Current illuminance in lux."""


class IlluminanceInfoProperties(TypedDict):
    """Property values of an illuminance sensor."""

    current: float


class IlluminancePropertyChangeData(TypedDict):
    """Property change payload emitted on IlluminanceInfoLike.onPropertyChanged."""

    property: str
    """Name of the changed property, a IlluminanceProperty value."""
    value: float
    """New value of the property."""


TStorage = TypeVar("TStorage", bound=Mapping[str, Any], default=dict[str, Any])


@runtime_checkable
class IlluminanceInfoLike(SensorLike, Protocol):
    """Read-only proxy interface for an illuminance sensor."""

    @property
    def type(self) -> SensorType:
        return SensorType.Illuminance

    @property
    def onPropertyChanged(self) -> Observable[IlluminancePropertyChangeData]: ...

    @overload
    def getValue(self, property: Literal[IlluminanceProperty.Current]) -> float | None: ...
    @overload
    def getValue(self, property: str) -> object | None: ...


class IlluminanceInfo(Sensor[IlluminanceInfoProperties, TStorage, str], Generic[TStorage]):
    """Illuminance info sensor. Reports current light level in lux."""

    _requires_frames = False

    def __init__(self, name: str = "Illuminance", *, native_id: str | None = None) -> None:
        super().__init__(name, native_id=native_id)
        self._write_state({IlluminanceProperty.Current.value: 0})

    @property
    def type(self) -> SensorType:
        return SensorType.Illuminance

    @property
    def category(self) -> SensorCategory:
        return SensorCategory.Info

    @property
    def current(self) -> float:
        value = self.props.current
        return float(value) if value is not None else 0.0

    def setCurrent(self, value: float) -> None:
        """Report a new illuminance reading. Clamped to [0, 200000] lx.

        Args:
            value: Illuminance reading in lux.

        Example:
            ```python
            illuminance.setCurrent(120)
            ```
        """
        self._write_state({IlluminanceProperty.Current.value: max(0, min(200000, value))})

    async def updateValue(self, property: str, value: Any) -> None:
        """Read-only sensor: external writes are ignored."""
