from __future__ import annotations

import asyncio
import time
from abc import ABC, abstractmethod
from collections.abc import Callable, Mapping
from enum import StrEnum
from typing import (
    TYPE_CHECKING,
    Any,
    Generic,
    Literal,
    Protocol,
    TypedDict,
    TypeVar,
    runtime_checkable,
)
from uuid import uuid4

from ..internal.sensor_rpc import (
    CapabilityUpdateFn,
    PropertyUpdateFn,
    SensorDeviceState,
    SensorJSON,
    SensorMembership,
    SourceUpdateFn,
)
from ..internal.shared_utils import is_equal
from ..observable import Observable, Subject
from .device import DeviceInfo, SensorDevice
from .property_spec import PropertySpecOverride, SensorPropertySpec

if TYPE_CHECKING:
    from ..storage import DeviceStorage, JsonSchema

SensorSourceState = Literal["connected", "unavailable", "removed"]
"""The plugin's view of the source behind an adopted sensor. ``unavailable``
means wait (source unreachable, entity temporarily unavailable), ``removed``
means the source reported the entity gone while it was reachable. Neither
deletes the sensor: an adopted sensor is deleted by the user only."""


class SensorType(StrEnum):
    """Type of sensor. "Sensor" is camera.ui's umbrella term for the smallest
    smart-home unit. It covers measuring devices and controllable ones alike. The concrete
    classes carry the real meaning (`LightControl`, `MotionSensor`, ...).
    Plugins create sensors of these types, either standalone via the sensor
    manager or attached to a camera via `camera.addSensor()`.
    """

    Motion = "motion"
    """Video-based motion detection."""
    Object = "object"
    """Object detection (person, vehicle, animal, etc.)."""
    Audio = "audio"
    """Audio event detection (glass break, scream, etc.)."""
    Face = "face"
    """Face detection and recognition."""
    FaceEmbedder = "faceEmbedder"
    """Face embedding generation from a face crop, for recognition against enrolled faces."""
    PersonEmbedder = "personEmbedder"
    """Appearance embedding of a person crop, to find the same person again without a face."""
    Segmenter = "segmenter"
    """Outline of an object inside a crop, as a mask over its box."""
    LicensePlate = "licensePlate"
    """License plate detection and OCR."""
    Classifier = "classifier"
    """General-purpose image classifier."""
    Clip = "clip"
    """CLIP embedding generation for semantic search."""
    ObjectAssist = "objectAssist"
    """Locates objects in a frame so secondary detectors get real crops from camera-side detections."""
    CarbonDioxide = "carbonDioxide"
    """Carbon dioxide sensor (ppm)."""
    GlassBreak = "glassBreak"
    """Glass break detector."""
    AirQuality = "airQuality"
    """Air quality level with particle and gas readings."""
    Presence = "presence"
    """Whether a person is at home."""
    CarbonMonoxide = "carbonMonoxide"
    """Carbon monoxide detector."""
    Cold = "cold"
    """Cold alarm."""
    Contact = "contact"
    """Contact/open-close sensor (door, window)."""
    Gas = "gas"
    """Gas detector."""
    Heat = "heat"
    """Heat alarm."""
    Humidity = "humidity"
    """Humidity sensor (0-100%)."""
    Illuminance = "illuminance"
    """Illuminance sensor (lx)."""
    Leak = "leak"
    """Water leak detector."""
    Occupancy = "occupancy"
    """Occupancy sensor, whether someone is in a room."""
    Power = "power"
    """Power detection sensor."""
    Problem = "problem"
    """Generic problem/fault sensor."""
    Smoke = "smoke"
    """Smoke detector."""
    Tamper = "tamper"
    """Tamper sensor."""
    Temperature = "temperature"
    """Temperature sensor (°C)."""
    Vibration = "vibration"
    """Vibration sensor."""
    Light = "light"
    """Light on/off and brightness control."""
    Siren = "siren"
    """Siren on/off and volume control."""
    Switch = "switch"
    """Generic on/off switch."""
    Outlet = "outlet"
    """Power outlet or smart plug."""
    Lock = "lock"
    """Lock/unlock control."""
    Garage = "garage"
    """Garage door opener."""
    Cover = "cover"
    """Blind, shutter, awning, curtain or other cover."""
    Thermostat = "thermostat"
    """Thermostat or air conditioner."""
    Fan = "fan"
    """Ceiling, desk or other fan."""
    Valve = "valve"
    """Water or gas valve, or an irrigation zone."""
    Scene = "scene"
    """Scene or script that runs on command."""
    Humidifier = "humidifier"
    """Humidifier or dehumidifier."""
    Chime = "chime"
    """Chime that plays tones."""
    Display = "display"
    """Text display on a device."""
    PTZ = "ptz"
    """Pan-tilt-zoom camera control."""
    SecuritySystem = "securitySystem"
    """Security system arm/disarm control."""
    Doorbell = "doorbell"
    """Doorbell ring trigger."""
    Button = "button"
    """Button with single, double and long presses."""
    Access = "access"
    """Access reader, such as a fingerprint or NFC reader."""
    Battery = "battery"
    """Battery level and charging state."""


