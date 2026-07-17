from __future__ import annotations

from collections.abc import Mapping
from enum import StrEnum
from typing import Any, Generic, Literal, Protocol, overload, runtime_checkable

from typing_extensions import TypedDict, TypeVar

from ..observable import Observable
from .base import Sensor, SensorCategory, SensorLike, SensorType


class BatteryCapability(StrEnum):
    """Optional capabilities for battery info sensors."""

    LowBattery = "lowBattery"
    """Sensor reports low-battery alerts."""
    Charging = "charging"
    """Sensor reports charging state."""


class BatteryProperty(StrEnum):
    """Properties for battery info sensors."""

    Level = "level"
    Charging = "charging"
    Low = "low"


class ChargingState(StrEnum):
    """Battery charging state."""

    NotChargeable = "NOT_CHARGEABLE"
    """Device has no rechargeable battery."""
    NotCharging = "NOT_CHARGING"
    """Battery is not charging."""
    Charging = "CHARGING"
    """Battery is currently charging."""
    Full = "FULL"
    """Battery is fully charged."""


class BatteryInfoProperties(TypedDict):
    """Property value map for battery info sensors."""

    level: int
    charging: ChargingState
    low: bool


class BatteryPropertyChangeData(TypedDict):
    """Emitted on BatteryInfoLike.onPropertyChanged."""

    property: str  # BatteryProperty value
    value: int | ChargingState | bool


TStorage = TypeVar("TStorage", bound=Mapping[str, Any], default=dict[str, Any])


@runtime_checkable
class BatteryInfoLike(SensorLike, Protocol):
    """Read-only proxy interface for a battery info sensor."""

    @property
    def type(self) -> SensorType:
        return SensorType.Battery

    @overload
    def getValue(self, property: Literal[BatteryProperty.Level]) -> int | None: ...
    @overload
    def getValue(self, property: Literal[BatteryProperty.Charging]) -> ChargingState | None: ...
    @overload
    def getValue(self, property: Literal[BatteryProperty.Low]) -> bool | None: ...
    @overload
    def getValue(self, property: str) -> object | None: ...

    @property
    def onPropertyChanged(self) -> Observable[BatteryPropertyChangeData]: ...

    @property
    def onCapabilitiesChanged(self) -> Observable[list[BatteryCapability]]: ...


class BatteryInfo(Sensor[BatteryInfoProperties, TStorage, BatteryCapability], Generic[TStorage]):
    """Battery info sensor. Reports battery level, charging state, and low-battery alerts.

    Plugin authors call `setLevel(value)`, `setCharging(state)`, and `setLow(value)`
    to push updates from the device.
    """

    _requires_frames = False

    def __init__(self, name: str = "Battery") -> None:
        super().__init__(name)
        self._write_state(
            {
                BatteryProperty.Level.value: 100,
                BatteryProperty.Charging.value: ChargingState.NotCharging,
                BatteryProperty.Low.value: False,
            }
        )

    @property
    def type(self) -> SensorType:
        return SensorType.Battery

    @property
    def category(self) -> SensorCategory:
        return SensorCategory.Info

    @property
    def level(self) -> int:
        return int(self.props.level or 0)

    @property
    def charging(self) -> ChargingState:
        return self.props.charging  # type: ignore[no-any-return]

    @property
    def low(self) -> bool:
        return bool(self.props.low)

    def setLevel(self, value: int) -> None:
        """Report a new battery level (percentage). Clamped to [0, 100].

        Args:
            value: Battery level percentage in the range 0–100.

        Example:
            ```python
            battery.setLevel(87)
            ```
        """
        self._write_state({BatteryProperty.Level.value: max(0, min(100, value))})

    def setCharging(self, value: ChargingState) -> None:
        """Report the current charging state.

        Args:
            value: Current charging state from the ``ChargingState`` enum.

        Example:
            ```python
            from camera_ui_sdk import ChargingState

            battery.setCharging(ChargingState.Charging)
            ```
        """
        self._write_state({BatteryProperty.Charging.value: value})

    def setLow(self, value: bool) -> None:
        """Report whether the battery is critically low.

        Args:
            value: True when the battery has crossed the low-battery threshold.

        Example:
            ```python
            battery.setLow(True)
            ```
        """
        self._write_state({BatteryProperty.Low.value: value})

    async def updateValue(self, property: str, value: Any) -> None:
        """Read-only sensor: external writes are ignored."""
        # No-op — battery state is reported by the plugin, not set externally.
