from __future__ import annotations

import threading
from collections.abc import Mapping, Sequence
from enum import StrEnum
from typing import Any, Generic, Literal, Protocol, overload, runtime_checkable

from typing_extensions import TypedDict, TypeVar

from ..observable import Observable
from .base import Sensor, SensorCategory, SensorLike, SensorType
from .device import DeviceInfo
from .property_spec import PropertySpecOverride


class ButtonProperty(StrEnum):
    """Property names of a button."""

    Press = "press"
    """Kind of the press in progress, empty between presses."""
    Index = "index"
    """Position of the button on its device, from 1. 0 leaves the order to the creation order."""


class ButtonPress(StrEnum):
    """How a button was pressed."""

    Single = "single"
    """One short press."""
    Double = "double"
    """Two short presses in a row."""
    Long = "long"
    """A press held down."""


class ButtonTriggerProperties(TypedDict):
    """Property values of a button."""

    press: str
    index: int


class ButtonPropertyChangeData(TypedDict):
    """Property change payload emitted on ButtonTriggerLike.onPropertyChanged."""

    property: str
    """Name of the changed property, a ButtonProperty value."""
    value: str | int
    """New value of the property."""


TStorage = TypeVar("TStorage", bound=Mapping[str, Any], default=dict[str, Any])


@runtime_checkable
class ButtonTriggerLike(SensorLike, Protocol):
    """Read-only proxy interface for a button."""

    @property
    def type(self) -> SensorType:
        return SensorType.Button

    @property
    def onPropertyChanged(self) -> Observable[ButtonPropertyChangeData]: ...

    @overload
    def getValue(self, property: Literal[ButtonProperty.Press]) -> str | None: ...
    @overload
    def getValue(self, property: Literal[ButtonProperty.Index]) -> int | None: ...
    @overload
    def getValue(self, property: str) -> object | None: ...


#: Time a press stays set before the button is idle again (ms).
PRESS_AUTO_RESET_MS = 2000


class ButtonTrigger(Sensor[ButtonTriggerProperties, TStorage, str], Generic[TStorage]):
    """A physical button, such as one on a remote or a wall switch.

    Call ``press()`` when the device reports a press: ``press`` is set to its
    kind and goes back to empty after ``PRESS_AUTO_RESET_MS``. A single press is
    always offered, double and long presses only when passed as ``presses``.
    """

    _requires_frames = False

    def __init__(
        self,
        name: str = "Button",
        *,
        index: int = 0,
        presses: Sequence[ButtonPress] | None = None,
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
        self._presses: tuple[ButtonPress, ...] = tuple(dict.fromkeys([ButtonPress.Single, *(presses or [])]))
        self._press_reset_timer: threading.Timer | None = None
        self.setPropertySpec(ButtonProperty.Press.value, {"values": [kind.value for kind in self._presses]})
        self._write_state({ButtonProperty.Press.value: "", ButtonProperty.Index.value: index})

    @property
    def type(self) -> SensorType:
        return SensorType.Button

    @property
    def category(self) -> SensorCategory:
        return SensorCategory.Trigger

    @property
    def pressed(self) -> str:
        """Kind of the press in progress, empty between presses."""
        return str(self.props.press or "")

    @property
    def index(self) -> int:
        """Position of the button on its device, 0 when not set."""
        return int(self.props.index or 0)

    def press(self, kind: ButtonPress = ButtonPress.Single) -> None:
        """Report a press. A press while the last one is still set counts as a new one.

        Args:
            kind: How the button was pressed, a single press by default.

        Raises:
            ValueError: When the button does not offer this kind of press.

        Example:
            ```python
            button.press(ButtonPress.Double)
            ```
        """
        if kind not in self._presses:
            raise ValueError(f'Button "{self.name}" does not offer a {kind} press')

        if self._press_reset_timer is not None:
            self._press_reset_timer.cancel()
        if self.props.press:
            self._write_state({ButtonProperty.Press.value: ""})
        self._write_state({ButtonProperty.Press.value: kind.value})

        def _reset() -> None:
            self._press_reset_timer = None
            self._write_state({ButtonProperty.Press.value: ""})

        self._press_reset_timer = threading.Timer(PRESS_AUTO_RESET_MS / 1000.0, _reset)
        self._press_reset_timer.daemon = True
        self._press_reset_timer.start()

    def _cleanup(self) -> None:
        if self._press_reset_timer is not None:
            self._press_reset_timer.cancel()
            self._press_reset_timer = None
        super()._cleanup()