class SensorCategory(StrEnum):
    """Categorizes a sensor's role in the system.

    Determines how the backend treats the sensor (read-only vs. controllable).
    """

    Sensor = "sensor"
    """Read-only detection sensor (motion, object, audio, etc.)."""
    Control = "control"
    """Controllable sensor with set methods (light, siren, PTZ, etc.)."""
    Trigger = "trigger"
    """Event trigger (doorbell ring)."""
    Info = "info"
    """Informational read-only state (battery level)."""


class SensorPropertyChangeData(TypedDict):
    """Emitted on the onPropertyChanged Observable."""

    property: str
    """Name of the changed property."""
    value: object
    """New value of the property."""
    timestamp: int
    """Origin timestamp in milliseconds since epoch."""


@runtime_checkable
class SensorLike(Protocol):
    """Read-only view of a sensor, as other plugins and the backend see it.

    Use this type when consuming sensors, not when creating them. All
    state-modifying methods (`setOn`, `reportDetections`, etc.) live on the
    concrete sensor classes, not on `SensorLike`. Code that holds a `SensorLike`
    reference can only read state and observe changes.
    """

    @property
    def id(self) -> str:
        """Entity id of the sensor, provisional on a new sensor until registration."""
        ...

    @property
    def type(self) -> SensorType:
        """Type of the sensor, fixed per sensor class."""
        ...

    @property
    def name(self) -> str:
        """Name the plugin gave the sensor."""
        ...

    @property
    def nativeId(self) -> str | None:
        """Durable identity the plugin supplied, e.g. an upstream device id."""
        ...

    @property
    def pluginId(self) -> str | None:
        """Id of the plugin that owns the sensor, set at registration."""
        ...

    @property
    def capabilities(self) -> list[str]:
        """Capabilities the sensor advertises."""
        ...

    @property
    def connected(self) -> bool:
        """Whether the sensor is registered and its plugin is connected."""
        ...

    @property
    def assignedCameraIds(self) -> list[str]:
        """Ids of the cameras the user assigned the sensor to."""
        ...

    @property
    def assignmentLocked(self) -> bool:
        """Whether the sensor is bound to the camera it was added to, so the user cannot assign it elsewhere."""
        ...

    @property
    def deviceInfo(self) -> SensorDevice | None:
        """Device the sensor belongs to, ``None`` without one and for a camera's own sensor."""
        ...

    @property
    def primary(self) -> bool:
        """Whether the sensor is the main sensor of its device, called like the device when it stands alone."""
        ...

    @property
    def propertySpecs(self) -> Mapping[str, SensorPropertySpec]:
        """Specs of the properties the plugin narrowed or described, resolved against the type's. A property without an entry follows its type's spec."""
        ...

    @property
    def displayName(self) -> str:
        """Full name shown to the user: inside a device the device name plus ``shortName``, otherwise the plugin's name until the user renames the sensor."""
        ...

    @displayName.setter
    def displayName(self, value: str) -> None: ...

    @property
    def shortName(self) -> str:
        """Name inside its device, the same as ``displayName`` for a sensor without a device."""
        ...

    @property
    def onPropertyChanged(self) -> Observable[Any]:
        """Emits on every property change."""
        ...

    @property
    def onCapabilitiesChanged(self) -> Observable[Any]:
        """Emits the full capability list whenever it changes."""
        ...

    @property
    def onConnectedChanged(self) -> Observable[bool]:
        """Emits when the connected state changes."""
        ...

    @property
    def onAssignmentChanged(self) -> Observable[list[str]]:
        """Emits the camera id list whenever the user changes the sensor's camera assignments."""
        ...

    @property
    def onDeviceInfoChanged(self) -> Observable[SensorDevice | None]:
        """Emits the device whenever the sensor joins or leaves one, or its device, names or main-sensor role change."""
        ...

    @property
    def onPropertySpecsChanged(self) -> Observable[Mapping[str, SensorPropertySpec]]:
        """Emits the property specs whenever the plugin changes them."""
        ...

    def getValue(self, property: str) -> Any | None:
        """Get the current value of a sensor property."""
        ...

    def getValues(self) -> dict[str, Any]:
        """Get a read-only snapshot of all property values."""
        ...

    async def updateValue(self, property: str, value: Any) -> None:
        """Generic property write used by cross-process bridges.

        The owning sensor dispatches it to the matching semantic method, so
        plugin-side hardware overrides still run. Plugin authors call the
        semantic methods instead.
        """
        ...

    def hasCapability(self, capability: str) -> bool:
        """Whether the sensor advertises the given capability."""
        ...


