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
    Protocol,
    TypedDict,
    TypeVar,
    runtime_checkable,
)
from uuid import uuid4

from ..internal.sensor_rpc import (
    CapabilityUpdateFn,
    PropertyUpdateFn,
    SensorJSON,
)
from ..internal.shared_utils import is_equal
from ..observable import Observable, Subject

if TYPE_CHECKING:
    from ..storage import DeviceStorage, JsonSchema


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
    """Occupancy/presence sensor."""
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
    Lock = "lock"
    """Lock/unlock control."""
    Garage = "garage"
    """Garage door opener."""
    PTZ = "ptz"
    """Pan-tilt-zoom camera control."""
    SecuritySystem = "securitySystem"
    """Security system arm/disarm control."""
    Doorbell = "doorbell"
    """Doorbell ring trigger."""
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
    def id(self) -> str: ...

    @property
    def type(self) -> SensorType: ...

    @property
    def name(self) -> str: ...

    @property
    def nativeId(self) -> str | None: ...

    @property
    def pluginId(self) -> str | None: ...

    @property
    def capabilities(self) -> list[str]: ...

    @property
    def connected(self) -> bool: ...

    @property
    def assignedCameraIds(self) -> list[str]: ...

    @property
    def assignmentLocked(self) -> bool: ...

    @property
    def displayName(self) -> str: ...

    @displayName.setter
    def displayName(self, value: str) -> None: ...

    @property
    def onPropertyChanged(self) -> Observable[Any]: ...

    @property
    def onCapabilitiesChanged(self) -> Observable[Any]: ...

    @property
    def onConnectedChanged(self) -> Observable[bool]: ...

    @property
    def onAssignmentChanged(self) -> Observable[list[str]]: ...

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

    def __init__(self, name: str, *, native_id: str | None = None) -> None:
        self._name = name
        self._id = str(uuid4())  # provisional id, replaced by the host's persistent id at registration
        self._native_id = native_id
        self._display_name = name
        self._plugin_id: str | None = None
        self._assigned_camera_ids: list[str] = []
        self._assignment_locked = False
        self._capabilities: list[TCapability] = []
        self._property_changed_subject: Subject[SensorPropertyChangeData] = Subject()
        self._capabilities_changed_subject: Subject[list[TCapability]] = Subject()
        self._assignment_changed_subject: Subject[list[str]] = Subject()
        self._connected_changed_subject: Subject[bool] = Subject()

        self._update_fn: PropertyUpdateFn | None = None
        self._capabilities_change_fn: Callable[[list[str]], None] | None = None
        self._storage: DeviceStorage[TStorage] | None = None
        self._registered: bool = False
        self._active: bool = False
        self._properties_store: dict[str, Any] = {}
        self._properties_proxy: PropertiesProxy[TProperties] = PropertiesProxy(
            self._properties_store,
        )

    @property
    @abstractmethod
    def type(self) -> SensorType: ...

    @property
    @abstractmethod
    def category(self) -> SensorCategory: ...

    @property
    def id(self) -> str:
        return self._id

    @property
    def nativeId(self) -> str | None:
        return self._native_id

    @property
    def name(self) -> str:
        return self._name

    @property
    def displayName(self) -> str:
        return self._display_name

    @displayName.setter
    def displayName(self, value: str) -> None:
        self._display_name = value

    @property
    def pluginId(self) -> str | None:
        return self._plugin_id

    @property
    def assignedCameraIds(self) -> list[str]:
        return self._assigned_camera_ids.copy()

    @property
    def assignmentLocked(self) -> bool:
        return self._assignment_locked

    @property
    def connected(self) -> bool:
        return self._registered

    @property
    def capabilities(self) -> list[TCapability]:
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
        return self._requires_frames

    @property
    def storage_schema(self) -> list[JsonSchema]:
        return []

    @property
    def storage(self) -> DeviceStorage[TStorage]:
        assert self._storage is not None, "Storage not initialized - sensor not registered yet"
        return self._storage

    @property
    def isAssigned(self) -> bool:
        return len(self._assigned_camera_ids) > 0

    @property
    def props(self) -> PropertiesProxy[TProperties]:
        return self._properties_proxy

    @property
    def rawProps(self) -> dict[str, Any]:
        return self._properties_store

    @property
    def onAssignmentChanged(self) -> Observable[list[str]]:
        return self._assignment_changed_subject.as_observable()

    @property
    def onConnectedChanged(self) -> Observable[bool]:
        return self._connected_changed_subject.as_observable()

    @property
    def onPropertyChanged(self) -> Observable[SensorPropertyChangeData]:
        return self._property_changed_subject.as_observable()

    @property
    def onCapabilitiesChanged(self) -> Observable[list[TCapability]]:
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
        if self._plugin_id:
            result["pluginId"] = self._plugin_id
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

    def _write_state(self, partial: Mapping[str, Any]) -> None:
        """Write changed properties, fire one batched RPC update and notify listeners.

        Used by the semantic helpers on each sensor type, not by plugin code.
        """
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
        """Normalize the arguments of a `reportDetections(detected, detections)` call.

        - `detected` is False: returns `[]` (clear).
        - `detected` is True with detections: returns them, substituting a full-frame box where missing.
        - `detected` is True without detections: returns one synthesized full-frame
          detection carrying `fallback_label` and `fallback_extra`.
        """
        if not detected:
            return []
        if detections:
            # smart-camera plugins report labels without coordinates, downstream
            # consumers (coordinator, zone matching) require a box on every detection
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
        """Invoke the lifecycle hook and schedule it if the override is async."""
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

    def _cleanup(self) -> None:
        # pair on_stop even when the sensor is force-removed without teardown
        if self._active:
            self._active = False
            self._fire_lifecycle(False)

        self._update_fn = None
        self._capabilities_change_fn = None
        self._storage = None
        self._registered = False
        self._assigned_camera_ids = []
        self._property_changed_subject.complete()
        self._capabilities_changed_subject.complete()
        self._assignment_changed_subject.complete()
        self._connected_changed_subject.complete()

    def _getProperties(self) -> dict[str, Any]:
        return self._properties_store.copy()
