from __future__ import annotations

from collections.abc import Mapping
from enum import StrEnum
from typing import Any, Generic, Literal, Protocol, overload, runtime_checkable

from typing_extensions import TypedDict, TypeVar

from ..observable import Observable
from .base import Sensor, SensorCategory, SensorLike, SensorType


class SmokeProperty(StrEnum):
    """Properties for smoke sensors."""

    Detected = "detected"
    """Whether smoke is detected."""


class SmokeSensorProperties(TypedDict):
    """Property value map for smoke sensors."""

    detected: bool


class SmokePropertyChangeData(TypedDict):
    """Emitted on SmokeSensorLike.onPropertyChanged."""

    property: str  # SmokeProperty value
    value: bool


TStorage = TypeVar("TStorage", bound=Mapping[str, Any], default=dict[str, Any])


@runtime_checkable
class SmokeSensorLike(SensorLike, Protocol):
    """Read-only proxy interface for a smoke sensor."""

    @property
    def type(self) -> SensorType:
        return SensorType.Smoke

    @overload
    def getValue(self, property: Literal[SmokeProperty.Detected]) -> bool | None: ...
    @overload
    def getValue(self, property: str) -> object | None: ...

    @property
    def onPropertyChanged(self) -> Observable[SmokePropertyChangeData]: ...


class SmokeSensor(Sensor[SmokeSensorProperties, TStorage, str], Generic[TStorage]):
    """Smoke detector sensor."""

    _requires_frames = False

    def __init__(self, name: str = "Smoke Sensor") -> None:
        super().__init__(name)
        self._write_state({SmokeProperty.Detected.value: False})

    @property
    def type(self) -> SensorType:
        return SensorType.Smoke

    @property
    def category(self) -> SensorCategory:
        return SensorCategory.Sensor

    @property
    def detected(self) -> bool:
        return bool(self.props.detected)

    def setDetected(self, value: bool) -> None:
        """Report smoke detection state.

        Args:
            value: True when smoke is currently detected.

        Example:
            ```python
            smoke.setDetected(True)
            ```
        """
        self._write_state({SmokeProperty.Detected.value: value})

    async def updateValue(self, property: str, value: Any) -> None:
        """Read-only sensor: external writes are ignored."""
        # No-op — smoke state is reported by the plugin, not set externally.
