from __future__ import annotations

import math
from collections.abc import Mapping
from enum import StrEnum
from typing import Any, Generic, Literal, Protocol, overload, runtime_checkable

from typing_extensions import TypedDict, TypeVar

from ..internal.shared_utils import round_percent
from ..observable import Observable
from .base import Sensor, SensorCategory, SensorLike, SensorType
from .device import DeviceInfo
from .property_spec import PropertySpecOverride


class HumidifierKind(StrEnum):
    """Whether the device adds or removes moisture, it decides how smart homes show it."""

    Humidifier = "humidifier"
    """Adds moisture to the air."""
    Dehumidifier = "dehumidifier"
    """Removes moisture from the air."""


class HumidifierAction(StrEnum):
    """What a humidifier does right now."""

    Off = "off"
    """Humidifier is off."""
    Idle = "idle"
    """Humidifier is on but not working right now."""
    Humidifying = "humidifying"
    """Humidifier adds moisture."""
    Drying = "drying"
    """Humidifier removes moisture."""


class HumidifierCapability(StrEnum):
    """Optional capabilities of a humidifier."""

    Humidity = "humidity"
    """Humidifier reports the humidity it measures."""
    Action = "action"
    """Humidifier reports whether it is working or idle."""
    Mode = "mode"
    """Humidifier offers modes such as eco or sleep."""


class HumidifierProperty(StrEnum):
    """Property names of a humidifier."""

    On = "on"
    """``True`` while the humidifier is on, a command when written."""
    TargetHumidity = "targetHumidity"
    """Target humidity in percent."""
    CurrentHumidity = "currentHumidity"
    """Measured humidity in percent."""
    Action = "action"
    """What the humidifier does right now, a ``HumidifierAction``."""
    Mode = "mode"
    """Active mode, one of the choices the plugin sets."""
    Kind = "kind"
    """Whether it humidifies or dehumidifies, a ``HumidifierKind``."""


class HumidifierControlProperties(TypedDict):
    """Property values of a humidifier."""

    on: bool
    targetHumidity: int
    currentHumidity: float | None
    action: str | None
    mode: str | None
    kind: str | None


class HumidifierPropertyChangeData(TypedDict):
    """Property change payload emitted on HumidifierControlLike.onPropertyChanged."""

    property: str
    """Name of the changed property, a HumidifierProperty value."""
    value: HumidifierAction | HumidifierKind | bool | float | str | None
    """New value of the property."""


TStorage = TypeVar("TStorage", bound=Mapping[str, Any], default=dict[str, Any])


@runtime_checkable
class HumidifierControlLike(SensorLike, Protocol):
    """Read-only proxy interface for a humidifier."""

    @property
    def type(self) -> SensorType:
        return SensorType.Humidifier

    @property
    def onPropertyChanged(self) -> Observable[HumidifierPropertyChangeData]: ...

    @property
    def onCapabilitiesChanged(self) -> Observable[list[HumidifierCapability]]: ...

    @overload
    def getValue(self, property: Literal[HumidifierProperty.On]) -> bool | None: ...
    @overload
    def getValue(self, property: Literal[HumidifierProperty.TargetHumidity]) -> int | None: ...
    @overload
    def getValue(self, property: Literal[HumidifierProperty.CurrentHumidity]) -> float | None: ...
    @overload
    def getValue(self, property: Literal[HumidifierProperty.Action]) -> HumidifierAction | None: ...
    @overload
    def getValue(self, property: Literal[HumidifierProperty.Mode]) -> str | None: ...
    @overload
    def getValue(self, property: Literal[HumidifierProperty.Kind]) -> HumidifierKind | None: ...
    @overload
    def getValue(self, property: str) -> object | None: ...


