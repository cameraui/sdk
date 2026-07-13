from __future__ import annotations

import asyncio
import contextlib
import time
from abc import ABC, abstractmethod
from collections.abc import Callable, Mapping
from enum import Enum
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
    PropertyChangedEvent,
    PropertyChangeListener,
    PropertyUpdateFn,
    SensorJSON,
)
from ..internal.shared_utils import is_equal
from ..observable import Observable, Subject

if TYPE_CHECKING:
    from ..storage import DeviceStorage, JsonSchema


class SensorType(str, Enum):
    """Type of sensor. Each maps to a smart-home concept (HomeKit service)."""

    Motion = "motion"  # Video-based motion detection
    Object = "object"  # Object detection (person, vehicle, animal, etc.)
    Audio = "audio"  # Audio event detection (glass break, scream, etc.)
    Face = "face"  # Face detection and recognition
    LicensePlate = "licensePlate"  # License plate detection and OCR
    Classifier = "classifier"  # General-purpose image classifier
    Clip = "clip"  # CLIP embedding sensor
    Contact = "contact"  # Contact/open-close sensor (door, window)
    Humidity = "humidity"  # Humidity level sensor
    Leak = "leak"  # Water leak detection sensor
    Occupancy = "occupancy"  # Occupancy/presence detection sensor
    Smoke = "smoke"  # Smoke detection sensor
    Temperature = "temperature"  # Temperature sensor
    Light = "light"  # Light on/off and brightness control
    Siren = "siren"  # Siren on/off and volume control
    Switch = "switch"  # Generic on/off switch
    Lock = "lock"  # Lock/unlock control
    Garage = "garage"  # Garage door open/close control
    PTZ = "ptz"  # Pan-tilt-zoom camera control
    SecuritySystem = "securitySystem"  # Security system arm/disarm control
    Doorbell = "doorbell"  # Doorbell ring trigger
    Battery = "battery"  # Battery level and charging state


class SensorCategory(str, Enum):
    """Categorizes a sensor's role in the system."""

    Sensor = "sensor"  # Read-only detection sensor
    Control = "control"  # Controllable sensor with set methods
    Trigger = "trigger"  # Event trigger
    Info = "info"  # Informational read-only state


class SensorPropertyChangeData(TypedDict):
    """Emitted on the onPropertyChanged Observable."""

    property: str
    value: object
    timestamp: int


@runtime_checkable
class SensorLike(Protocol):
    """Read-only proxy interface for a sensor. Use this type when consuming sensors, not creating them.

    All state-modifying methods (`setOn`, `reportDetections`, etc.) live on the
    concrete sensor classes, not on `SensorLike`. Code that holds a `SensorLike`
    reference can only READ state and observe changes.
    """

    @property
    def id(self) -> str: ...
    @property
    def type(self) -> SensorType: ...
    @property
    def name(self) -> str: ...
    @property
    def pluginId(self) -> str | None: ...
    @property
    def capabilities(self) -> list[str]: ...

    @property
    def displayName(self) -> str: ...
    @displayName.setter
    def displayName(self, value: str) -> None: ...

    def getValue(self, property: str) -> Any | None:
        """Get the current value of a sensor property."""
        ...

    def getValues(self) -> dict[str, Any]:
        """Get a read-only snapshot of all property values."""
        ...

    async def updateValue(self, property: str, value: Any) -> None:
        """Write a property generically. Cross-process bridges (e.g. HomeKit) bind
        generic property names to UI characteristics and call this on a sensor
        proxy — the proxy forwards via RPC to the owning sensor, where control
        sensor classes (`Light`, `Siren`, etc.) override `updateValue` to dispatch
        to the appropriate semantic method (`setOn`, `setActive`, ...). This means
        plugin-side hardware-action overrides ARE honored end-to-end.

        Plugin authors **must not** call this — they should call the semantic
        methods directly on the concrete sensor class.
        """
        ...

    @property
    def onPropertyChanged(self) -> Observable[Any]: ...
    @property
    def onCapabilitiesChanged(self) -> Observable[Any]: ...
    def hasCapability(self, capability: str) -> bool: ...


TProperties = TypeVar("TProperties", bound=Mapping[str, Any])
TStorage = TypeVar("TStorage", bound=Mapping[str, Any])
TCapability = TypeVar("TCapability", bound=str)


