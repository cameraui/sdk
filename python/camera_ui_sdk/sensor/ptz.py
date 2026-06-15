from __future__ import annotations

from collections.abc import Mapping
from enum import Enum
from typing import Any, Generic, Literal, NotRequired, Protocol, overload, runtime_checkable

from typing_extensions import TypedDict, TypeVar

from ..observable import Observable
from .base import Sensor, SensorCategory, SensorLike, SensorType


class PTZCapability(str, Enum):
    """Optional capabilities for PTZ controls."""

    Pan = "pan"
    Tilt = "tilt"
    Zoom = "zoom"
    Presets = "presets"
    Home = "home"


class PTZProperty(str, Enum):
    """Properties for PTZ controls."""

    Position = "position"
    Moving = "moving"
    Presets = "presets"
    Velocity = "velocity"
    TargetPreset = "targetPreset"


class PTZPosition(TypedDict):
    """Absolute PTZ position."""

    pan: float
    tilt: float
    zoom: float


class PTZDirection(TypedDict):
    """PTZ movement speed for continuous move commands."""

    panSpeed: float
    tiltSpeed: float
    zoomSpeed: float


class PTZControlProperties(TypedDict):
    """Property value map for PTZ controls."""

    position: PTZPosition
    moving: bool
    presets: list[str]
    velocity: NotRequired[PTZDirection | None]
    targetPreset: NotRequired[str | None]


class PTZPropertyChangeData(TypedDict):
    """Emitted on PTZControlLike.onPropertyChanged."""

    property: str  # PTZProperty value
    value: PTZPosition | bool | list[str] | PTZDirection | str | None


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
    def getValue(self, property: str) -> object | None: ...

    @property
    def onPropertyChanged(self) -> Observable[PTZPropertyChangeData]: ...

    @property
    def onCapabilitiesChanged(self) -> Observable[list[PTZCapability]]: ...


class PTZControl(Sensor[PTZControlProperties, TStorage, PTZCapability], Generic[TStorage]):
    """Pan-tilt-zoom camera control.

    Override `setPosition()` / `setVelocity()` / `setTargetPreset()` to drive
    hardware, then call the corresponding `super().X()` method after success to
    sync the SDK state. Use `setPresets()` to publish the discovered preset list
    and `setMoving()` to publish movement state.
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
        """
        self._write_state({PTZProperty.Position.value: value})

    async def setVelocity(self, value: PTZDirection | None) -> None:
        """Continuous-move command. Override to drive hardware and call
        `await super().setVelocity(value)` after success to sync the SDK state.
        """
        self._write_state({PTZProperty.Velocity.value: value})

    async def setTargetPreset(self, value: str | None) -> None:
        """Preset-move command. Override to drive hardware and call
        `await super().setTargetPreset(value)` after success to sync the SDK state.
        """
        self._write_state({PTZProperty.TargetPreset.value: value})

    def setPresets(self, value: list[str]) -> None:
        """Publish the discovered preset list (typically called once at startup)."""
        self._write_state({PTZProperty.Presets.value: value})

    def setMoving(self, value: bool) -> None:
        """Publish movement state (e.g. when continuous-move starts/stops)."""
        self._write_state({PTZProperty.Moving.value: value})

    async def goHome(self) -> None:
        """Move the camera to the home position (pan=0, tilt=0, zoom=0)."""
        await self.setPosition({"pan": 0, "tilt": 0, "zoom": 0})

    async def updateValue(self, property: str, value: Any) -> None:
        """Routes generic property writes to semantic methods.

        `moving` and `presets` are observed/discovered state and not externally
        writable; only `Position`, `Velocity`, and `TargetPreset` may be set.
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
        # Unknown / non-writable property (incl. moving, presets) — ignored.
