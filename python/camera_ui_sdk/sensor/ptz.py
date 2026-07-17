from __future__ import annotations

from collections.abc import Mapping
from enum import StrEnum
from typing import Any, Generic, Literal, NotRequired, Protocol, overload, runtime_checkable

from typing_extensions import TypedDict, TypeVar

from ..observable import Observable
from .base import Sensor, SensorCategory, SensorLike, SensorType


class PTZCapability(StrEnum):
    """Optional capabilities for PTZ controls."""

    Pan = "pan"
    Tilt = "tilt"
    Zoom = "zoom"
    Presets = "presets"
    Home = "home"
    RelativeMove = "relativeMove"
    AbsolutePosition = "absolutePosition"
    VelocityControl = "velocityControl"


class PTZProperty(StrEnum):
    """Properties for PTZ controls."""

    Position = "position"
    Moving = "moving"
    Presets = "presets"
    Velocity = "velocity"
    TargetPreset = "targetPreset"
    RelativeMove = "relativeMove"
    Home = "home"


class PTZPosition(TypedDict):
    """Absolute PTZ position."""

    pan: float
    tilt: float
    zoom: float


class PTZDirection(TypedDict):
    """PTZ movement speed for continuous move commands.

    Speeds are in normalized range ``[-1, 1]`` where:

    - ``-1`` = maximum speed in negative direction
    - ``0`` = stop movement
    - ``1`` = maximum speed in positive direction

    Conventions: positive ``panSpeed`` = right, positive ``tiltSpeed`` = up,
    positive ``zoomSpeed`` = zoom in. Plugins should clamp values to ``[-1, 1]``
    and map them to hardware-specific speeds.
    """

    panSpeed: float
    tiltSpeed: float
    zoomSpeed: float


class PTZRelativeMove(TypedDict):
    """Relative displacement for a single PTZ move.

    Deltas are normalized to the camera's field of view: ``panDelta: 1`` moves
    the view by one full frame width, ``tiltDelta: 1`` by one full frame height.
    Conventions match :class:`PTZDirection`: positive ``panDelta`` = right,
    positive ``tiltDelta`` = up, positive ``zoomDelta`` = zoom in. Plugins map
    the deltas to hardware-specific translation spaces (e.g. ONVIF RelativeMove).
    """

    panDelta: float
    tiltDelta: float
    zoomDelta: float


class PTZControlProperties(TypedDict):
    """Property value map for PTZ controls."""

    position: PTZPosition
    moving: bool
    presets: list[str]
    velocity: NotRequired[PTZDirection | None]
    targetPreset: NotRequired[str | None]
    relativeMove: NotRequired[PTZRelativeMove | None]


class PTZPropertyChangeData(TypedDict):
    """Emitted on PTZControlLike.onPropertyChanged."""

    property: str  # PTZProperty value
    value: PTZPosition | bool | list[str] | PTZDirection | PTZRelativeMove | str | None


TStorage = TypeVar("TStorage", bound=Mapping[str, Any], default=dict[str, Any])


@runtime_checkable
class PTZControlLike(SensorLike, Protocol):
    """Read-only proxy interface for a PTZ control."""

    @property
    def type(self) -> SensorType:
        return SensorType.PTZ

    @overload
    def getValue(self, property: Literal[PTZProperty.Position]) -> PTZPosition | None: ...
    @overload
    def getValue(self, property: Literal[PTZProperty.Moving]) -> bool | None: ...
    @overload
    def getValue(self, property: Literal[PTZProperty.Presets]) -> list[str] | None: ...
    @overload
    def getValue(self, property: Literal[PTZProperty.Velocity]) -> PTZDirection | None: ...
    @overload
    def getValue(self, property: Literal[PTZProperty.TargetPreset]) -> str | None: ...
    @overload
    def getValue(self, property: Literal[PTZProperty.RelativeMove]) -> PTZRelativeMove | None: ...
    @overload
    def getValue(self, property: str) -> object | None: ...

    @property
    def onPropertyChanged(self) -> Observable[PTZPropertyChangeData]: ...

    @property
    def onCapabilitiesChanged(self) -> Observable[list[PTZCapability]]: ...