TProperties = TypeVar("TProperties", bound=Mapping[str, Any])
TStorage = TypeVar("TStorage", bound=Mapping[str, Any])
TCapability = TypeVar("TCapability", bound=str)


class PropertiesProxy(Generic[TProperties]):
    """Read-only view over a sensor's property store.

    Subclasses read current state from here when implementing semantic methods.
    Writes go through `Sensor._write_state`, assignments through this proxy raise.
    """

    _store: dict[str, Any]

    def __init__(self, store: dict[str, Any]) -> None:
        object.__setattr__(self, "_store", store)

    def __getattr__(self, key: str) -> Any:
        store: dict[str, Any] = object.__getattribute__(self, "_store")
        if key.startswith("_"):
            return object.__getattribute__(self, key)
        return store.get(key)

    def __setattr__(self, key: str, value: Any) -> None:
        if key.startswith("_"):
            object.__setattr__(self, key, value)
            return
        raise AttributeError(
            "Sensor.props is read-only. Use semantic methods (setOn, reportDetections, ...) "
            "or call self._write_state(...) from inside the sensor class."
        )

    def __getitem__(self, key: str) -> Any:
        store: dict[str, Any] = object.__getattribute__(self, "_store")
        return store.get(key)

    def get(self, key: str, default: Any = None) -> Any:
        """Value of the property ``key``, or ``default`` when it has none."""
        store: dict[str, Any] = object.__getattribute__(self, "_store")
        return store.get(key, default)


