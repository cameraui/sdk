from __future__ import annotations

import math
from collections.abc import Mapping
from typing import Any, ClassVar, Generic

from typing_extensions import TypedDict, TypeVar

from .base import Sensor, SensorCategory
from .device import DeviceInfo
from .property_spec import PropertySpecOverride


class MeasurementInfoProperties(TypedDict):
    """Property values every measurement sensor carries."""

    current: float
    """Current reading, in the unit of the sensor type."""


TProperties = TypeVar("TProperties", bound=Mapping[str, Any], default=MeasurementInfoProperties)
TStorage = TypeVar("TStorage", bound=Mapping[str, Any], default=dict[str, Any])


class MeasurementInfo(Sensor[TProperties, TStorage, str], Generic[TProperties, TStorage]):
    """Base of the sensors that report one reading, such as a temperature or a CO2
    level. A subclass sets its ``type``, the reading it starts with and the range
    the quantity can have.
    """

    _initial: ClassVar[float]
    _min: ClassVar[float | None] = None
    _max: ClassVar[float | None] = None

    def __init__(
        self,
        name: str,
        *,
        native_id: str | None = None,
        origin: str | None = None,
        address: str | None = None,
        device: DeviceInfo | None = None,
        primary: bool = False,
        property_specs: Mapping[str, PropertySpecOverride] | None = None,
    ) -> None:
        super().__init__(
            name,
            native_id=native_id,
            origin=origin,
            address=address,
            device=device,
            primary=primary,
            property_specs=property_specs,
        )
        self._write_state({"current": self._initial})

    @property
    def category(self) -> SensorCategory:
        return SensorCategory.Info

    @property
    def current(self) -> float:
        """Current reading, in the unit of the sensor type."""
        value = self.props.current
        return float(value) if value is not None else 0.0

    def setCurrent(self, value: float) -> None:
        """Report a new reading. A value outside the range of the quantity is clamped
        to it, a value that is not a finite number is ignored.

        Args:
            value: The reading, in the unit of the sensor type.

        Example:
            ```python
            temperature.setCurrent(21.5)
            ```
        """
        if not math.isfinite(value):
            return
        if self._min is not None:
            value = max(self._min, value)
        if self._max is not None:
            value = min(self._max, value)
        self._write_state({"current": value})

    async def updateValue(self, property: str, value: Any) -> None:
        """Read-only sensor: external writes are ignored."""
