from __future__ import annotations

import asyncio
from collections.abc import Awaitable, Callable
from dataclasses import dataclass

WRITE_TIMEOUT_MS = 10_000
# a caller waits a little longer than the lane, so the lane's own answer arrives first
WRITE_CALL_TIMEOUT_MS = WRITE_TIMEOUT_MS + 2_000
# writes a sensor accepts at once, the lane needs the next one to arrive while one runs
WRITE_CONCURRENCY = 16


@dataclass
class _Write:
    property: str
    apply: Callable[[], Awaitable[None]]
    deadline: float
    waiters: list[asyncio.Future[None]]


class WriteLane:
    def __init__(self) -> None:
        self._queue: list[_Write] = []
        self._running = False
        self._tasks: set[asyncio.Task[None]] = set()

    async def write(self, property: str, apply: Callable[[], Awaitable[None]], replaces: bool) -> None:
        loop = asyncio.get_running_loop()
        waiter: asyncio.Future[None] = loop.create_future()
        write = _Write(property, apply, loop.time() + WRITE_TIMEOUT_MS / 1000, [waiter])
        if replaces:
            for index, queued in enumerate(self._queue):
                if queued.property == property:
                    # the replaced caller learns how the newer value went
                    write.waiters[:0] = self._queue.pop(index).waiters
                    break
        self._queue.append(write)
        self._next()
        await waiter

    def _next(self) -> None:
        if self._running or not self._queue:
            return
        self._running = True
        task = asyncio.get_running_loop().create_task(self._run(self._queue.pop(0)))
        self._tasks.add(task)
        task.add_done_callback(self._tasks.discard)

    async def _run(self, write: _Write) -> None:
        try:
            left = write.deadline - asyncio.get_running_loop().time()
            if left <= 0:
                _settle(write, _no_answer(write.property))
                return
            applying = asyncio.ensure_future(write.apply())
            # a device call that hangs keeps running, the lane goes on without it
            done, _ = await asyncio.wait({applying}, timeout=left)
            if not done:
                applying.add_done_callback(_consume)
                _settle(write, _no_answer(write.property))
                return
            _settle(
                write,
                RuntimeError(f"{write.property} was cancelled")
                if applying.cancelled()
                else applying.exception(),
            )
        finally:
            self._running = False
            self._next()


def _settle(write: _Write, error: BaseException | None) -> None:
    for waiter in write.waiters:
        if waiter.done():
            continue
        if error is None:
            waiter.set_result(None)
        else:
            waiter.set_exception(error)


def _consume(task: asyncio.Future[None]) -> None:
    if not task.cancelled():
        task.exception()


def _no_answer(property: str) -> TimeoutError:
    return TimeoutError(f"No answer to {property} within {WRITE_TIMEOUT_MS // 1000} s")
