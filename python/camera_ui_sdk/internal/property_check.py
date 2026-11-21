from __future__ import annotations

import math
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from ..sensor.property_spec import SensorPropertySpec


def check_property_write(specs: Mapping[str, SensorPropertySpec], property: str, value: Any) -> Any:
    spec = specs.get(property)
    if spec is None:
        return value

    if isinstance(value, int | float) and not isinstance(value, bool):
        low = spec.get("min")
        high = spec.get("max")
        if low is not None and value < low:
            raise ValueError(f"{property} must be at least {low:g}, got {value:g}")
        if high is not None and value > high:
            raise ValueError(f"{property} must be at most {high:g}, got {value:g}")
        if spec.get("step"):
            value = _round_to_step(value, spec)
    values = spec.get("values")
    if values is not None and value not in values.values():
        raise ValueError(f"{property} does not support {value}")
    choices = spec.get("choices")
    if choices is not None and not any(choice["value"] == value for choice in choices):
        raise ValueError(f"{property} has no choice {value}")
    max_length = spec.get("maxLength")
    if isinstance(value, str) and max_length is not None and len(value) > max_length:
        raise ValueError(f"{property} is longer than {max_length} characters")
    return value


def _round_to_step(value: float, spec: SensorPropertySpec) -> float:
    step = spec["step"]
    base = spec.get("min", 0)
    digits = len(str(step).partition(".")[2])
    rounded = round(base + math.floor((value - base) / step + 0.5) * step, digits)
    rounded = min(max(rounded, spec.get("min", rounded)), spec.get("max", rounded))
    return int(rounded) if float(rounded).is_integer() else rounded
