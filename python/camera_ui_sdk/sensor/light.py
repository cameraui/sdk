from __future__ import annotations

from collections.abc import Mapping
from enum import StrEnum
from typing import Any, Generic, Literal, Protocol, overload, runtime_checkable

from typing_extensions import TypedDict, TypeVar

from ..observable import Observable
from .base import Sensor, SensorCategory, SensorLike, SensorType
from .device import DeviceInfo
from .property_spec import PropertySpecOverride


class LightCapability(StrEnum):
    """Optional capabilities of a light control."""

    Brightness = "brightness"
    """Light supports brightness adjustment (0-100)."""
    ColorTemperature = "colorTemperature"
    """Light supports a white color temperature, in Kelvin."""
    Color = "color"
    """Light supports a color, as hue and saturation."""


class LightProperty(StrEnum):
    """Property names of a light control."""

    On = "on"
    """Whether the light is on."""
    Brightness = "brightness"
    """Brightness level (0-100)."""
    ColorTemperature = "colorTemperature"
    """White color temperature in Kelvin."""
    Color = "color"
    """Color as hue and saturation, see ``LightColor``."""
    ColorMode = "colorMode"
    """Whether the light shows its color temperature or its color, see ``LightColorMode``."""


class LightColorMode(StrEnum):
    """Which of its two color settings a light shows."""

    Temperature = "temperature"
    """The white color temperature."""
    Color = "color"
    """The color from hue and saturation."""


class LightColor(TypedDict):
    """Color of a light."""

    hue: float
    """Hue in degrees (0-360)."""
    saturation: float
    """Saturation in percent (0-100)."""


class LightControlProperties(TypedDict):
    """Property values of a light control."""

    on: bool
    brightness: int
    colorTemperature: int
    color: LightColor
    colorMode: LightColorMode


class LightPropertyChangeData(TypedDict):
    """Property change payload emitted on LightControlLike.onPropertyChanged."""

    property: str
    """Name of the changed property, a LightProperty value."""
    value: bool | int | LightColor | LightColorMode
    """New value of the property."""


TStorage = TypeVar("TStorage", bound=Mapping[str, Any], default=dict[str, Any])


@runtime_checkable
class LightControlLike(SensorLike, Protocol):
    """Read-only proxy interface for a light control."""

    @property
    def type(self) -> SensorType:
        return SensorType.Light

    @property
    def onPropertyChanged(self) -> Observable[LightPropertyChangeData]: ...

    @property
    def onCapabilitiesChanged(self) -> Observable[list[LightCapability]]: ...

    @overload
    def getValue(self, property: Literal[LightProperty.On]) -> bool | None: ...
    @overload
    def getValue(self, property: Literal[LightProperty.Brightness]) -> int | None: ...
    @overload
    def getValue(self, property: Literal[LightProperty.ColorTemperature]) -> int | None: ...
    @overload
    def getValue(self, property: Literal[LightProperty.Color]) -> LightColor | None: ...
    @overload
    def getValue(self, property: Literal[LightProperty.ColorMode]) -> LightColorMode | None: ...
    @overload
    def getValue(self, property: str) -> object | None: ...


