from __future__ import annotations

import asyncio
from collections.abc import Awaitable, Callable

import pytest

from camera_ui_sdk import LightControl, LightProperty, MediaPlayerControl, MediaPlayerProperty
from camera_ui_sdk.internal import write_lane
from camera_ui_sdk.internal.write_lane import WriteLane


def recorder(ran: list[str], name: str, gate: asyncio.Event | None = None) -> Callable[[], Awaitable[None]]:
    async def apply() -> None:
        ran.append(name)
        if gate is not None:
            await gate.wait()

    return apply


async def turns() -> None:
    for _ in range(5):
        await asyncio.sleep(0)


class TestWriteLane:
    @pytest.mark.asyncio
    async def test_runs_one_write_at_a_time_in_arrival_order(self) -> None:
        lane = WriteLane()
        ran: list[str] = []
        gate = asyncio.Event()
        first = asyncio.ensure_future(lane.write("a", recorder(ran, "a", gate), True))
        second = asyncio.ensure_future(lane.write("b", recorder(ran, "b"), True))
        await turns()
        assert ran == ["a"]
        gate.set()
        await asyncio.gather(first, second)
        assert ran == ["a", "b"]

    @pytest.mark.asyncio
    async def test_a_newer_value_replaces_the_waiting_one_both_callers_learn_its_outcome(self) -> None:
        lane = WriteLane()
        ran: list[str] = []
        gate = asyncio.Event()
        first = asyncio.ensure_future(lane.write("level", recorder(ran, "10", gate), True))
        replaced = asyncio.ensure_future(lane.write("level", recorder(ran, "20"), True))
        newest = asyncio.ensure_future(lane.write("level", recorder(ran, "30"), True))
        await turns()
        gate.set()
        await asyncio.gather(first, replaced, newest)
        assert ran == ["10", "30"]

    @pytest.mark.asyncio
    async def test_a_replaced_value_moves_behind_what_came_in_between(self) -> None:
        lane = WriteLane()
        ran: list[str] = []
        gate = asyncio.Event()
        writes = [
            asyncio.ensure_future(lane.write("position", recorder(ran, "position 10", gate), True)),
            asyncio.ensure_future(lane.write("position", recorder(ran, "position 20"), True)),
            asyncio.ensure_future(lane.write("stop", recorder(ran, "stop"), True)),
            asyncio.ensure_future(lane.write("position", recorder(ran, "position 30"), True)),
        ]
        await turns()
        gate.set()
        await asyncio.gather(*writes)
        assert ran == ["position 10", "stop", "position 30"]

    @pytest.mark.asyncio
    async def test_runs_every_command(self) -> None:
        lane = WriteLane()
        ran: list[str] = []
        gate = asyncio.Event()
        writes = [
            asyncio.ensure_future(
                lane.write("command", recorder(ran, "next", gate if index == 0 else None), False)
            )
            for index in range(3)
        ]
        await turns()
        gate.set()
        await asyncio.gather(*writes)
        assert ran == ["next", "next", "next"]

    @pytest.mark.asyncio
    async def test_raises_the_setter_error_and_goes_on_with_the_next_write(self) -> None:
        lane = WriteLane()

        async def refuse() -> None:
            raise RuntimeError("offline")

        failed = asyncio.ensure_future(lane.write("on", refuse, True))
        ran: list[str] = []
        following = asyncio.ensure_future(lane.write("level", recorder(ran, "level"), True))
        with pytest.raises(RuntimeError, match="offline"):
            await failed
        await following
        assert ran == ["level"]

    @pytest.mark.asyncio
    async def test_gives_up_on_a_write_without_an_answer_and_goes_on(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setattr(write_lane, "WRITE_TIMEOUT_MS", 50)
        lane = WriteLane()
        hanging = asyncio.ensure_future(lane.write("on", recorder([], "on", asyncio.Event()), True))
        await asyncio.sleep(0.025)
        ran: list[str] = []
        following = asyncio.ensure_future(lane.write("level", recorder(ran, "level"), True))
        with pytest.raises(TimeoutError, match="No answer to on"):
            await hanging
        await following
        assert ran == ["level"]


class TestSensorUpdateValue:
    @pytest.mark.asyncio
    async def test_raises_when_the_plugin_setter_refuses(self) -> None:
        class Refusing(LightControl):
            async def setBrightness(self, value: int) -> None:
                raise RuntimeError("bulb unreachable")

        light = Refusing("Desk")
        with pytest.raises(RuntimeError, match="bulb unreachable"):
            await light.updateValue(LightProperty.Brightness, 40)
        assert light.brightness == 100
        light._cleanup()  # pyright: ignore[reportPrivateUsage]

    @pytest.mark.asyncio
    async def test_refuses_a_write_while_its_source_is_unavailable(self) -> None:
        sent: list[int] = []

        class Lamp(LightControl):
            async def setBrightness(self, value: int) -> None:
                sent.append(value)
                await super().setBrightness(value)

        light = Lamp("Desk")
        light.setSourceState("unavailable")
        with pytest.raises(RuntimeError, match="Desk is not reachable"):
            await light.updateValue(LightProperty.Brightness, 40)
        light.setSourceState("connected")
        await light.updateValue(LightProperty.Brightness, 50)
        assert sent == [50]
        light._cleanup()  # pyright: ignore[reportPrivateUsage]

    @pytest.mark.asyncio
    async def test_runs_every_media_command_also_when_they_come_quickly(self) -> None:
        sent: list[str] = []

        class Player(MediaPlayerControl):
            async def next(self) -> None:
                sent.append("next")

        player = Player()
        await asyncio.gather(*(player.updateValue(MediaPlayerProperty.Command, "next") for _ in range(3)))
        assert sent == ["next", "next", "next"]
        player._cleanup()  # pyright: ignore[reportPrivateUsage]
