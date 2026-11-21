from __future__ import annotations

from collections.abc import Mapping
from enum import StrEnum
from typing import Any, Generic, Literal, Protocol, overload, runtime_checkable

from typing_extensions import TypedDict, TypeVar

from ..observable import Observable
from .base import Sensor, SensorCategory, SensorLike, SensorType
from .device import DeviceInfo
from .property_spec import PropertySpecOverride


class DisplayCapability(StrEnum):
    """Optional capabilities of a display."""

    Presets = "presets"
    """Display offers preset messages, listed as choices of ``DisplayProperty.Preset``."""
    Duration = "duration"
    """Display shows a message for a set time."""


class DisplayProperty(StrEnum):
    """Property names of a display."""

    Message = "message"
    """Text on the display, empty when none is shown."""
    Preset = "preset"
    """Preset message on the display, empty when none is shown."""
    Duration = "duration"
    """Seconds a new message stays on the display, 0 until it is cleared."""


class DisplayControlProperties(TypedDict):
    """Property values of a display."""

    message: str
    preset: str
    duration: int


class DisplayPropertyChangeData(TypedDict):
    """Property change payload emitted on DisplayControlLike.onPropertyChanged."""

    property: str
    """Name of the changed property, a DisplayProperty value."""
    value: str | int
    """New value of the property."""


TStorage = TypeVar("TStorage", bound=Mapping[str, Any], default=dict[str, Any])


@runtime_checkable
class DisplayControlLike(SensorLike, Protocol):
    """Read-only proxy interface for a display."""

    @property
    def type(self) -> SensorType:
        return SensorType.Display

    @property
    def onPropertyChanged(self) -> Observable[DisplayPropertyChangeData]: ...

    @property
    def onCapabilitiesChanged(self) -> Observable[list[DisplayCapability]]: ...

    @overload
    def getValue(self, property: Literal[DisplayProperty.Message, DisplayProperty.Preset]) -> str | None: ...
    @overload
    def getValue(self, property: Literal[DisplayProperty.Duration]) -> int | None: ...
    @overload
    def getValue(self, property: str) -> object | None: ...


class DisplayControl(Sensor[DisplayControlProperties, TStorage, DisplayCapability], Generic[TStorage]):
    """Text display on a device, such as the screen of a doorbell.

    Set the longest text with ``setPropertySpec(DisplayProperty.Message, {"maxLength": ...})``
    and the presets with ``setPropertySpec(DisplayProperty.Preset, {"choices": ...})``.
    Override ``setMessage()`` and ``setPreset()`` to drive the hardware and call the
    ``super()`` method after success.
    """

    _requires_frames = False

    def __init__(
        self,
        name: str = "Display",
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
                DisplayProperty.Message.value: "",
                DisplayProperty.Preset.value: "",
                DisplayProperty.Duration.value: 0,
            }
        )

    @property
    def type(self) -> SensorType:
        return SensorType.Display

    @property
    def category(self) -> SensorCategory:
        return SensorCategory.Control

    @property
    def message(self) -> str:
        """Text on the display, empty when none is shown."""
        return str(self.props.message or "")

    @property
    def preset(self) -> str:
        """Preset message on the display, empty when none is shown."""
        return str(self.props.preset or "")

    @property
    def duration(self) -> int:
        """Seconds a new message stays on the display, 0 until it is cleared."""
        return int(self.props.duration or 0)

    async def setMessage(self, value: str) -> None:
        """Show a text, an empty one clears the display. Override to drive hardware
        and call `await super().setMessage(value)` after success.

        Args:
            value: The text to show.

        Example:
            ```python
            await display.setMessage("Back in 5 minutes")
            ```
        """
        self._write_state({DisplayProperty.Message.value: value, DisplayProperty.Preset.value: ""})

    async def setPreset(self, value: str) -> None:
        """Show a preset message, an empty one clears the display. Override to drive
        hardware and call `await super().setPreset(value)` after success.

        Args:
            value: One of the presets offered as choices.

        Example:
            ```python
            await display.setPreset("LEAVE_PACKAGE_AT_DOOR")
            ```
        """
        self._write_state({DisplayProperty.Preset.value: value, DisplayProperty.Message.value: ""})

    async def setDuration(self, value: int) -> None:
        """Set how long a new message stays on the display. Override to drive
        hardware and call `await super().setDuration(value)` after success.

        Args:
            value: Seconds, 0 keeps the message until it is cleared.

        Example:
            ```python
            await display.setDuration(60)
            ```
        """
        self._write_state({DisplayProperty.Duration.value: max(0, round(value))})

    async def updateValue(self, property: str, value: Any) -> None:
        """Routes generic property writes to the semantic setters."""
        if property == DisplayProperty.Message.value:
            await self.setMessage(str(value or ""))
            return
        if property == DisplayProperty.Preset.value:
            await self.setPreset(str(value or ""))
            return
        if property == DisplayProperty.Duration.value:
            await self.setDuration(int(value))
            return
