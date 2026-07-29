from __future__ import annotations

from collections.abc import Callable
from typing import TYPE_CHECKING, Any, NotRequired, TypeAlias, TypedDict

if TYPE_CHECKING:
    from ..sensor.audio import AudioProperty
    from ..sensor.base import SensorCategory, SensorType
    from ..sensor.battery import BatteryCapability, BatteryProperty
    from ..sensor.classifier import ClassifierProperty
    from ..sensor.contact import ContactProperty
    from ..sensor.doorbell import DoorbellProperty
    from ..sensor.face import FaceProperty
    from ..sensor.garage import GarageProperty
    from ..sensor.humidity import HumidityProperty
    from ..sensor.leak import LeakProperty
    from ..sensor.license_plate import LicensePlateProperty
    from ..sensor.light import LightCapability, LightProperty
    from ..sensor.motion import MotionProperty
    from ..sensor.object import ObjectProperty
    from ..sensor.occupancy import OccupancyProperty
    from ..sensor.ptz import PTZCapability, PTZProperty
    from ..sensor.security_system import SecuritySystemProperty
    from ..sensor.siren import SirenCapability, SirenProperty
    from ..sensor.smoke import SmokeProperty
    from ..sensor.spec import ModelSpec
    from ..sensor.switch import SwitchProperty
    from ..sensor.temperature import TemperatureProperty

    SensorPropertyType: TypeAlias = (
        AudioProperty
        | BatteryProperty
        | ClassifierProperty
        | ContactProperty
        | DoorbellProperty
        | FaceProperty
        | GarageProperty
        | HumidityProperty
        | LeakProperty
        | LicensePlateProperty
        | LightProperty
        | MotionProperty
        | ObjectProperty
        | OccupancyProperty
        | PTZProperty
        | SecuritySystemProperty
        | SirenProperty
        | SmokeProperty
        | SwitchProperty
        | TemperatureProperty
    )

    SensorCapability: TypeAlias = PTZCapability | LightCapability | SirenCapability | BatteryCapability


class PropertyChangedEvent(TypedDict):
    """Emitted when a sensor property value changes."""

    sensorId: str
    """Sensor that changed."""
    sensorType: SensorType
    """Type of the sensor that changed."""
    property: str
    """Property key that changed."""
    value: object
    """New value."""
    previousValue: NotRequired[object]
    """Value before the change, absent on the first write."""
    timestamp: int
    """Change time in epoch milliseconds."""


PropertyUpdateFn = Callable[[dict[str, Any]], None]
"""Receives a partial-state delta, one call per ``_write_state``."""

CapabilityUpdateFn = Callable[[list[str]], None]
"""Receives the full capability list whenever it changes."""


class SensorJSON(TypedDict):
    """JSON-serializable representation of a sensor for RPC transport."""

    id: str
    """Sensor ID."""
    type: SensorType
    """Sensor type."""
    name: str
    """Internal name."""
    displayName: str
    """Name shown in the UI."""
    category: SensorCategory
    """Category the sensor belongs to."""
    nativeId: NotRequired[str]
    """Device ID assigned by the plugin."""
    pluginId: NotRequired[str]
    """Plugin that owns the sensor."""
    properties: dict[str, Any]
    """Current property values."""
    capabilities: NotRequired[list[str]]
    """Capability keys the sensor reports."""
    requiresFrames: NotRequired[bool]
    """Sensor needs a frame feed to work."""
    modelSpec: NotRequired[ModelSpec]
    """Model the sensor runs, for ML-backed sensors."""
