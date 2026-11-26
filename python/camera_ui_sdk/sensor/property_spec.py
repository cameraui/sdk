from __future__ import annotations

from typing import Literal, NotRequired, TypedDict

SensorPropertyValueType = Literal["boolean", "number", "string", "enum", "object"]
"""Runtime type of a sensor property."""


class SensorPropertyChoice(TypedDict):
    """A value a device offers for a property, such as a chime tone or a TV input."""

    value: str | int | float
    """Value written to the property."""
    label: str
    """Name of the value at the device, shown as it comes."""


class SensorPropertySpec(TypedDict):
    """Per-property value description: what type a property carries, its possible
    enum values or numeric range, and whether it is a command or an internal
    detail."""

    type: SensorPropertyValueType
    """Runtime type of the value."""
    values: NotRequired[dict[str, str | int | float]]
    """Enum properties: value-name to wire value. Names double as i18n key stems."""
    keys: NotRequired[list[str]]
    """Object properties: scalar member keys, exposed as value-path variables."""
    min: NotRequired[float]
    """Numeric properties: lowest accepted value."""
    max: NotRequired[float]
    """Numeric properties: highest accepted value."""
    step: NotRequired[float]
    """Numeric properties: accepted increment, commands are rounded to it."""
    unit: NotRequired[str]
    """Display unit of the value, e.g. ``%`` or ``°C``."""
    choices: NotRequired[list[SensorPropertyChoice]]
    """Values the device offers with their names at the device, for a property without a fixed enum."""
    maxLength: NotRequired[int]
    """String properties: longest accepted text."""
    writable: NotRequired[bool]
    """Accepts external writes (commands, target states, virtual sensor state)."""
    command: NotRequired[bool]
    """Each write is an action of its own: writes run in order and none replaces another."""
    internal: NotRequired[bool]
    """Not an observable state: hidden from trigger/condition pickers."""


class PropertySpecOverride(TypedDict):
    """What a plugin narrows or describes on one property of its sensor, on top
    of the type's spec: a thermostat's range, a chime's tones, an alarm without
    night mode. The host rejects a command outside it before it reaches the
    plugin, readings the plugin reports are not checked."""

    min: NotRequired[float]
    """Lowest accepted value, inside the type's range."""
    max: NotRequired[float]
    """Highest accepted value, inside the type's range."""
    step: NotRequired[float]
    """Accepted increment, commands are rounded to it."""
    unit: NotRequired[str]
    """Display unit, only for a property whose type sets none."""
    values: NotRequired[list[str | int | float]]
    """Enum properties: the values the device supports, a subset of the type's."""
    choices: NotRequired[list[SensorPropertyChoice]]
    """Values the device offers with their names at the device, for a property without a fixed enum."""
    maxLength: NotRequired[int]
    """String properties: longest accepted text."""