class PropertiesProxy(Generic[TProperties]):
    """Read-only view over a sensor's property store. Subclasses use this to read
    current state when implementing semantic methods (e.g. `if self.props.blocked: return`).
    Writes go through `Sensor._write_state` — assignments through this proxy are not allowed.
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
    """Abstract base class for all sensors. Plugins extend this (or use specialized subclasses like MotionSensor, LightControl, etc.) to implement sensor logic."""

    _requires_frames: bool = False

    def __init__(self, name: str) -> None:
        self._camera_id: str | None = None
        self._name = name
        self._id = str(uuid4())
        self._display_name = name
        self._plugin_id: str | None = None
        self._capabilities: list[TCapability] = []
        self._property_changed_subject: Subject[SensorPropertyChangeData] = Subject()
        self._capabilities_changed_subject: Subject[list[TCapability]] = Subject()
        self._detailed_listeners: set[PropertyChangeListener] = set()
        self._assignment_changed_subject: Subject[bool] = Subject()

        self._update_fn: PropertyUpdateFn | None = None
        self._capabilities_change_fn: Callable[[list[str]], None] | None = None
        self._storage: DeviceStorage[TStorage] | None = None
        self._is_assigned: bool = False
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
    def name(self) -> str:
        return self._name

    @property
    def displayName(self) -> str:
        return self._display_name

    @displayName.setter
    def displayName(self, value: str) -> None:
        """Set the display name (the only mutable identifier on a sensor).

        Args:
            value: Human-readable label shown in the UI.

        Example:
            ```python
            sensor.displayName = "Front Door Motion"
            ```
        """
        self._display_name = value

    @property
    def pluginId(self) -> str | None:
        return self._plugin_id

    @property
    def cameraId(self) -> str | None:
        return self._camera_id

    @property
    def capabilities(self) -> list[TCapability]:
        return self._capabilities.copy()

    @capabilities.setter
    def capabilities(self, value: list[TCapability]) -> None:
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
        """Override to provide a JSON schema for per-sensor storage settings UI."""
        return []

    @property
    def storage(self) -> DeviceStorage[TStorage]:
        """Per-sensor persistent storage. Raises if not yet added to a camera."""
        assert self._storage is not None, "Storage not initialized - sensor not added to camera yet"
        return self._storage

    @property
    def isAssigned(self) -> bool:
        return self._is_assigned

    @property
    def props(self) -> PropertiesProxy[TProperties]:
        return self._properties_proxy

    @property
    def rawProps(self) -> dict[str, Any]:
        return self._properties_store

    def _write_state(self, partial: Mapping[str, Any]) -> None:
        """SDK-internal state-write API. Performs deep-equal change detection over
        the partial, writes changed properties to the store, fires a single batched
        RPC update with the delta, and notifies local listeners per-property.

        Used by the semantic helper methods on each sensor type (`setOn`,
        `reportDetections`, etc.) — **not for plugin authors**. Plugin code should
        call the semantic helpers, not write state directly.

        One `_write_state` call → one `_update_fn` invocation. The receiver sees an
        atomic state transition for this sensor.
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
        """Helper for `reportDetections(detected, detections?)` flows.

        - If `detected` is False → returns `[]` (clear).
        - If `detected` is True and `detections` has items → returns them, substituting a full-frame box where missing.
        - If `detected` is True and `detections` is missing/empty → returns a single
          synthesized full-frame detection with the given `fallback_label` and any
          `fallback_extra` fields (used for type-specific properties like `attribute`,
          `plateText`, etc.).
        """
        if not detected:
            return []
        if detections:
            # Smart-camera plugins report labels without coordinates, while
            # downstream consumers (detection coordinator, zone matching)
            # require a box on every detection — substitute full-frame.
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

    def on_assigned(self) -> Any:
        """Lifecycle hook: the sensor just became assigned to a camera.

        Override to start background work that should only run while this
        sensor is live — polling loops, event subscriptions, timers, external
        connections.

        Called AFTER ``cameraId``, ``storage``, and RPC channels are wired up,
        so the override can safely access ``self.cameraId``, ``self.storage``,
        and publish properties via the semantic helper methods.

        May be either a plain ``def`` or an ``async def``. If async, the SDK
        schedules it on the running event loop (fire-and-forget). Errors are
        caught and swallowed — they will NOT break assignment bookkeeping.

        Paired 1:1 with ``on_deassigned`` — for every ``on_assigned`` call
        there is exactly one matching ``on_deassigned`` later (on deassignment
        or cleanup).

        Default: no-op. Most sensors don't need lifecycle hooks.

        Example:
            ```python
            async def on_assigned(self) -> None:
                self._task = asyncio.create_task(self._poll_loop())
            ```
        """
        return None

    def on_deassigned(self) -> Any:
        """Lifecycle hook: the sensor is being deassigned.

        Override to tear down whatever was started in ``on_assigned`` — clear
        timers, close subscriptions, release external resources.

        Always called exactly once for each prior ``on_assigned``. Also called
        from ``_cleanup`` if the sensor is being removed while still assigned,
        so you can rely on this as the single teardown point.

        May be either a plain ``def`` or an ``async def``. See ``on_assigned``
        for scheduling semantics.

        Default: no-op.

        Example:
            ```python
            def on_deassigned(self) -> None:
                if self._task:
                    self._task.cancel()
            ```
        """
        return None

    def _fire_lifecycle(self, assigned: bool) -> None:
        """Internal helper — invoke the appropriate lifecycle hook and, if the
        override returned a coroutine, schedule it on the running loop."""
        try:
            result = self.on_assigned() if assigned else self.on_deassigned()
        except Exception:  # noqa: BLE001 - lifecycle errors must not break bookkeeping
            return
        if asyncio.iscoroutine(result):
            try:
                loop = asyncio.get_running_loop()
            except RuntimeError:
                # No loop running — the coroutine won't execute. Swallow so
                # the coroutine isn't logged as "never awaited".
                result.close()
                return
            task = loop.create_task(result)
            # Swallow exceptions from async lifecycle work so they don't
            # surface as "Task exception was never retrieved" warnings.
            task.add_done_callback(lambda t: t.exception() if not t.cancelled() else None)

    def _setAssigned(self, assigned: bool) -> None:
        if self._is_assigned == assigned:
            return
        self._is_assigned = assigned
        self._assignment_changed_subject.next(assigned)
        self._fire_lifecycle(assigned)

    @property
    def onAssignmentChanged(self) -> Observable[bool]:
        """Observable for assignment state changes (sensor added/removed from camera)."""
        return self._assignment_changed_subject.as_observable()

    def toJSON(self) -> SensorJSON:
        """Serialize this sensor to a JSON-safe dict for RPC transport."""
        result: SensorJSON = {
            "id": self.id,
            "type": self.type,
            "name": self.name,
            "displayName": self.displayName or self.name,
            "category": self.category,
            "cameraId": self._camera_id or "",
            "properties": self._getProperties(),
            "capabilities": [str(c) for c in self.capabilities],
            "requiresFrames": self._requires_frames,
        }
        if self._plugin_id:
            result["pluginId"] = self._plugin_id
        return result

    def _setPropertyInternal(self, key: str, value: Any, timestamp: int | None = None) -> None:
        old_value = self._properties_store.get(key)
        if old_value != value:
            self._properties_store[key] = value
            self._notifyListeners(key, value, old_value, timestamp)

    def _onBackendPropertyChanged(self, property: str, value: Any, timestamp: int | None = None) -> None:
        self._setPropertyInternal(property, value, timestamp)

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
        """External-consumer entry point that satisfies the `SensorLike.updateValue`
        contract. Each concrete sensor class implements this — read-only sensors
        leave it as a no-op, control sensors dispatch known properties to the
        appropriate semantic methods (`setOn`, `setActive`, `setTargetState`, ...)
        so plugin overrides drive hardware. Unknown / non-writable properties are
        silently ignored.

        **Plugin authors must not call this** — they should call the semantic
        methods directly on the concrete sensor class.
        """
        ...

    def hasCapability(self, capability: TCapability | str) -> bool:
        return capability in self._capabilities

    @property
    def onPropertyChanged(self) -> Observable[SensorPropertyChangeData]:
        """Observable for property changes."""
        return self._property_changed_subject.as_observable()

    def _notifyListeners(
        self, property: str, value: Any, previousValue: Any, timestamp: int | None = None
    ) -> None:
        if not self._camera_id:
            return

        ts = timestamp or int(time.time() * 1000)
        if self._detailed_listeners:
            event: PropertyChangedEvent = {
                "cameraId": self._camera_id,
                "sensorId": self._id,
                "sensorType": self.type,
                "property": property,
                "value": value,
                "previousValue": previousValue,
                "timestamp": ts,
            }
            for detailed_listener in self._detailed_listeners:
                with contextlib.suppress(Exception):
                    detailed_listener(event)
        self._property_changed_subject.next({"property": property, "value": value, "timestamp": ts})

    @property
    def onCapabilitiesChanged(self) -> Observable[list[TCapability]]:
        """Observable for capability changes. Emits the full capabilities array when capabilities change."""
        return self._capabilities_changed_subject.as_observable()

    def _setCameraId(self, camera_id: str) -> None:
        self._camera_id = camera_id

    def _setPluginId(self, plugin_id: str) -> None:
        self._plugin_id = plugin_id

    def _init(self, update_fn: PropertyUpdateFn) -> None:
        self._update_fn = update_fn

    def _initCapabilities(self, update_fn: CapabilityUpdateFn) -> None:
        self._capabilities_change_fn = update_fn

    def _cleanup(self) -> None:
        # Trigger on_deassigned if we're still assigned — guarantees the hook
        # is paired 1:1 even when the sensor is force-removed without going
        # through a proper deassignment path.
        if self._is_assigned:
            self._is_assigned = False
            self._fire_lifecycle(False)

        self._update_fn = None
        self._capabilities_change_fn = None
        self._storage = None
        self._detailed_listeners.clear()
        self._property_changed_subject.complete()
        self._capabilities_changed_subject.complete()
        self._assignment_changed_subject.complete()

    def _getProperties(self) -> dict[str, Any]:
        return self._properties_store.copy()