class PTZControl(Sensor[PTZControlProperties, TStorage, PTZCapability], Generic[TStorage]):
    """Pan-tilt-zoom camera control.

    Override `setPosition()` / `setVelocity()` / `setTargetPreset()` to drive
    hardware, then call the corresponding `super().X()` method after success to
    sync the SDK state. For hardware-pushed state updates (e.g. PTZ position
    change events), call the super methods from your event handler — that
    bypasses any plugin override and only syncs state.

    Set `capabilities` to advertise supported axes and features. Use
    `setPresets()` to publish the discovered preset list and `setMoving()` to
    publish movement state.
    """

    _requires_frames = False

    def __init__(self, name: str = "PTZ") -> None:
        super().__init__(name)
        self._write_state(
            {
                PTZProperty.Position.value: {"pan": 0, "tilt": 0, "zoom": 0},
                PTZProperty.Moving.value: False,
                PTZProperty.Presets.value: [],
            }
        )

    @property
    def type(self) -> SensorType:
        return SensorType.PTZ

    @property
    def category(self) -> SensorCategory:
        return SensorCategory.Control

    @property
    def position(self) -> PTZPosition:
        return self.props.position  # type: ignore[no-any-return]

    @property
    def moving(self) -> bool:
        return bool(self.props.moving)

    @property
    def presets(self) -> list[str]:
        return self.props.presets or []

    @property
    def velocity(self) -> PTZDirection | None:
        return self.props.velocity  # type: ignore[no-any-return]

    @property
    def targetPreset(self) -> str | None:
        return self.props.targetPreset  # type: ignore[no-any-return]

    async def setPosition(self, value: PTZPosition) -> None:
        """Move to an absolute pan/tilt/zoom position. Override to drive hardware
        and call `await super().setPosition(value)` after success to sync the SDK state.

        Args:
            value: Absolute pan/tilt/zoom target position.

        Example:
            ```python
            await ptz.setPosition({"pan": 0.25, "tilt": -0.1, "zoom": 0.5})
            ```
        """
        self._write_state({PTZProperty.Position.value: value})

    async def setVelocity(self, value: PTZDirection | None) -> None:
        """Continuous-move command. Override to drive hardware and call
        `await super().setVelocity(value)` after success to sync the SDK state.

        Args:
            value: Per-axis speeds in ``[-1, 1]``. Stop is zero on every axis.
                ``None`` is ignored and the published ``velocity`` keeps its
                last value.

        Example:
            ```python
            await ptz.setVelocity({"panSpeed": 0.5, "tiltSpeed": 0, "zoomSpeed": 0})
            await ptz.setVelocity({"panSpeed": 0, "tiltSpeed": 0, "zoomSpeed": 0})  # stop
            ```
        """
        self._write_state({PTZProperty.Velocity.value: value})

    async def setRelativeMove(self, value: PTZRelativeMove) -> None:
        """Relative displacement move. Override to drive hardware (e.g. ONVIF
        RelativeMove in a translation space) and call
        `await super().setRelativeMove(value)` after success to sync the SDK state.
        Advertise `PTZCapability.RelativeMove` when the camera supports it.

        Args:
            value: Per-axis displacement, normalized to the field of view.

        Example:
            ```python
            # move the view a third of a frame to the right, a tenth down
            await ptz.setRelativeMove({"panDelta": 0.33, "tiltDelta": -0.1, "zoomDelta": 0})
            ```
        """
        self._write_state({PTZProperty.RelativeMove.value: value})

    async def setTargetPreset(self, value: str | None) -> None:
        """Preset-move command. Override to drive hardware and call
        `await super().setTargetPreset(value)` after success to sync the SDK state.

        Args:
            value: Preset name to move to. ``None`` is ignored and the published
                ``targetPreset`` keeps its last value.

        Example:
            ```python
            await ptz.setTargetPreset("Driveway")
            ```
        """
        self._write_state({PTZProperty.TargetPreset.value: value})

    def setPresets(self, value: list[str]) -> None:
        """Publish the discovered preset list (typically called once at startup).

        Args:
            value: List of preset names supported by the camera.

        Example:
            ```python
            ptz.setPresets(["Home", "Driveway", "Backyard"])
            ```
        """
        self._write_state({PTZProperty.Presets.value: value})

    def setMoving(self, value: bool) -> None:
        """Publish movement state (e.g. when continuous-move starts/stops).

        Args:
            value: True while the camera is moving.

        Example:
            ```python
            ptz.setMoving(True)
            ```
        """
        self._write_state({PTZProperty.Moving.value: value})

    async def goHome(self) -> None:
        """Move the camera to the home position (pan=0, tilt=0, zoom=0).

        Example:
            ```python
            await ptz.goHome()
            ```
        """
        await self.setPosition({"pan": 0, "tilt": 0, "zoom": 0})

    async def updateValue(self, property: str, value: Any) -> None:
        """Routes generic property writes to semantic methods.

        `moving` and `presets` are observed/discovered state and not externally
        writable; only `Position`, `Velocity`, `TargetPreset`, `RelativeMove`
        and `Home` may be set.
        """
        if property == PTZProperty.Position.value:
            await self.setPosition(value)
            return
        if property == PTZProperty.Velocity.value:
            await self.setVelocity(value)
            return
        if property == PTZProperty.TargetPreset.value:
            await self.setTargetPreset(value)
            return
        if property == PTZProperty.RelativeMove.value:
            await self.setRelativeMove(value)
            return
        if property == PTZProperty.Home.value:
            await self.goHome()
            return
        # Unknown / non-writable property (incl. moving, presets) — ignored.