class Sensor(ABC, Generic[TProperties, TStorage, TCapability]):
    """Abstract base class for all sensors. Plugins extend this (or use specialized
    subclasses like MotionSensor, LightControl, etc.) to implement sensor logic.

    Sensors are standalone entities: the plugin supplies the durable identity
    (``native_id``), everything else belongs to the user: camera assignments,
    display name and whether the sensor is exported or not. A plugin
    never decides where its sensor is used and never handles the export itself.

    The ``id`` is provisional until registration, when the host swaps in the
    persistent entity id. Reading ``storage`` before registration raises.
    Override ``storage_schema`` to return a JSON schema and get a per-sensor
    settings UI.
    """

    _requires_frames: bool = False

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
        self._name = name
        self._id = str(uuid4())  # provisional id, replaced by the host's persistent id at registration
        self._native_id = native_id
        self._origin = origin
        self._source_state: SensorSourceState | None = None
        self._address = address
        self._membership: SensorMembership | None = {"device": device, "primary": primary} if device else None
        self._device: SensorDevice | None = None
        self._short_name = ""
        self._primary = False
        self._spec_overrides: dict[str, PropertySpecOverride] = dict(property_specs or {})
        self._property_specs: Mapping[str, SensorPropertySpec] = {}
        self._display_name = name
        self._plugin_id: str | None = None
        self._assigned_camera_ids: list[str] = []
        self._assignment_locked = False
        self._capabilities: list[TCapability] = []
        self._property_changed_subject: Subject[SensorPropertyChangeData] = Subject()
        self._capabilities_changed_subject: Subject[list[TCapability]] = Subject()
        self._assignment_changed_subject: Subject[list[str]] = Subject()
        self._connected_changed_subject: Subject[bool] = Subject()
        self._device_info_changed_subject: Subject[SensorDevice | None] = Subject()
        self._property_specs_changed_subject: Subject[Mapping[str, SensorPropertySpec]] = Subject()

        self._update_fn: PropertyUpdateFn | None = None
        self._capabilities_change_fn: Callable[[list[str]], None] | None = None
        self._source_update_fn: SourceUpdateFn | None = None
        self._storage: DeviceStorage[TStorage] | None = None
        self._registered: bool = False
        self._active: bool = False
        self._properties_store: dict[str, Any] = {}
        self._properties_proxy: PropertiesProxy[TProperties] = PropertiesProxy(
            self._properties_store,
        )

    @property
    @abstractmethod
    def type(self) -> SensorType:
        """Type of the sensor, fixed per sensor class."""
        ...

    @property
    @abstractmethod
    def category(self) -> SensorCategory:
        """Category of the sensor: detection sensor, control, trigger or info."""
        ...

    @property
    def id(self) -> str:
        """Entity id of the sensor, provisional on a new sensor until registration."""
        return self._id

    @property
    def nativeId(self) -> str | None:
        """Durable identity the plugin supplied, e.g. an upstream device id."""
        return self._native_id

    @property
    def origin(self) -> str | None:
        """Source system the sensor was imported from, e.g. ``"homeassistant"``."""
        return self._origin

    @property
    def sourceState(self) -> SensorSourceState | None:
        """State of the source behind an adopted sensor, as reported with ``setSourceState()``."""
        return self._source_state

    @property
    def address(self) -> str | None:
        """Current address at the source, e.g. a Home Assistant entity id. Display only."""
        return self._address

    @property
    def name(self) -> str:
        """Name the plugin gave the sensor."""
        return self._name

    @property
    def displayName(self) -> str:
        """Name shown to the user, the plugin's name until the user renames the sensor."""
        return self._display_name

    @displayName.setter
    def displayName(self, value: str) -> None:
        self._display_name = value

    @property
    def shortName(self) -> str:
        """Name inside its device, the same as ``displayName`` for a sensor without a device."""
        return self._short_name or self._display_name

    @property
    def deviceInfo(self) -> SensorDevice | None:
        """Device the sensor belongs to, ``None`` without one and for a camera's own sensor."""
        return self._device

    @property
    def primary(self) -> bool:
        """Whether the sensor is the main sensor of its device, called like the device when it stands alone."""
        return self._primary

    @property
    def propertySpecs(self) -> Mapping[str, SensorPropertySpec]:
        """Specs of the properties the plugin narrowed or described, resolved against the type's. A property without an entry follows its type's spec."""
        return self._property_specs

    @property
    def pluginId(self) -> str | None:
        """Id of the plugin that owns the sensor, set at registration."""
        return self._plugin_id

    @property
    def assignedCameraIds(self) -> list[str]:
        """Ids of the cameras the user assigned the sensor to."""
        return self._assigned_camera_ids.copy()

    @property
    def assignmentLocked(self) -> bool:
        """Whether the sensor is bound to the camera it was added to, so the user cannot assign it elsewhere."""
        return self._assignment_locked

    @property
    def connected(self) -> bool:
        """Whether the sensor is registered and its plugin is connected."""
        return self._registered

    @property
    def capabilities(self) -> list[TCapability]:
        """Capabilities the sensor advertises."""
        return self._capabilities.copy()

    @capabilities.setter
    def capabilities(self, value: list[TCapability]) -> None:
        """Set capabilities, deduplicated, and notify backend plus local listeners."""
        self._capabilities = list(dict.fromkeys(value))
        if self._capabilities_change_fn:
            caps_list: list[str] = [str(c) for c in self._capabilities]
            self._capabilities_change_fn(caps_list)
        self._capabilities_changed_subject.next(list(self._capabilities))

    @property
    def requiresFrames(self) -> bool:
        """Whether the host feeds the sensor video frames."""
        return self._requires_frames

    @property
    def storage_schema(self) -> list[JsonSchema]:
        """JSON schema of the per-sensor settings. Override it to get a settings UI."""
        return []

    @property
    def storage(self) -> DeviceStorage[TStorage]:
        """Per-sensor storage. Raises before registration."""
        assert self._storage is not None, "Storage not initialized - sensor not registered yet"
        return self._storage

    @property
    def isAssigned(self) -> bool:
        """Whether the sensor is assigned to at least one camera."""
        return len(self._assigned_camera_ids) > 0

    @property
    def props(self) -> PropertiesProxy[TProperties]:
        """Read-only view of the property values."""
        return self._properties_proxy

    @property
    def rawProps(self) -> dict[str, Any]:
        """Property store as a plain dict. Change values through the semantic methods."""
        return self._properties_store

    @property
    def onAssignmentChanged(self) -> Observable[list[str]]:
        """Emits the camera id list whenever the user changes the sensor's camera assignments."""
        return self._assignment_changed_subject.as_observable()

    @property
    def onConnectedChanged(self) -> Observable[bool]:
        """Emits when the connected state changes."""
        return self._connected_changed_subject.as_observable()

    @property
    def onDeviceInfoChanged(self) -> Observable[SensorDevice | None]:
        """Emits the device whenever the sensor joins or leaves one, or its device, names or main-sensor role change."""
        return self._device_info_changed_subject.as_observable()

    @property
    def onPropertySpecsChanged(self) -> Observable[Mapping[str, SensorPropertySpec]]:
        """Emits the property specs whenever the plugin changes them."""
        return self._property_specs_changed_subject.as_observable()

    @property
    def onPropertyChanged(self) -> Observable[SensorPropertyChangeData]:
        """Emits on every property change."""
        return self._property_changed_subject.as_observable()

    @property
    def onCapabilitiesChanged(self) -> Observable[list[TCapability]]:
        """Emits the full capability list whenever it changes."""
        return self._capabilities_changed_subject.as_observable()

    def on_start(self) -> Any:
        """Lifecycle hook, called once the sensor is registered and live.

        Storage and RPC are wired up by then. Override it to start work whose
        lifetime matches the sensor's: polling loops, event subscriptions, timers.

        May be either a plain ``def`` or an ``async def``. If async, the SDK
        schedules it on the running event loop (fire-and-forget). Errors are
        swallowed, not logged, so handle failures inside the override. Paired
        1:1 with ``on_stop``, which runs on removal, plugin shutdown or cleanup.

        Example:
            ```python
            async def on_start(self) -> None:
                self._task = asyncio.create_task(self._poll_loop())
            ```
        """
        return None

    def on_stop(self) -> Any:
        """Counterpart of ``on_start``: tear down whatever it started, such as
        timers, subscriptions and external resources.

        May be either a plain ``def`` or an ``async def``. See ``on_start``
        for scheduling semantics.

        Example:
            ```python
            def on_stop(self) -> None:
                if self._task:
                    self._task.cancel()
            ```
        """
        return None

    def setSourceState(self, state: SensorSourceState) -> None:
        """Report what the source behind this sensor looks like right now. The
        host shows the state with its reason on the sensors page and never
        deletes on it. Only meaningful for adopted sensors.

        Args:
            state: Current source state.

        Example:
            ```python
            sensor.setSourceState("connected" if registry_has_entity else "removed")
            ```
        """
        if self._source_state == state:
            return
        self._source_state = state
        if self._source_update_fn:
            self._source_update_fn({"sourceState": state})

    def setAddress(self, address: str) -> None:
        """Report the sensor's current address at the source, e.g. after a Home
        Assistant entity was renamed. The identity (``nativeId``) stays.

        Args:
            address: Current address at the source.

        Example:
            ```python
            sensor.setAddress(entry["entity_id"])
            ```
        """
        if self._address == address:
            return
        self._address = address
        if self._source_update_fn:
            self._source_update_fn({"address": address})

    def setDeviceInfo(self, device: DeviceInfo | None, primary: bool = False) -> None:
        """Put the sensor into a device, or take it out with ``None``.

        Sensors of this plugin that report the same ``DeviceInfo["id"]`` form
        one device. Pass the device to the constructor when it is known there,
        call this for what changes later: a new firmware, a rename at the
        source. Only a change reaches the host. Ignored for a sensor added with
        ``camera.addSensor()``, its camera is its device.

        Args:
            device: Device at the source, ``None`` to leave the current one.
            primary: Whether this sensor is the device's main sensor.

        Example:
            ```python
            sensor.setDeviceInfo(
                {"id": hub.serial, "name": hub.name, "manufacturer": "Acme", "firmware": hub.version},
                primary=True,
            )
            ```
        """
        membership: SensorMembership = {"device": device, "primary": primary}
        if is_equal(self._membership, membership):
            return
        self._membership = membership
        if self._source_update_fn:
            self._source_update_fn({"membership": membership})

    def setPropertySpec(self, property: str, spec: PropertySpecOverride | None) -> None:
        """Narrow or describe one property for this device.

        A range and step, the enum values it supports, the choices it offers
        with their names, a text limit. The host rejects a command outside it
        before it reaches the plugin. Pass it to the constructor when it is
        known there, call this for what changes later. Only a change reaches
        the host.

        Args:
            property: Property to describe.
            spec: What the device accepts, ``None`` to follow the type's spec again.

        Example:
            ```python
            alarm.setPropertySpec(
                SecuritySystemProperty.TargetState,
                {
                    "values": [
                        SecuritySystemState.AwayArm,
                        SecuritySystemState.StayArm,
                        SecuritySystemState.Disarmed,
                    ]
                },
            )
            ```
        """
        overrides = {key: value for key, value in self._spec_overrides.items() if key != property}
        if spec is not None:
            overrides[property] = spec
        if is_equal(self._spec_overrides, overrides):
            return
        self._spec_overrides = overrides
        if self._source_update_fn:
            self._source_update_fn({"propertySpecs": overrides})

    def toJSON(self) -> SensorJSON:
        """Serialize this sensor to a JSON-safe dict for RPC transport."""
        result: SensorJSON = {
            "id": self.id,
            "type": self.type,
            "name": self.name,
            "displayName": self.displayName or self.name,
            "category": self.category,
            "properties": self._getProperties(),
            "capabilities": [str(c) for c in self.capabilities],
            "requiresFrames": self._requires_frames,
        }
        if self._native_id:
            result["nativeId"] = self._native_id
        if self._origin:
            result["origin"] = self._origin
        if self._plugin_id:
            result["pluginId"] = self._plugin_id
        if self._source_state:
            result["sourceState"] = self._source_state
        if self._address:
            result["address"] = self._address
        if self._membership is not None:
            result["membership"] = self._membership
        result["propertySpecs"] = self._spec_overrides
        return result

    def getValue(self, property: str) -> Any | None:
        """Get the current value of a sensor property."""
        return self._properties_store.get(property)

    def getValues(self) -> dict[str, Any]:
        """Get a read-only snapshot of all property values.

        Returns:
            Snapshot of every property currently held by the sensor.

        Example:
            ```python
            snapshot = sensor.getValues()
            print(snapshot)
            ```
        """
        return self._properties_store.copy()

    @abstractmethod
    async def updateValue(self, property: str, value: Any) -> None:
        """Generic property write coming from a consumer.

        Read-only sensors implement it as a no-op, control sensors dispatch known
        properties to their semantic methods (`setOn`, `setActive`,
        `setTargetState`) so plugin overrides drive hardware. Unknown or
        non-writable properties are ignored.

        Plugin authors call the semantic methods on the concrete class instead.
        """
        ...

    def hasCapability(self, capability: TCapability | str) -> bool:
        """Check whether the sensor advertises a capability.

        Args:
            capability: Capability flag to look for.

        Returns:
            True if the sensor currently advertises it.

        Example:
            ```python
            dimmable = sensor.hasCapability("brightness")
            ```
        """
        return capability in self._capabilities

    def updateModelSpec(self) -> None:
        """Re-announce the model spec, e.g. once the models finished loading.

        The spec a detector reports at registration is what it knows at that
        moment: models that load in the background are missing from it. Call
        this after loading, the server replaces its copy.

        Example:
            ```python
            async def on_start(self) -> None:
                await self._plugin.get_object_detector(model_name)
                self.updateModelSpec()
            ```
        """
        spec = getattr(self, "modelSpec", None)
        if spec is not None:
            self._write_state({"modelSpec": spec})

    def _write_state(self, partial: Mapping[str, Any]) -> None:
        delta: dict[str, Any] = {}
        changes: list[tuple[str, Any, Any]] = []

        for key, value in partial.items():
            if value is None:
                continue
            previous = self._properties_store.get(key)
            if is_equal(previous, value, True):
                continue
            self._properties_store[key] = value
            delta[key] = value
            changes.append((key, value, previous))

        if not delta:
            return

        if self._update_fn:
            self._update_fn(delta)

        for key, value, previous in changes:
            self._notifyListeners(key, value, previous)

    def _normalize_reported_detections(
        self,
        detected: bool,
        detections: list[dict[str, Any]] | None,
        fallback_label: str,
        fallback_extra: dict[str, Any] | None = None,
    ) -> list[dict[str, Any]]:
        if not detected:
            return []
        if detections:
            # smart-camera plugins report labels without coordinates, consumers need a box on every detection
            return [
                detection
                if detection.get("box")
                else {**detection, "box": {"x": 0, "y": 0, "width": 1, "height": 1}}
                for detection in detections
            ]
        synthesized: dict[str, Any] = {
            "label": fallback_label,
            "confidence": 1,
            "box": {"x": 0, "y": 0, "width": 1, "height": 1},
        }
        if fallback_extra:
            synthesized.update(fallback_extra)
        return [synthesized]

    def _setStorage(self, storage: DeviceStorage[TStorage]) -> None:
        self._storage = storage

    def _fire_lifecycle(self, active: bool) -> None:
        try:
            result = self.on_start() if active else self.on_stop()
        except Exception:  # noqa: BLE001 - lifecycle errors must not break bookkeeping
            return
        if asyncio.iscoroutine(result):
            try:
                loop = asyncio.get_running_loop()
            except RuntimeError:
                # no loop, close so the coroutine isn't logged as "never awaited"
                result.close()
                return
            task = loop.create_task(result)
            # swallow, otherwise "Task exception was never retrieved" warnings
            task.add_done_callback(lambda t: t.exception() if not t.cancelled() else None)

    def _setActive(self, active: bool) -> None:
        if self._active == active:
            return
        self._active = active
        self._connected_changed_subject.next(active)
        self._fire_lifecycle(active)

    def _setPropertyInternal(self, key: str, value: Any, timestamp: int | None = None) -> None:
        old_value = self._properties_store.get(key)
        if old_value != value:
            self._properties_store[key] = value
            self._notifyListeners(key, value, old_value, timestamp)

    def _onBackendPropertyChanged(self, property: str, value: Any, timestamp: int | None = None) -> None:
        self._setPropertyInternal(property, value, timestamp)

    def _notifyListeners(
        self,
        property: str,
        value: Any,
        previousValue: Any,
        timestamp: int | None = None,
    ) -> None:
        # skip constructor-time writes, listeners only matter once registered
        if not self._registered:
            return

        ts = timestamp or int(time.time() * 1000)
        self._property_changed_subject.next({"property": property, "value": value, "timestamp": ts})

    def _setId(self, id: str) -> None:
        self._id = id

    def _setAssignedCameras(self, camera_ids: list[str]) -> None:
        self._assigned_camera_ids = list(camera_ids)
        self._assignment_changed_subject.next(self._assigned_camera_ids.copy())

    def _setAssignmentLocked(self) -> None:
        self._assignment_locked = True

    def _setPluginId(self, plugin_id: str) -> None:
        self._plugin_id = plugin_id

    def _init(self, update_fn: PropertyUpdateFn) -> None:
        self._update_fn = update_fn
        self._registered = True

    def _initCapabilities(self, update_fn: CapabilityUpdateFn) -> None:
        self._capabilities_change_fn = update_fn

    def _initSource(self, update_fn: SourceUpdateFn) -> None:
        self._source_update_fn = update_fn

    def _applyDeviceState(self, state: SensorDeviceState) -> None:
        device = state.get("device")
        changed = (
            not is_equal(self._device, device)
            or self._short_name != state["shortName"]
            or self._primary != state["primary"]
            or self._display_name != state["displayName"]
        )
        self._device = device
        self._display_name = state["displayName"]
        self._short_name = state["shortName"]
        self._primary = state["primary"]
        if changed:
            self._device_info_changed_subject.next(device)

    def _applyPropertySpecs(self, specs: Mapping[str, SensorPropertySpec]) -> None:
        if is_equal(self._property_specs, specs):
            return
        self._property_specs = specs
        self._property_specs_changed_subject.next(specs)

    def _cleanup(self) -> None:
        # pair on_stop even when the sensor is force-removed without teardown
        if self._active:
            self._active = False
            self._fire_lifecycle(False)

        self._update_fn = None
        self._capabilities_change_fn = None
        self._source_update_fn = None
        self._storage = None
        self._registered = False
        self._assigned_camera_ids = []
        self._property_changed_subject.complete()
        self._capabilities_changed_subject.complete()
        self._assignment_changed_subject.complete()
        self._connected_changed_subject.complete()
        self._device_info_changed_subject.complete()
        self._property_specs_changed_subject.complete()

    def _getProperties(self) -> dict[str, Any]:
        return self._properties_store.copy()
