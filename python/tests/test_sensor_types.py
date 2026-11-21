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
)


def recorded(sensor: ButtonTrigger[Any] | AccessTrigger[Any]) -> list[dict[str, Any]]:
    deltas: list[dict[str, Any]] = []
    sensor._init(deltas.append)  # pyright: ignore[reportPrivateUsage]
    return deltas


class AirQuality(AirQualityInfo[dict[str, Any]]):
    def __init__(self, capabilities: list[AirQualityCapability]) -> None:
        super().__init__()
        self.capabilities = capabilities


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
