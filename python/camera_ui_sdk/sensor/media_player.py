from __future__ import annotations

import math
from collections.abc import Mapping
from enum import StrEnum
from typing import Any, Generic, Literal, Protocol, overload, runtime_checkable

from typing_extensions import TypedDict, TypeVar

from ..internal.shared_utils import round_percent
from ..observable import Observable
from .base import SensorLike, SensorType
from .command import CommandControl
from .device import DeviceInfo
from .property_spec import PropertySpecOverride


class MediaPlayerState(StrEnum):
    """What a media player does right now."""

    Off = "off"
    """Player is off or in standby."""
    On = "on"
    """On, without telling what it does."""
    Idle = "idle"
    """Player is on and plays nothing."""
    Playing = "playing"
    """Player is playing."""
    Paused = "paused"
    """Playback is paused."""
    Buffering = "buffering"
    """Player is loading and about to play."""


class MediaPlayerKind(StrEnum):
    """What kind of device a media player is."""

    Tv = "tv"
    """A TV."""
    Speaker = "speaker"
    """A speaker."""
    Receiver = "receiver"
    """An AV receiver."""
    Projector = "projector"
    """A projector."""


class MediaPlayerCommand(StrEnum):
    """Commands a media player takes."""

    Play = "play"
    """Start or resume playback."""
    Pause = "pause"
    """Pause playback."""
    Stop = "stop"
    """Stop playback."""
    Next = "next"
    """Skip to the next track or channel."""
    Previous = "previous"
    """Go back to the previous track or channel."""


class MediaPlayerCapability(StrEnum):
    """Optional capabilities of a media player."""

    Power = "power"
    """Player turns on and off."""
    Volume = "volume"
    """Player sets its volume."""
    Mute = "mute"
    """Player mutes."""
    Source = "source"
    """Player switches between inputs or apps."""
    NowPlaying = "nowPlaying"
    """Player reports the title and artist it plays."""


class MediaPlayerProperty(StrEnum):
    """Property names of a media player."""

    On = "on"
    """Whether the player is on, writable with the ``power`` capability."""
    State = "state"
    """What the player does right now, a ``MediaPlayerState``."""
    Kind = "kind"
    """What kind of device it is, a ``MediaPlayerKind``."""
    Command = "command"
    """One-off ``MediaPlayerCommand`` when written, empty again right after."""
    Volume = "volume"
    """Volume, 0 to 100."""
    Muted = "muted"
    """Whether the sound is muted."""
    Source = "source"
    """Selected input or app, one of the choices the plugin sets."""
    Title = "title"
    """Title of what plays."""
    Artist = "artist"
    """Artist of what plays."""


class MediaPlayerControlProperties(TypedDict):
    """Property values of a media player."""

    on: bool
    state: str | None
    kind: str | None
    command: str
    volume: int | None
    muted: bool
    source: str | None
    title: str | None
    artist: str | None


class MediaPlayerPropertyChangeData(TypedDict):
    """Property change payload emitted on MediaPlayerControlLike.onPropertyChanged."""

    property: str
    """Name of the changed property, a MediaPlayerProperty value."""
    value: MediaPlayerState | MediaPlayerKind | MediaPlayerCommand | bool | int | str | None
    """New value of the property."""


TStorage = TypeVar("TStorage", bound=Mapping[str, Any], default=dict[str, Any])


@runtime_checkable
class MediaPlayerControlLike(SensorLike, Protocol):
    """Read-only proxy interface for a media player."""

    @property
    def type(self) -> SensorType:
        return SensorType.MediaPlayer

    @property
    def onPropertyChanged(self) -> Observable[MediaPlayerPropertyChangeData]: ...

    @property
    def onCapabilitiesChanged(self) -> Observable[list[MediaPlayerCapability]]: ...

    @overload
    def getValue(self, property: Literal[MediaPlayerProperty.On]) -> bool | None: ...
    @overload
    def getValue(self, property: Literal[MediaPlayerProperty.State]) -> MediaPlayerState | None: ...
    @overload
    def getValue(self, property: Literal[MediaPlayerProperty.Kind]) -> MediaPlayerKind | None: ...
    @overload
    def getValue(self, property: Literal[MediaPlayerProperty.Command]) -> MediaPlayerCommand | str | None: ...
    @overload
    def getValue(self, property: Literal[MediaPlayerProperty.Volume]) -> int | None: ...
    @overload
    def getValue(self, property: Literal[MediaPlayerProperty.Muted]) -> bool | None: ...
    @overload
    def getValue(self, property: Literal[MediaPlayerProperty.Source]) -> str | None: ...
    @overload
    def getValue(self, property: Literal[MediaPlayerProperty.Title]) -> str | None: ...
    @overload
    def getValue(self, property: Literal[MediaPlayerProperty.Artist]) -> str | None: ...
    @overload
    def getValue(self, property: str) -> object | None: ...


