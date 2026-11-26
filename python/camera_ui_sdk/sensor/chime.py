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


class ChimeCapability(StrEnum):
    """Optional capabilities of a chime."""

    Volume = "volume"
    """Chime supports volume adjustment (0-100)."""
    Repeat = "repeat"
    """Chime can play its tone several times in a row."""


class ChimeProperty(StrEnum):
    """Property names of a chime."""

    Active = "active"
    """Whether the chime is playing."""
    Tone = "tone"
    """Tone the chime plays, one of the tones the device offers."""
    Volume = "volume"
    """Volume level (0-100)."""
    Repeat = "repeat"
    """How often the tone plays (1-10)."""


class ChimeControlProperties(TypedDict):
    """Property values of a chime."""

    active: bool
    tone: str
    volume: int
    repeat: int


class ChimePropertyChangeData(TypedDict):
    """Property change payload emitted on ChimeControlLike.onPropertyChanged."""

    property: str
    """Name of the changed property, a ChimeProperty value."""
    value: bool | str | int
    """New value of the property."""


TStorage = TypeVar("TStorage", bound=Mapping[str, Any], default=dict[str, Any])


@runtime_checkable
class ChimeControlLike(SensorLike, Protocol):
    """Read-only proxy interface for a chime."""

    @property
    def type(self) -> SensorType:
        return SensorType.Chime

    @property
    def onPropertyChanged(self) -> Observable[ChimePropertyChangeData]: ...

    @property
    def onCapabilitiesChanged(self) -> Observable[list[ChimeCapability]]: ...

    @overload
    def getValue(self, property: Literal[ChimeProperty.Active]) -> bool | None: ...
    @overload
    def getValue(self, property: Literal[ChimeProperty.Tone]) -> str | None: ...
    @overload
    def getValue(self, property: Literal[ChimeProperty.Volume, ChimeProperty.Repeat]) -> int | None: ...
    @overload
    def getValue(self, property: str) -> object | None: ...


#: Time after which a chime counts as done when the plugin does not report the end (ms).
CHIME_AUTO_RESET_MS = 10_000


class ChimeControl(Sensor[ChimeControlProperties, TStorage, ChimeCapability], Generic[TStorage]):
    """Chime control, such as a door chime or a speaker that plays ringtones.

    Offer the device's tones with ``setPropertySpec(ChimeProperty.Tone, {"choices": ...})``.
    Override ``play()`` to drive the hardware and ``await super().play()`` after it,
    call ``super().stop()`` when the device reports the end. Without that the chime
    counts as done after ``CHIME_AUTO_RESET_MS``.

    When the device refuses a command, raise from the override instead of calling
    ``super()``: the write fails for whoever sent it and the state stays as it was.
    """

    _requires_frames = False

    def __init__(
        self,
        name: str = "Chime",
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
        self._play_reset_timer: threading.Timer | None = None
        self._write_state(
            {
                ChimeProperty.Active.value: False,
                ChimeProperty.Tone.value: "",
                ChimeProperty.Volume.value: 100,
                ChimeProperty.Repeat.value: 1,
            }
        )

    @property
    def type(self) -> SensorType:
        return SensorType.Chime

    @property
    def category(self) -> SensorCategory:
        return SensorCategory.Control

    @property
    def active(self) -> bool:
        """Whether the chime is playing."""
        return bool(self.props.active)

    @property
    def tone(self) -> str:
        """Tone the chime plays, one of the tones the device offers."""
        return str(self.props.tone or "")

    @property
    def volume(self) -> int:
        """Volume level (0-100)."""
        return int(self.props.volume or 0)

    @property
    def repeat(self) -> int:
        """How often the tone plays (1-10)."""
        return int(self.props.repeat or 1)

    async def play(self) -> None:
        """Play the tone. Override to drive hardware and call
        `await super().play()` after success to sync the SDK state.

        Example:
            ```python
            await chime.play()
            ```
        """
        self._cancel_reset()
        self._write_state({ChimeProperty.Active.value: True})

        def _reset() -> None:
            self._play_reset_timer = None
            self._write_state({ChimeProperty.Active.value: False})

        self._play_reset_timer = threading.Timer(CHIME_AUTO_RESET_MS / 1000.0, _reset)
        self._play_reset_timer.daemon = True
        self._play_reset_timer.start()

    async def stop(self) -> None:
        """Stop playing. Override to drive hardware and call
        `await super().stop()` after success, or call it when the device reports the end.

        Example:
            ```python
            await chime.stop()
            ```
        """
        self._cancel_reset()
        self._write_state({ChimeProperty.Active.value: False})

    async def setTone(self, value: str) -> None:
        """Choose the tone. Override to drive hardware and call
        `await super().setTone(value)` after success.

        Args:
            value: One of the tones offered as choices.

        Example:
            ```python
            await chime.setTone("ding-dong")
            ```
        """
        self._write_state({ChimeProperty.Tone.value: value})

    async def setVolume(self, value: int) -> None:
        """Set volume. Override to drive hardware and call
        `await super().setVolume(value)` after success. The default implementation
        clamps the value to [0, 100].

        Args:
            value: Volume level in the range 0-100.

        Example:
            ```python
            await chime.setVolume(60)
            ```
        """
        self._write_state({ChimeProperty.Volume.value: max(0, min(100, value))})

    async def setRepeat(self, value: int) -> None:
        """Set how often the tone plays. Override to drive hardware and call
        `await super().setRepeat(value)` after success. Clamped to [1, 10].

        Args:
            value: Number of plays in the range 1-10.

        Example:
            ```python
            await chime.setRepeat(2)
            ```
        """
        self._write_state({ChimeProperty.Repeat.value: max(1, min(10, round(value)))})

    async def _apply_value(self, property: str, value: Any) -> None:
        """Routes generic property writes to the semantic setters."""
        if property == ChimeProperty.Active.value:
            if value:
                await self.play()
            else:
                await self.stop()
            return
        if property == ChimeProperty.Tone.value:
            await self.setTone(str(value))
            return
        if property == ChimeProperty.Volume.value:
            await self.setVolume(int(value))
            return
        if property == ChimeProperty.Repeat.value:
            await self.setRepeat(int(value))
            return

    def _cancel_reset(self) -> None:
        if self._play_reset_timer is not None:
            self._play_reset_timer.cancel()
            self._play_reset_timer = None

    def _cleanup(self) -> None:
        self._cancel_reset()
        super()._cleanup()