class LightControl(Sensor[LightControlProperties, TStorage, LightCapability], Generic[TStorage]):
    """Light control sensor. Override ``setOn()``/``setOff()`` to drive your
    hardware, then ``await super().setOn()`` / ``await super().setOff()`` to
    sync the SDK state.

    Plugins with no hardware-action use case can leave the methods unoverridden,
    the base implementation just updates the state.

    For hardware-pushed updates (someone manually flipped the switch), call
    ``super().setOn()`` / ``super().setOff()`` from your event handler. That
    bypasses any plugin override and only syncs state.

    A light with ``LightCapability.ColorTemperature`` or ``LightCapability.Color``
    overrides ``setColorTemperature()`` and ``setColor()`` the same way. A
    command switches the color mode to the setting it changed. When the device
    reports its state, sync both settings and call ``setColorMode()`` with the
    one it shows.

    When the device refuses a command, raise from the override instead of calling
    ``super()``: the write fails for whoever sent it and the state stays as it was.
    """

    _requires_frames = False

    def __init__(
        self,
        name: str = "Light",
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
                LightProperty.On.value: False,
                LightProperty.Brightness.value: 100,
                LightProperty.ColorTemperature.value: 2700,
                LightProperty.Color.value: {"hue": 0, "saturation": 0},
                LightProperty.ColorMode.value: LightColorMode.Temperature.value,
            }
        )

    @property
    def type(self) -> SensorType:
        return SensorType.Light

    @property
    def category(self) -> SensorCategory:
        return SensorCategory.Control

    @property
    def on(self) -> bool:
        """Whether the light is on."""
        return bool(self.props.on)

    @property
    def brightness(self) -> int:
        """Brightness level (0-100)."""
        value = self.props.brightness
        return int(value) if value is not None else 0

    @property
    def colorTemperature(self) -> int:
        """White color temperature in Kelvin."""
        return int(self.props.colorTemperature)

    @property
    def color(self) -> LightColor:
        """Color as hue and saturation, see ``LightColor``."""
        return self.props.color  # type: ignore[no-any-return]

    @property
    def colorMode(self) -> LightColorMode:
        """Whether the light shows its color temperature or its color, see ``LightColorMode``."""
        return LightColorMode(self.props.colorMode)

    async def setOn(self) -> None:
        """Turn the light on. Override to drive hardware and call
        ``await super().setOn()`` after the hardware call succeeds to sync the
        SDK state.

        Example:
            ```python
            await light.setOn()
            ```
        """
        self._write_state({LightProperty.On.value: True})

    async def setOff(self) -> None:
        """Turn the light off. Override to drive hardware and call
        ``await super().setOff()`` after the hardware call succeeds to sync the
        SDK state.

        Example:
            ```python
            await light.setOff()
            ```
        """
        self._write_state({LightProperty.On.value: False})

    async def setBrightness(self, value: int) -> None:
        """Set brightness. Override to drive hardware and call
        ``await super().setBrightness(value)`` after the hardware call
        succeeds. The default implementation clamps the value to [0, 100].

        Args:
            value: Brightness level in the range 0-100.

        Example:
            ```python
            await light.setBrightness(75)
            ```
        """
        self._write_state({LightProperty.Brightness.value: max(0, min(100, value))})

    async def setColorTemperature(self, kelvin: int) -> None:
        """Set the white color temperature. Override to drive hardware and call
        ``await super().setColorTemperature(kelvin)`` after the hardware call
        succeeds. The default implementation rounds the value and clamps it to
        1000-10000 K.

        Args:
            kelvin: Color temperature in Kelvin.

        Example:
            ```python
            await light.setColorTemperature(2700)
            ```
        """
        self._write_state({LightProperty.ColorTemperature.value: round(max(1000, min(10000, kelvin)))})

    async def setColor(self, hue: float, saturation: float) -> None:
        """Set the color. Override to drive hardware and call
        ``await super().setColor(hue, saturation)`` after the hardware call
        succeeds. The default implementation clamps hue to 0-360 and saturation
        to 0-100.

        Args:
            hue: Hue in degrees (0-360).
            saturation: Saturation in percent (0-100).

        Example:
            ```python
            await light.setColor(240, 100)
            ```
        """
        self._write_state(
            {
                LightProperty.Color.value: {
                    "hue": max(0, min(360, hue)),
                    "saturation": max(0, min(100, saturation)),
                }
            }
        )

    def setColorMode(self, mode: LightColorMode) -> None:
        """Report which of its two color settings the light shows.

        Args:
            mode: The color temperature or the color.

        Example:
            ```python
            light.setColorMode(LightColorMode.Color)
            ```
        """
        self._write_state({LightProperty.ColorMode.value: LightColorMode(mode).value})

    async def _apply_value(self, property: str, value: Any) -> None:
        """Routes generic property writes to the semantic setters."""
        if property == LightProperty.On.value:
            if value:
                await self.setOn()
            else:
                await self.setOff()
            return
        if property == LightProperty.Brightness.value:
            await self.setBrightness(int(value))
            return
        if property == LightProperty.ColorTemperature.value:
            await self.setColorTemperature(int(value))
            self.setColorMode(LightColorMode.Temperature)
            return
        if property == LightProperty.Color.value:
            await self.setColor(float(value["hue"]), float(value["saturation"]))
            self.setColorMode(LightColorMode.Color)
            return
