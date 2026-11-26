from __future__ import annotations

import threading
from collections.abc import Mapping
from enum import StrEnum
from typing import Any, Generic, Literal, Protocol, overload, runtime_checkable

from typing_extensions import TypedDict, TypeVar

from ..observable import Observable
from .base import Sensor, SensorCategory, SensorLike, SensorType
from .device import DeviceInfo
from .property_spec import PropertySpecOverride


class SceneProperty(StrEnum):
    """Property names of a scene."""

    Active = "active"
    """``True`` for a moment while the scene runs, a command when written ``True``."""


class SceneControlProperties(TypedDict):
    """Property values of a scene."""

    active: bool


class ScenePropertyChangeData(TypedDict):
    """Property change payload emitted on SceneControlLike.onPropertyChanged."""

    property: str
    """Name of the changed property, a SceneProperty value."""
    value: bool
    """New value of the property."""


TStorage = TypeVar("TStorage", bound=Mapping[str, Any], default=dict[str, Any])


@runtime_checkable
class SceneControlLike(SensorLike, Protocol):
    """Read-only proxy interface for a scene."""

    @property
    def type(self) -> SensorType:
        return SensorType.Scene

    @property
    def onPropertyChanged(self) -> Observable[ScenePropertyChangeData]: ...

    @overload
    def getValue(self, property: Literal[SceneProperty.Active]) -> bool | None: ...
    @overload
    def getValue(self, property: str) -> object | None: ...


#: How long ``active`` reads ``True`` after a scene ran (ms).
SCENE_AUTO_RESET_MS = 1000


class SceneControl(Sensor[SceneControlProperties, TStorage, str], Generic[TStorage]):
    """A scene or script that runs on command and has no state of its own.
    Override ``activate()`` to run it on the device and call
    ``await super().activate()`` after success, which sets ``active`` for a
    moment (``SCENE_AUTO_RESET_MS``).

    When the device refuses a command, raise from the override instead of calling
    ``super()``: the write fails for whoever sent it and the state stays as it was.
    """

    _requires_frames = False

    def __init__(
        self,
        name: str = "Scene",
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
        self._active_reset_timer: threading.Timer | None = None
        self._write_state({SceneProperty.Active.value: False})

    @property
    def type(self) -> SensorType:
        return SensorType.Scene

    @property
    def category(self) -> SensorCategory:
        return SensorCategory.Control

    @property
    def active(self) -> bool:
        """``True`` for a moment after the scene ran."""
        return bool(self.props.active)

    async def activate(self) -> None:
        """Run the scene. Override to drive hardware and call
        ``await super().activate()`` after success. The ``active`` property reads
        ``True`` for a moment and then ``False`` again, so the next command
        arrives the same way.

        Example:
            ```python
            await scene.activate()
            ```
        """
        self._cancel_reset()
        self._write_state({SceneProperty.Active.value: True})

        def _reset() -> None:
            self._active_reset_timer = None
            self._write_state({SceneProperty.Active.value: False})

        self._active_reset_timer = threading.Timer(SCENE_AUTO_RESET_MS / 1000.0, _reset)
        self._active_reset_timer.daemon = True
        self._active_reset_timer.start()

    async def _apply_value(self, property: str, value: Any) -> None:
        """Routes generic property writes to the semantic setters.

        Writing active=false is ignored, the reset timer owns the off transition.
        """
        if property == SceneProperty.Active.value and value:
            await self.activate()

    def _cancel_reset(self) -> None:
        if self._active_reset_timer is not None:
            self._active_reset_timer.cancel()
            self._active_reset_timer = None

    def _cleanup(self) -> None:
        self._cancel_reset()
        super()._cleanup()