class MediaPlayerControl(
    CommandControl[MediaPlayerControlProperties, TStorage, MediaPlayerCapability], Generic[TStorage]
):
    """A TV, speaker, receiver or projector. Override ``setOn()``, ``setOff()``,
    ``play()``, ``pause()``, ``stop()``, ``next()``, ``previous()``,
    ``setVolume()``, ``setMuted()`` and ``setSource()`` to drive hardware and
    call the ``super()`` method after success. Report what the player does with
    ``setState()`` and what plays with ``setNowPlaying()``.

    ``setKind()`` says what kind of device it is. Narrow the commands to those
    the player takes with
    ``setPropertySpec(MediaPlayerProperty.Command, {"values": [...]})``. The
    inputs come as choices with the ``source`` capability:
    ``setPropertySpec(MediaPlayerProperty.Source, {"choices": [...]})``.

    When the device refuses a command, raise from the override instead of calling
    ``super()``: the write fails for whoever sent it and the state stays as it was.
    """

    def __init__(
        self,
        name: str = "Media Player",
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
        self._write_state({MediaPlayerProperty.On.value: False, MediaPlayerProperty.Muted.value: False})

    @property
    def type(self) -> SensorType:
        return SensorType.MediaPlayer

    @property
    def on(self) -> bool:
        """Whether the player is on, writable with the ``power`` capability."""
        return bool(self.props.on)

    @property
    def state(self) -> MediaPlayerState | None:
        """What the player does right now, a ``MediaPlayerState``."""
        value = self.props.state
        return MediaPlayerState(value) if value is not None else None

    @property
    def kind(self) -> MediaPlayerKind | None:
        """What kind of device it is, a ``MediaPlayerKind``."""
        value = self.props.kind
        return MediaPlayerKind(value) if value is not None else None

    @property
    def volume(self) -> int | None:
        """Volume, 0 to 100."""
        return self.props.volume  # type: ignore[no-any-return]

    @property
    def muted(self) -> bool:
        """Whether the sound is muted."""
        return bool(self.props.muted)

    @property
    def source(self) -> str | None:
        """Selected input or app, one of the choices the plugin sets."""
        return self.props.source  # type: ignore[no-any-return]

    @property
    def title(self) -> str | None:
        """Title of what plays."""
        return self.props.title  # type: ignore[no-any-return]

    @property
    def artist(self) -> str | None:
        """Artist of what plays."""
        return self.props.artist  # type: ignore[no-any-return]

    async def setOn(self) -> None:
        """Turn the player on. Override to drive hardware and call
        ``await super().setOn()`` after success.

        Example:
            ```python
            await player.setOn()
            ```
        """
        self._write_state({MediaPlayerProperty.On.value: True})

    async def setOff(self) -> None:
        """Turn the player off. Override to drive hardware and call
        ``await super().setOff()`` after success.

        Example:
            ```python
            await player.setOff()
            ```
        """
        self._write_state({MediaPlayerProperty.On.value: False})

    async def play(self) -> None:
        """Start or resume playback. Override to drive hardware and call
        ``await super().play()`` after success.

        Example:
            ```python
            await player.play()
            ```
        """
        self._sent(MediaPlayerCommand.Play.value)

    async def pause(self) -> None:
        """Pause playback. Override to drive hardware and call ``await super().pause()``
        after success.

        Example:
            ```python
            await player.pause()
            ```
        """
        self._sent(MediaPlayerCommand.Pause.value)

    async def stop(self) -> None:
        """Stop playback. Override to drive hardware and call ``await super().stop()``
        after success.

        Example:
            ```python
            await player.stop()
            ```
        """
        self._sent(MediaPlayerCommand.Stop.value)

    async def next(self) -> None:
        """Skip to the next track or channel. Override to drive hardware and call
        ``await super().next()`` after success.

        Example:
            ```python
            await player.next()
            ```
        """
        self._sent(MediaPlayerCommand.Next.value)

    async def previous(self) -> None:
        """Go back to the previous track or channel. Override to drive hardware and
        call ``await super().previous()`` after success.

        Example:
            ```python
            await player.previous()
            ```
        """
        self._sent(MediaPlayerCommand.Previous.value)

    async def setVolume(self, volume: float) -> None:
        """Set the volume. Override to drive hardware and call
        ``await super().setVolume(volume)`` after success to sync the SDK state.

        Args:
            volume: 0 to 100, clamped and rounded.

        Example:
            ```python
            await player.setVolume(30)
            ```
        """
        if not math.isfinite(volume):
            return
        self._write_state({MediaPlayerProperty.Volume.value: round_percent(volume)})

    async def setMuted(self, muted: bool) -> None:
        """Mute or unmute the sound. Override to drive hardware and call
        ``await super().setMuted(muted)`` after success.

        Args:
            muted: Whether the sound is muted.

        Example:
            ```python
            await player.setMuted(True)
            ```
        """
        self._write_state({MediaPlayerProperty.Muted.value: muted})

    async def setSource(self, value: str) -> None:
        """Switch to another input or app. Override to drive hardware and call
        ``await super().setSource(value)`` after success.

        Args:
            value: One of the source choices.

        Example:
            ```python
            await player.setSource("hdmi1")
            ```
        """
        self._write_state({MediaPlayerProperty.Source.value: value})

    def setState(self, value: MediaPlayerState) -> None:
        """Report what the player does right now. ``on`` follows: everything but
        ``off`` counts as on.

        Args:
            value: Off, on, idle, playing, paused or buffering.

        Example:
            ```python
            player.setState(MediaPlayerState.Playing)
            ```
        """
        state = MediaPlayerState(value)
        self._write_state(
            {
                MediaPlayerProperty.State.value: state.value,
                MediaPlayerProperty.On.value: state != MediaPlayerState.Off,
            }
        )

    def setKind(self, kind: MediaPlayerKind) -> None:
        """Say what kind of device the player is. Smart homes show it by its kind,
        and Home Assistant takes it as the device class.

        Args:
            kind: TV, speaker, receiver or projector.

        Example:
            ```python
            player.setKind(MediaPlayerKind.Speaker)
            ```
        """
        self._write_state({MediaPlayerProperty.Kind.value: kind.value})
        self.setPropertySpec(MediaPlayerProperty.Kind.value, {"values": [kind.value]})

    def setNowPlaying(self, title: str | None = None, artist: str | None = None) -> None:
        """Report what plays, needs the ``nowPlaying`` capability. Leave both out
        when nothing plays.

        Args:
            title: Title of the track, show or channel.
            artist: Artist of the track.

        Example:
            ```python
            player.setNowPlaying("So What", "Miles Davis")
            ```
        """
        self._write_state(
            {MediaPlayerProperty.Title.value: title or "", MediaPlayerProperty.Artist.value: artist or ""}
        )

    def _is_command(self, property: str) -> bool:
        return property == MediaPlayerProperty.Command.value

    async def _apply_value(self, property: str, value: Any) -> None:
        """Routes generic property writes to the semantic setters."""
        if property == MediaPlayerProperty.On.value:
            if value:
                await self.setOn()
            else:
                await self.setOff()
        elif property == MediaPlayerProperty.Volume.value:
            await self.setVolume(float(value))
        elif property == MediaPlayerProperty.Muted.value:
            await self.setMuted(bool(value))
        elif property == MediaPlayerProperty.Source.value:
            await self.setSource(str(value))
        if property != MediaPlayerProperty.Command.value:
            return
        if value == MediaPlayerCommand.Play:
            await self.play()
        elif value == MediaPlayerCommand.Pause:
            await self.pause()
        elif value == MediaPlayerCommand.Stop:
            await self.stop()
        elif value == MediaPlayerCommand.Next:
            await self.next()
        elif value == MediaPlayerCommand.Previous:
            await self.previous()
