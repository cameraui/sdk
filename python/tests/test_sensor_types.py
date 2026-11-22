from __future__ import annotations

from typing import Any

import pytest

from camera_ui_sdk import (
    AccessMethod,
    AccessResult,
    AccessTrigger,
    AirQualityCapability,
    AirQualityInfo,
    AirQualityLevel,
    AirQualityProperty,
    ButtonPress,
    ButtonTrigger,
    LawnMowerCommand,
    LawnMowerControl,
    LawnMowerProperty,
    VacuumActivity,
    VacuumCommand,
    VacuumControl,
    VacuumProperty,
)
from camera_ui_sdk.sensor.robot import COMMAND_AUTO_RESET_MS


def recorded(sensor: ButtonTrigger[Any] | AccessTrigger[Any] | VacuumControl[Any]) -> list[dict[str, Any]]:
    deltas: list[dict[str, Any]] = []
    sensor._init(deltas.append)  # pyright: ignore[reportPrivateUsage]
    return deltas


class AirQuality(AirQualityInfo[dict[str, Any]]):
    def __init__(self, capabilities: list[AirQualityCapability]) -> None:
        super().__init__()
        self.capabilities = capabilities


class Vacuum(VacuumControl[dict[str, Any]]):
    def __init__(self) -> None:
        super().__init__()
        self.docked = 0

    async def dock(self) -> None:
        self.docked += 1
        await super().dock()


class TestButton:
    def test_offers_single_and_the_presses_passed(self) -> None:
        assert ButtonTrigger("Remote").toJSON()["propertySpecs"] == {"press": {"values": ["single"]}}
        button = ButtonTrigger("Remote", presses=[ButtonPress.Long, ButtonPress.Single])
        assert button.toJSON()["propertySpecs"] == {"press": {"values": ["single", "long"]}}
        with pytest.raises(ValueError, match="double"):
            button.press(ButtonPress.Double)

    def test_counts_a_press_during_the_last_one_as_new(self) -> None:
        button = ButtonTrigger("Remote", index=2)
        deltas = recorded(button)
        button.press()
        button.press()
        assert button.index == 2
        assert button.pressed == ButtonPress.Single
        assert deltas == [{"press": "single"}, {"press": ""}, {"press": "single"}]
        button._cleanup()  # pyright: ignore[reportPrivateUsage]


class TestAccess:
    def test_writes_method_and_user_before_the_result(self) -> None:
        reader = AccessTrigger("Door")
        deltas = recorded(reader)
        reader.report(AccessResult.Granted, {"method": AccessMethod.Fingerprint, "user": "Anna"})
        assert deltas == [{"method": "fingerprint", "user": "Anna"}, {"result": "granted"}]
        reader._cleanup()  # pyright: ignore[reportPrivateUsage]


class TestAirQuality:
    def test_follows_the_index_before_pm25(self) -> None:
        sensor = AirQuality([AirQualityCapability.Aqi, AirQualityCapability.Pm25])
        sensor.setReading(AirQualityProperty.Pm25, 80)
        sensor.setReading(AirQualityProperty.Aqi, 42)
        assert sensor.level == AirQualityLevel.Excellent

    def test_follows_pm25_without_an_index(self) -> None:
        sensor = AirQuality([AirQualityCapability.Pm25])
        sensor.setReading(AirQualityProperty.Pm25, 35.5)
        assert sensor.level == AirQualityLevel.Fair

    def test_keeps_the_level_the_plugin_sets(self) -> None:
        sensor = AirQuality([AirQualityCapability.Pm25])
        sensor.setLevel(AirQualityLevel.Inferior)
        sensor.setReading(AirQualityProperty.Pm25, 2)
        sensor.setReading(AirQualityProperty.Pm10, float("nan"))
        assert sensor.level == AirQualityLevel.Inferior
        assert sensor.getValue(AirQualityProperty.Pm10) == 0


class TestRobots:
    @pytest.mark.asyncio
    async def test_runs_the_method_of_a_written_command_and_reads_empty_again_after_the_reset_time(
        self,
    ) -> None:
        vacuum = Vacuum()
        deltas = recorded(vacuum)
        await vacuum.updateValue(VacuumProperty.Command, VacuumCommand.Dock)
        await vacuum.updateValue(VacuumProperty.Command, VacuumCommand.Dock)
        assert vacuum.docked == 2
        assert vacuum.getValue(VacuumProperty.Command) == VacuumCommand.Dock
        assert deltas == [{"command": "dock"}, {"command": ""}, {"command": "dock"}]

        timer = vacuum._command_reset_timer  # pyright: ignore[reportPrivateUsage]
        assert timer is not None
        assert timer.interval == COMMAND_AUTO_RESET_MS / 1000
        timer.cancel()
        timer.function()
        assert vacuum.getValue(VacuumProperty.Command) == ""
        vacuum._cleanup()  # pyright: ignore[reportPrivateUsage]

    @pytest.mark.asyncio
    async def test_keeps_the_activity_a_plugin_reports_and_the_fan_speed_it_was_set_to(self) -> None:
        vacuum = VacuumControl()
        assert vacuum.activity is None
        await vacuum.updateValue(VacuumProperty.FanSpeed, "turbo")
        vacuum.setActivity(VacuumActivity.Cleaning)
        assert (vacuum.activity, vacuum.fanSpeed) == ("cleaning", "turbo")
        vacuum._cleanup()  # pyright: ignore[reportPrivateUsage]

        mower = LawnMowerControl()
        await mower.updateValue(LawnMowerProperty.Command, LawnMowerCommand.Start)
        assert mower.getValue(LawnMowerProperty.Command) == LawnMowerCommand.Start
        mower._cleanup()  # pyright: ignore[reportPrivateUsage]
