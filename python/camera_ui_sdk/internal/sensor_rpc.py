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

    cameraId: str
    sensorId: str
    sensorType: SensorType
    property: str
    value: object
    previousValue: NotRequired[object]
    timestamp: int


# @internal Callback used to propagate property updates to the backend via RPC.
# Receives a partial-state delta (only properties that actually changed). One callback
# invocation per `_writeState` call — atomic from the receiver's perspective.
PropertyUpdateFn = Callable[[dict[str, Any]], None]
PropertyChangeListener = Callable[[PropertyChangedEvent], None]
CapabilityUpdateFn = Callable[[list[str]], None]


class SensorJSON(TypedDict):
    """JSON-serializable representation of a sensor for RPC transport."""

    id: str
    type: SensorType
    name: str
    displayName: str
    category: SensorCategory
    cameraId: str
    pluginId: NotRequired[str]
    properties: dict[str, Any]
    capabilities: NotRequired[list[str]]
    requiresFrames: NotRequired[bool]
    modelSpec: NotRequired[ModelSpec]
