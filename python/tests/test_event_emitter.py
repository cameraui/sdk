"""Tests for AsyncEventEmitter."""

from __future__ import annotations

import asyncio

import pytest

from camera_ui_sdk.internal import AsyncEventEmitter

# ── on + emit (sync) ─────────────────────────────────────────────────


class TestOnEmitSync:
    def test_sync_handler_called(self) -> None:
        ee = AsyncEventEmitter()
        results: list[str] = []
        ee.on("test", lambda v: results.append(v))  # pyright: ignore[reportUnknownLambdaType, reportUnknownArgumentType]

        ee.emit("test", "hello")
        assert results == ["hello"]

    def test_multiple_listeners(self) -> None:
        ee = AsyncEventEmitter()
        results: list[int] = []
        ee.on("evt", lambda: results.append(1))
        ee.on("evt", lambda: results.append(2))

        ee.emit("evt")
        assert results == [1, 2]


# ── on + emit (async) ────────────────────────────────────────────────


class TestOnEmitAsync:
    @pytest.mark.asyncio
    async def test_async_handler_fire_and_forget(self) -> None:
        ee = AsyncEventEmitter()
        results: list[str] = []

        async def handler(val: str) -> None:
            results.append(val)

        ee.on("test", handler)
        ee.emit("test", "async_val")

        # Give the scheduled coroutine a chance to run
        await asyncio.sleep(0)
        assert results == ["async_val"]


# ── once ──────────────────────────────────────────────────────────────


class TestOnce:
    def test_fires_only_once(self) -> None:
        ee = AsyncEventEmitter()
        count = 0

        def handler() -> None:
            nonlocal count
            count += 1

        ee.once("evt", handler)

        ee.emit("evt")
        ee.emit("evt")
        assert count == 1

    def test_once_does_not_affect_other_listeners(self) -> None:
        ee = AsyncEventEmitter()
        results: list[str] = []

        ee.once("evt", lambda: results.append("once"))
        ee.on("evt", lambda: results.append("on"))

        ee.emit("evt")
        ee.emit("evt")
        assert results == ["once", "on", "on"]


# ── remove_listener ──────────────────────────────────────────────────


class TestRemoveListener:
    def test_removes_specific_handler(self) -> None:
        ee = AsyncEventEmitter()
        results: list[int] = []

        def h1() -> None:
            results.append(1)

        def h2() -> None:
            results.append(2)

        ee.on("evt", h1)
        ee.on("evt", h2)

        ee.remove_listener("evt", h1)
        ee.emit("evt")
        assert results == [2]

    def test_remove_nonexistent_is_noop(self) -> None:
        ee = AsyncEventEmitter()
        ee.remove_listener("no_such_event", lambda: None)  # should not raise

    def test_remove_once_listener(self) -> None:
        ee = AsyncEventEmitter()
        count = 0

        def handler() -> None:
            nonlocal count
            count += 1

        ee.once("evt", handler)
        ee.remove_listener("evt", handler)

        ee.emit("evt")
        assert count == 0


# ── remove_all_listeners ─────────────────────────────────────────────


class TestRemoveAllListeners:
    def test_removes_for_specific_event(self) -> None:
        ee = AsyncEventEmitter()
        r1: list[int] = []
        r2: list[int] = []

        ee.on("a", lambda: r1.append(1))
        ee.on("b", lambda: r2.append(2))

        ee.remove_all_listeners("a")

        ee.emit("a")
        ee.emit("b")
        assert r1 == []
        assert r2 == [2]

    def test_removes_all_events(self) -> None:
        ee = AsyncEventEmitter()
        results: list[int] = []

        ee.on("a", lambda: results.append(1))
        ee.on("b", lambda: results.append(2))

        ee.remove_all_listeners()

        ee.emit("a")
        ee.emit("b")
        assert results == []


# ── emit return value ────────────────────────────────────────────────


class TestEmitReturn:
    def test_returns_true_with_listeners(self) -> None:
        ee = AsyncEventEmitter()
        ee.on("evt", lambda: None)
        assert ee.emit("evt") is True

    def test_returns_false_without_listeners(self) -> None:
        ee = AsyncEventEmitter()
        assert ee.emit("evt") is False


# ── cancel ────────────────────────────────────────────────────────────


class TestCancel:
    @pytest.mark.asyncio
    async def test_cancels_pending_tasks(self) -> None:
        ee = AsyncEventEmitter()
        started = False

        async def long_handler() -> None:
            nonlocal started
            started = True
            await asyncio.sleep(10)

        ee.on("evt", long_handler)
        ee.emit("evt")

        # Let the task start
        await asyncio.sleep(0)
        assert started is True
        assert len(ee._waiting) == 1  # pyright: ignore[reportPrivateUsage]

        ee.cancel()
        assert len(ee._waiting) == 0  # pyright: ignore[reportPrivateUsage]

    @pytest.mark.asyncio
    async def test_completed_tasks_removed_from_waiting(self) -> None:
        ee = AsyncEventEmitter()

        async def quick_handler() -> None:
            pass

        ee.on("evt", quick_handler)
        ee.emit("evt")

        # Let the task complete + done callback fire
        await asyncio.sleep(0)
        await asyncio.sleep(0)
        assert len(ee._waiting) == 0  # pyright: ignore[reportPrivateUsage]
