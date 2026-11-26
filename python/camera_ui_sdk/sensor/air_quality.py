from __future__ import annotations

import math
from collections.abc import Mapping
from enum import StrEnum
from typing import Any, Generic, Literal, Protocol, overload, runtime_checkable

from typing_extensions import TypedDict, TypeVar

from ..observable import Observable
from .base import Sensor, SensorCategory, SensorLike, SensorType
from .device import DeviceInfo
from .property_spec import PropertySpecOverride


class AirQualityCapability(StrEnum):
    """Readings an air quality sensor can offer besides its overall level."""

    Aqi = "aqi"
    """Air quality index."""
    Pm25 = "pm25"
    """Fine particles up to 2.5 μm."""
    Pm10 = "pm10"
    """Particles up to 10 μm."""
    Voc = "voc"
    """Volatile organic compounds."""
    No2 = "no2"
    """Nitrogen dioxide."""


class AirQualityProperty(StrEnum):
    """Property names of an air quality sensor."""

    Level = "level"
    """Overall air quality, empty while unknown."""
    Aqi = "aqi"
    """Air quality index."""
    Pm25 = "pm25"
    """Fine particles up to 2.5 μm, in μg/m³."""
    Pm10 = "pm10"
    """Particles up to 10 μm, in μg/m³."""
    Voc = "voc"
    """Volatile organic compounds, in μg/m³."""
    No2 = "no2"
    """Nitrogen dioxide, in μg/m³."""


class AirQualityLevel(StrEnum):
    """Overall air quality, from best to worst."""

    Excellent = "excellent"
    """Clean air."""
    Good = "good"
    """Good air."""
    Fair = "fair"
    """Acceptable air."""
    Inferior = "inferior"
    """Poor air for sensitive people."""
    Poor = "poor"
    """Poor air."""


class AirQualityInfoProperties(TypedDict):
    """Property values of an air quality sensor."""

    level: str
    aqi: float
    pm25: float
    pm10: float
    voc: float
    no2: float


class AirQualityPropertyChangeData(TypedDict):
    """Property change payload emitted on AirQualityInfoLike.onPropertyChanged."""

    property: str
    """Name of the changed property, an AirQualityProperty value."""
    value: str | float
    """New value of the property."""


TStorage = TypeVar("TStorage", bound=Mapping[str, Any], default=dict[str, Any])

AirQualityReading = Literal[
    AirQualityProperty.Aqi,
    AirQualityProperty.Pm25,
    AirQualityProperty.Pm10,
    AirQualityProperty.Voc,
    AirQualityProperty.No2,
]
"""The numeric readings of an air quality sensor, the properties ``setReading()`` takes."""


@runtime_checkable
class AirQualityInfoLike(SensorLike, Protocol):
    """Read-only proxy interface for an air quality sensor."""

    @property
    def type(self) -> SensorType:
        return SensorType.AirQuality

    @property
    def onPropertyChanged(self) -> Observable[AirQualityPropertyChangeData]: ...

    @property
    def onCapabilitiesChanged(self) -> Observable[list[AirQualityCapability]]: ...

    @overload
    def getValue(self, property: Literal[AirQualityProperty.Level]) -> str | None: ...
    @overload
    def getValue(self, property: AirQualityReading) -> float | None: ...
    @overload
    def getValue(self, property: str) -> object | None: ...


_AQI_LEVELS: tuple[tuple[float, AirQualityLevel], ...] = (
    (50, AirQualityLevel.Excellent),
    (100, AirQualityLevel.Good),
    (150, AirQualityLevel.Fair),
    (200, AirQualityLevel.Inferior),
)

_PM25_LEVELS: tuple[tuple[float, AirQualityLevel], ...] = (
    (9, AirQualityLevel.Excellent),
    (35.4, AirQualityLevel.Good),
    (55.4, AirQualityLevel.Fair),
    (125.4, AirQualityLevel.Inferior),
)


def _level_of(value: float, steps: tuple[tuple[float, AirQualityLevel], ...]) -> AirQualityLevel:
    return next((level for limit, level in steps if value <= limit), AirQualityLevel.Poor)


class AirQualityInfo(Sensor[AirQualityInfoProperties, TStorage, AirQualityCapability], Generic[TStorage]):
    """Air quality sensor with an overall level and the readings the device has.

    Set ``capabilities`` to the readings the device offers. Without a level of
    its own from the plugin, the level follows the air quality index, else PM2.5.
    """

    _requires_frames = False

    def __init__(
        self,
        name: str = "Air Quality",
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
        self._level_from_plugin = False
        self._write_state(
            {
                AirQualityProperty.Level.value: "",
                AirQualityProperty.Aqi.value: 0,
                AirQualityProperty.Pm25.value: 0,
                AirQualityProperty.Pm10.value: 0,
                AirQualityProperty.Voc.value: 0,
                AirQualityProperty.No2.value: 0,
            }
        )

    @property
    def type(self) -> SensorType:
        return SensorType.AirQuality

    @property
    def category(self) -> SensorCategory:
        return SensorCategory.Info

    @property
    def level(self) -> str:
        """Overall air quality, empty while unknown."""
        return str(self.props.level or "")

    def setLevel(self, value: AirQualityLevel) -> None:
        """Report the overall air quality as the device rates it. From then on the
        level no longer follows the readings.

        Args:
            value: The overall level.

        Example:
            ```python
            air_quality.setLevel(AirQualityLevel.Good)
            ```
        """
        self._level_from_plugin = True
        self._write_state({AirQualityProperty.Level.value: value.value})

    def setReading(self, property: AirQualityReading, value: float) -> None:
        """Report a reading. A value that is not a finite number is ignored, a
        negative one counts as 0.

        Args:
            property: The reading, such as ``AirQualityProperty.Pm25``.
            value: The value, in the unit of the reading.

        Example:
            ```python
            air_quality.setReading(AirQualityProperty.Pm25, 12.4)
            ```
        """
        if not math.isfinite(value):
            return

        self._write_state({property.value: max(0, value)})
        if not self._level_from_plugin:
            self._write_state({AirQualityProperty.Level.value: self._derived_level()})

    def _derived_level(self) -> str:
        if self.hasCapability(AirQualityCapability.Aqi):
            return _level_of(float(self.props.aqi or 0), _AQI_LEVELS).value
        if self.hasCapability(AirQualityCapability.Pm25):
            return _level_of(float(self.props.pm25 or 0), _PM25_LEVELS).value
        return str(self.props.level or "")
