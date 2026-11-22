from __future__ import annotations

import threading
from collections.abc import Mapping
from typing import Any, Generic

from typing_extensions import TypedDict, TypeVar

from .base import Sensor, SensorCategory
from .device import DeviceInfo
from .property_spec import PropertySpecOverride

#: How long a sent command stays in ``command`` before it reads empty again (ms).
COMMAND_AUTO_RESET_MS = 1000


class RobotControlProperties(TypedDict):
    """Property values every robot carries."""

    activity: str | None
    """What the robot does right now."""
    command: str
    """The command sent last, empty again right after."""


TProperties = TypeVar("TProperties", bound=Mapping[str, Any], default=RobotControlProperties)
TStorage = TypeVar("TStorage", bound=Mapping[str, Any], default=dict[str, Any])
TCapability = TypeVar("TCapability", bound=str, default=str)


class RobotControl(Sensor[TProperties, TStorage, TCapability], Generic[TProperties, TStorage, TCapability]):
    """Base of the robots that run on their own and take one-off commands, such as a
    vacuum or a lawn mower. A command reads in ``command`` for a moment
    (``COMMAND_AUTO_RESET_MS``) and then empty again, so the history records
    each one and the next arrives the same way.
    """

    _requires_frames = False

    def __init__(
        self,
        name: str,
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
        self._command_reset_timer: threading.Timer | None = None
        self._write_state({"command": ""})

    @property
    def category(self) -> SensorCategory:
        return SensorCategory.Control

    @property
    def activity(self) -> str | None:
        """What the robot does right now."""
        return self.props.activity

    def setActivity(self, value: str) -> None:
        """Report what the robot does right now.

        Args:
            value: One of the type's activities.

        Example:
            ```python
            robot.setActivity("docked")
            ```
        """
        self._write_state({"activity": str(value)})

    def _sent(self, value: str) -> None:
        self._cancel_reset()
        if self.props.command:
            self._write_state({"command": ""})
        self._write_state({"command": value})

        def _reset() -> None:
            self._command_reset_timer = None
            self._write_state({"command": ""})

        self._command_reset_timer = threading.Timer(COMMAND_AUTO_RESET_MS / 1000.0, _reset)
        self._command_reset_timer.daemon = True
        self._command_reset_timer.start()

    def _cancel_reset(self) -> None:
        if self._command_reset_timer is not None:
            self._command_reset_timer.cancel()
            self._command_reset_timer = None

    def _cleanup(self) -> None:
        self._cancel_reset()
        super()._cleanup()
