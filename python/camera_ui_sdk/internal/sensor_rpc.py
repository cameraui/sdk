from __future__ import annotations

from collections.abc import Callable
from typing import TYPE_CHECKING, Any, NotRequired, TypeAlias, TypedDict

if TYPE_CHECKING:
    from ..sensor.access import AccessProperty
    from ..sensor.air_quality import AirQualityCapability, AirQualityProperty
    from ..sensor.audio import AudioProperty
    from ..sensor.base import SensorCategory, SensorSourceState, SensorType
    from ..sensor.battery import BatteryCapability, BatteryProperty
    from ..sensor.button import ButtonProperty
    from ..sensor.carbon_dioxide import CarbonDioxideProperty
    from ..sensor.carbon_monoxide import CarbonMonoxideProperty
    from ..sensor.chime import ChimeCapability, ChimeProperty
    from ..sensor.classifier import ClassifierProperty
    from ..sensor.cold import ColdProperty
    from ..sensor.contact import ContactProperty
    from ..sensor.device import DeviceInfo, SensorDevice
    from ..sensor.display import DisplayCapability, DisplayProperty
    from ..sensor.doorbell import DoorbellProperty
    from ..sensor.face import FaceProperty
    from ..sensor.garage import GarageProperty
    from ..sensor.gas import GasProperty
    from ..sensor.glass_break import GlassBreakProperty
    from ..sensor.heat import HeatProperty
    from ..sensor.humidity import HumidityProperty
    from ..sensor.illuminance import IlluminanceProperty
    from ..sensor.leak import LeakProperty
    from ..sensor.license_plate import LicensePlateProperty
    from ..sensor.light import LightCapability, LightProperty
    from ..sensor.lock import LockProperty
    from ..sensor.motion import MotionProperty
    from ..sensor.object import ObjectProperty
    from ..sensor.occupancy import OccupancyProperty
    from ..sensor.power import PowerProperty
    from ..sensor.presence import PresenceProperty
    from ..sensor.problem import ProblemProperty
    from ..sensor.property_spec import PropertySpecOverride
    from ..sensor.ptz import PTZCapability, PTZProperty
    from ..sensor.security_system import SecuritySystemProperty
    from ..sensor.siren import SirenCapability, SirenProperty
    from ..sensor.smoke import SmokeProperty
    from ..sensor.spec import ModelSpec
    from ..sensor.switch import SwitchProperty
    from ..sensor.tamper import TamperProperty
    from ..sensor.temperature import TemperatureProperty
    from ..sensor.vibration import VibrationProperty

    SensorPropertyType: TypeAlias = (
        AccessProperty
        | AirQualityProperty
        | AudioProperty
        | BatteryProperty
        | ButtonProperty
        | CarbonDioxideProperty
        | CarbonMonoxideProperty
        | ChimeProperty
        | ClassifierProperty
        | ColdProperty
        | ContactProperty
        | DisplayProperty
        | DoorbellProperty
        | FaceProperty
        | GarageProperty
        | GasProperty
        | GlassBreakProperty
        | HeatProperty
        | HumidityProperty
        | IlluminanceProperty
        | LeakProperty
        | LicensePlateProperty
        | LightProperty
        | LockProperty
        | MotionProperty
        | ObjectProperty
        | OccupancyProperty
        | PowerProperty
        | PresenceProperty
        | ProblemProperty
        | PTZProperty
        | SecuritySystemProperty
        | SirenProperty
        | SmokeProperty
        | SwitchProperty
        | TamperProperty
        | TemperatureProperty
        | VibrationProperty
    )

    SensorCapability: TypeAlias = (
        PTZCapability
        | LightCapability
        | SirenCapability
        | BatteryCapability
        | AirQualityCapability
        | ChimeCapability
        | DisplayCapability
    )


class PropertyChangedEvent(TypedDict):
    sensorId: str
    sensorType: SensorType
    property: str
    value: object
    previousValue: NotRequired[object]  # never sent by the server
    timestamp: int  # epoch ms


PropertyUpdateFn = Callable[[dict[str, Any]], None]

CapabilityUpdateFn = Callable[[list[str]], None]


class SensorMembership(TypedDict):
    device: DeviceInfo | None  # None leaves the device
    primary: bool


class SensorDeviceState(TypedDict):
    device: NotRequired[SensorDevice]
    displayName: str
    shortName: str
    primary: bool


class SensorSourcePatch(TypedDict):
    sourceState: NotRequired[SensorSourceState]
    address: NotRequired[str]
    membership: NotRequired[SensorMembership]
    propertySpecs: NotRequired[dict[str, PropertySpecOverride]]  # the full map, replaces the host's


SourceUpdateFn = Callable[[SensorSourcePatch], None]


class SensorJSON(TypedDict):
    id: str
    type: SensorType
    name: str
    displayName: str
    category: SensorCategory
    nativeId: NotRequired[str]
    origin: NotRequired[str]
    pluginId: NotRequired[str]
    properties: dict[str, Any]
    capabilities: NotRequired[list[str]]
    requiresFrames: NotRequired[bool]
    modelSpec: NotRequired[ModelSpec]
    sourceState: NotRequired[SensorSourceState]
    address: NotRequired[str]
    membership: NotRequired[
        SensorMembership
    ]  # absent when the plugin never set a device, the host keeps the one it has
    propertySpecs: NotRequired[
        dict[str, PropertySpecOverride]
    ]  # absent from an older SDK, the host keeps the one it has
