from __future__ import annotations

from collections.abc import Mapping
from typing import Any, Generic

from typing_extensions import TypedDict, TypeVar

from .base import Sensor, SensorCategory
from .device import DeviceInfo
from .property_spec import PropertySpecOverride


class BinarySensorProperties(TypedDict):
    """Property values every binary sensor carries."""

    detected: bool
    """Whether the sensor currently detects its condition."""


TProperties = TypeVar("TProperties", bound=Mapping[str, Any], default=BinarySensorProperties)
TStorage = TypeVar("TStorage", bound=Mapping[str, Any], default=dict[str, Any])


class BinarySensor(Sensor[TProperties, TStorage, str], Generic[TProperties, TStorage]):
    """Base of the sensors that report one condition as on or off, such as smoke, a
    leak or an open contact. A subclass only sets its ``type``.
    """

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
        self._write_state({"detected": False})

    @property
    def category(self) -> SensorCategory:
        return SensorCategory.Sensor

    @property
    def detected(self) -> bool:
        """Whether the sensor currently detects its condition."""
        return bool(self.props.detected)

    def setDetected(self, value: bool) -> None:
        """Report whether the condition is currently detected.

        Args:
            value: True while the condition is detected.

        Example:
            ```python
            sensor.setDetected(True)
            ```
        """
        self._write_state({"detected": value})

    async def updateValue(self, property: str, value: Any) -> None:
        """Read-only sensor: external writes are ignored."""
