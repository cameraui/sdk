from __future__ import annotations

from typing import Any

import pytest

from camera_ui_sdk import (
    PropertySpecOverride,
    SecuritySystem,
    SecuritySystemProperty,
    SecuritySystemState,
    SensorPropertySpec,
)
from camera_ui_sdk.internal import check_property_write

NO_NIGHT: PropertySpecOverride = {
    "values": [SecuritySystemState.AwayArm, SecuritySystemState.StayArm, SecuritySystemState.Disarmed]
}


class TestPropertySpecs:
    def test_registers_with_constructor_specs_and_sends_only_changes(self) -> None:
        alarm = SecuritySystem("Alarm", property_specs={SecuritySystemProperty.TargetState: NO_NIGHT})
        assert alarm.toJSON()["propertySpecs"] == {"targetState": NO_NIGHT}

        patches: list[Any] = []
        alarm._initSource(patches.append)  # pyright: ignore[reportPrivateUsage]

        alarm.setPropertySpec(SecuritySystemProperty.TargetState, {"values": list(NO_NIGHT["values"])})
        assert patches == []

        disarmed_only: PropertySpecOverride = {"values": [SecuritySystemState.Disarmed]}
        alarm.setPropertySpec(SecuritySystemProperty.CurrentState, disarmed_only)
        alarm.setPropertySpec(SecuritySystemProperty.TargetState, None)
        alarm.setPropertySpec(SecuritySystemProperty.TargetState, None)
        assert patches == [
            {"propertySpecs": {"targetState": NO_NIGHT, "currentState": disarmed_only}},
            {"propertySpecs": {"currentState": disarmed_only}},
        ]

    def test_registers_an_empty_map_without_specs(self) -> None:
        assert SecuritySystem("Alarm").toJSON()["propertySpecs"] == {}

    def test_takes_resolved_specs_from_host_and_emits_once(self) -> None:
        alarm = SecuritySystem("Alarm")
        events: list[Any] = []
        alarm.onPropertySpecsChanged.subscribe(events.append)
        assert alarm.propertySpecs == {}

        resolved: dict[str, SensorPropertySpec] = {
            "targetState": {"type": "enum", "values": {"away_arm": 1, "disarmed": 3}, "writable": True}
        }
        alarm._applyPropertySpecs(resolved)  # pyright: ignore[reportPrivateUsage]
        alarm._applyPropertySpecs(  # pyright: ignore[reportPrivateUsage]
            {"targetState": {"type": "enum", "values": {"away_arm": 1, "disarmed": 3}, "writable": True}}
        )
        assert events == [resolved]
        assert alarm.propertySpecs == resolved


SPECS: dict[str, SensorPropertySpec] = {
    "target": {"type": "number", "min": 10, "max": 30, "step": 0.5},
    "targetState": {"type": "enum", "values": {"away_arm": 1, "disarmed": 3}},
    "tone": {"type": "string", "choices": [{"value": "ding", "label": "Ding Dong"}]},
    "text": {"type": "string", "maxLength": 4},
    "coarse": {"type": "number", "min": 0, "max": 10, "step": 4},
}


class TestCheckPropertyWrite:
    def test_passes_properties_without_a_spec(self) -> None:
        assert check_property_write(SPECS, "on", True) is True

    def test_rejects_numbers_outside_the_range_and_rounds_to_the_step(self) -> None:
        with pytest.raises(ValueError, match="at least 10"):
            check_property_write(SPECS, "target", 9.9)
        with pytest.raises(ValueError, match="at most 30"):
            check_property_write(SPECS, "target", 30.1)
        assert check_property_write(SPECS, "target", 21.3) == 21.5
        assert check_property_write(SPECS, "target", 21.2) == 21
        assert check_property_write(SPECS, "target", 21.25) == 21.5
        assert check_property_write(SPECS, "coarse", 10) == 10

    def test_rejects_values_and_choices_the_device_does_not_offer(self) -> None:
        assert check_property_write(SPECS, "targetState", 1) == 1
        with pytest.raises(ValueError, match="does not support 2"):
            check_property_write(SPECS, "targetState", 2)
        assert check_property_write(SPECS, "tone", "ding") == "ding"
        with pytest.raises(ValueError, match="no choice xmas"):
            check_property_write(SPECS, "tone", "xmas")

    def test_rejects_text_over_the_limit(self) -> None:
        assert check_property_write(SPECS, "text", "Hall") == "Hall"
        with pytest.raises(ValueError, match="longer than 4"):
            check_property_write(SPECS, "text", "Hallway")
