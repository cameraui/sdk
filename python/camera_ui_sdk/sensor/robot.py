from __future__ import annotations

from collections.abc import Mapping
from typing import Any, Generic

from typing_extensions import TypeVar

from .command import CommandControl, CommandControlProperties


class RobotControlProperties(CommandControlProperties):
    """Property values every robot carries."""

    activity: str | None
    """What the robot does right now."""


TProperties = TypeVar("TProperties", bound=Mapping[str, Any], default=RobotControlProperties)
TStorage = TypeVar("TStorage", bound=Mapping[str, Any], default=dict[str, Any])
TCapability = TypeVar("TCapability", bound=str, default=str)


class RobotControl(
    CommandControl[TProperties, TStorage, TCapability], Generic[TProperties, TStorage, TCapability]
):
    """Base of the robots that run on their own and take one-off commands, such as a
    vacuum or a lawn mower.
    """

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