class HumidifierControl(
    Sensor[HumidifierControlProperties, TStorage, HumidifierCapability], Generic[TStorage]
):
    """A humidifier or dehumidifier that works toward a target humidity.
    Override ``setOn()``, ``setOff()``, ``setTargetHumidity()`` and
    ``setMode()`` to drive hardware and call the ``super()`` method after
    success to sync the SDK state. Report what the device measures and does
    with ``setCurrentHumidity()`` and ``setAction()``.

    ``setKind()`` says whether it humidifies or dehumidifies. The modes it
    offers come as choices:
    ``setPropertySpec(HumidifierProperty.Mode, {"choices": [...]})``.

    When the device refuses a command, raise from the override instead of calling
    ``super()``: the write fails for whoever sent it and the state stays as it was.
    """

    _requires_frames = False

    def __init__(
        self,
        name: str = "Humidifier",
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
        self._write_state(
            {
                HumidifierProperty.On.value: False,
                HumidifierProperty.TargetHumidity.value: 50,
            }
        )

    @property
    def type(self) -> SensorType:
        return SensorType.Humidifier

    @property
    def category(self) -> SensorCategory:
        return SensorCategory.Control

    @property
    def on(self) -> bool:
        """``True`` while the humidifier is on, a command when written."""
        return bool(self.props.on)

    @property
    def targetHumidity(self) -> int:
        """Target humidity in percent."""
        return int(self.props.targetHumidity or 0)

    @property
    def currentHumidity(self) -> float | None:
        """Measured humidity in percent."""
        return self.props.currentHumidity  # type: ignore[no-any-return]

    @property
    def action(self) -> HumidifierAction | None:
        """What the humidifier does right now, a ``HumidifierAction``."""
        value = self.props.action
        return HumidifierAction(value) if value is not None else None

    @property
    def mode(self) -> str | None:
        """Active mode, one of the choices the plugin sets."""
        return self.props.mode  # type: ignore[no-any-return]

    @property
    def kind(self) -> HumidifierKind | None:
        """Whether it humidifies or dehumidifies, a ``HumidifierKind``."""
        value = self.props.kind
        return HumidifierKind(value) if value is not None else None

    async def setOn(self) -> None:
        """Turn the humidifier on. Override to drive hardware and call
        ``await super().setOn()`` after success to sync the SDK state.

        Example:
            ```python
            await humidifier.setOn()
            ```
        """
        self._write_state({HumidifierProperty.On.value: True})

    async def setOff(self) -> None:
        """Turn the humidifier off. Override to drive hardware and call
        ``await super().setOff()`` after success to sync the SDK state.

        Example:
            ```python
            await humidifier.setOff()
            ```
        """
        self._write_state({HumidifierProperty.On.value: False})

    async def setTargetHumidity(self, value: float) -> None:
        """Set the target humidity. Override to drive hardware and call
        ``await super().setTargetHumidity(value)`` after success to sync the SDK state.

        Args:
            value: 0 to 100 percent.

        Example:
            ```python
            await humidifier.setTargetHumidity(45)
            ```
        """
        self._write_state({HumidifierProperty.TargetHumidity.value: round_percent(value)})

    async def setMode(self, value: str) -> None:
        """Set the mode. Override to drive hardware and call
        ``await super().setMode(value)`` after success to sync the SDK state.

        Args:
            value: One of the mode choices.

        Example:
            ```python
            await humidifier.setMode("sleep")
            ```
        """
        self._write_state({HumidifierProperty.Mode.value: value})

    def setCurrentHumidity(self, value: float) -> None:
        """Report the humidity the device measures.

        Args:
            value: 0 to 100 percent.

        Example:
            ```python
            humidifier.setCurrentHumidity(38)
            ```
        """
        if not math.isfinite(value):
            return
        self._write_state({HumidifierProperty.CurrentHumidity.value: max(0.0, min(100.0, value))})

    def setAction(self, value: HumidifierAction) -> None:
        """Report what the humidifier does right now.

        Args:
            value: Off, idle, humidifying or drying.

        Example:
            ```python
            humidifier.setAction(HumidifierAction.Humidifying)
            ```
        """
        self._write_state({HumidifierProperty.Action.value: HumidifierAction(value).value})

    def setKind(self, kind: HumidifierKind) -> None:
        """Say whether the device humidifies or dehumidifies. Smart homes show it
        by its kind, and Home Assistant takes it as the device class.

        Args:
            kind: Humidifier or dehumidifier.

        Example:
            ```python
            humidifier.setKind(HumidifierKind.Dehumidifier)
            ```
        """
        self._write_state({HumidifierProperty.Kind.value: kind.value})
        self.setPropertySpec(HumidifierProperty.Kind.value, {"values": [kind.value]})

    async def _apply_value(self, property: str, value: Any) -> None:
        """Routes generic property writes to the semantic setters."""
        if property == HumidifierProperty.On.value:
            if value:
                await self.setOn()
            else:
                await self.setOff()
        elif property == HumidifierProperty.TargetHumidity.value:
            await self.setTargetHumidity(float(value))
        elif property == HumidifierProperty.Mode.value:
            await self.setMode(str(value))
