from __future__ import annotations

from enum import StrEnum
from typing import NamedTuple, TypedDict


class UnitSystem(StrEnum):
    """Units the admin picked for the installation under Settings, System."""

    Metric = "metric"
    """Metric units, such as °C, km and kg."""
    Imperial = "imperial"
    """Imperial units as used in the US, such as °F, mi and lb."""


class UnitValue(TypedDict):
    """A reading with its unit, as ``toUnitSystem`` returns it."""

    value: float
    """The reading."""
    unit: str
    """Unit of the reading."""


class _Conversion(NamedTuple):
    to: str
    factor: float
    offset: float = 0.0


# the first metric unit for an imperial one wins on the way back, so mm comes before cm
_TO_IMPERIAL: dict[str, _Conversion] = {
    "°C": _Conversion("°F", 9 / 5, 32),
    "km": _Conversion("mi", 0.621371),
    "m": _Conversion("ft", 3.28084),
    "mm": _Conversion("in", 0.0393701),
    "cm": _Conversion("in", 0.393701),
    "km/h": _Conversion("mph", 0.621371),
    "m/s": _Conversion("mph", 2.23694),
    "mm/h": _Conversion("in/h", 0.0393701),
    "mm/d": _Conversion("in/d", 0.0393701),
    "L": _Conversion("gal", 0.264172),
    "mL": _Conversion("fl. oz.", 0.033814),
    "m³": _Conversion("ft³", 35.3147),
    "L/min": _Conversion("gal/min", 0.264172),
    "L/h": _Conversion("gal/h", 0.264172),
    "kg": _Conversion("lb", 2.20462),
    "g": _Conversion("oz", 0.035274),
    "hPa": _Conversion("inHg", 0.02953),
    "mbar": _Conversion("inHg", 0.02953),
    "kPa": _Conversion("psi", 0.145038),
    "bar": _Conversion("psi", 14.5038),
}

_TO_METRIC: dict[str, _Conversion] = {}
for _unit, _conversion in _TO_IMPERIAL.items():
    _TO_METRIC.setdefault(
        _conversion.to,
        _Conversion(_unit, 1 / _conversion.factor, -_conversion.offset / _conversion.factor),
    )


def toUnitSystem(value: float, unit: str, system: UnitSystem) -> UnitValue:
    """Convert a reading to the unit the installation shows for its quantity, such
    as °C to °F for ``UnitSystem.Imperial``. A reading already in that unit
    system, or in a unit without a counterpart, comes back unchanged.

    Args:
        value: The reading.
        unit: Unit of the reading, such as ``°C``.
        system: The installation's unit system, from ``coreManager.getUnitSystem()``.

    Returns:
        The reading in the shown unit, rounded to two decimals.

    Example:
        ```python
        system = await api.coreManager.getUnitSystem()
        shown = toUnitSystem(21.5, "°C", system)  # {"value": 70.7, "unit": "°F"} for imperial
        ```
    """
    conversion = (_TO_IMPERIAL if system == UnitSystem.Imperial else _TO_METRIC).get(unit)
    if conversion is None:
        return {"value": value, "unit": unit}
    return {"value": round(value * conversion.factor + conversion.offset, 2), "unit": conversion.to}


def fromUnitSystem(value: float, unit: str, system: UnitSystem) -> float:
    """Convert a value entered in the shown unit back to the unit it is stored in,
    the reverse of ``toUnitSystem``.

    Args:
        value: The value as entered.
        unit: Unit the value is stored in, such as ``°C``.
        system: The installation's unit system, from ``coreManager.getUnitSystem()``.

    Returns:
        The value in the stored unit, rounded to two decimals.

    Example:
        ```python
        stored = fromUnitSystem(70.7, "°C", UnitSystem.Imperial)  # 21.5
        ```
    """
    conversion = (_TO_IMPERIAL if system == UnitSystem.Imperial else _TO_METRIC).get(unit)
    if conversion is None:
        return value
    return round((value - conversion.offset) / conversion.factor, 2)
