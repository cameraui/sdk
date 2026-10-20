from __future__ import annotations

import asyncio
from collections import OrderedDict
from collections.abc import Callable
from typing import Any


class AsyncEventEmitter:
    def __init__(self) -> None:
        self._events: dict[str, OrderedDict[Callable[..., Any], Callable[..., Any]]] = {}
        self._waiting: set[asyncio.Future[Any]] = set()

    def on(self, event: str, f: Callable[..., Any]) -> Callable[..., Any]:
        event = self._normalize_event(event)
        listeners = self._events.get(event)
        if listeners is None:
            listeners = OrderedDict[Callable[..., Any], Callable[..., Any]]()
            self._events[event] = listeners
        listeners[f] = f
        return f

    def once(self, event: str, f: Callable[..., Any]) -> Callable[..., Any]:
        event = self._normalize_event(event)

        def wrapper(*args: Any, **kwargs: Any) -> Any:
            self.remove_listener(event, f)
            return f(*args, **kwargs)

        listeners = self._events.get(event)
        if listeners is None:
            listeners = OrderedDict[Callable[..., Any], Callable[..., Any]]()
            self._events[event] = listeners
        listeners[f] = wrapper
        return f

    def emit(self, event: str, *args: Any, **kwargs: Any) -> bool:
        event = self._normalize_event(event)
        listeners = self._events.get(event)
        if not listeners:
            return False

        for handler in list(listeners.values()):
            result = handler(*args, **kwargs)
            if asyncio.iscoroutine(result):
                future = asyncio.ensure_future(result)
                self._waiting.add(future)
                future.add_done_callback(self._waiting.discard)

        return True

    async def emit_and_wait(
        self,
        event: str,
        *args: Any,
        timeout: float | None = None,
        on_error: Callable[[BaseException], None] | None = None,
        **kwargs: Any,
    ) -> bool:
        event = self._normalize_event(event)
        listeners = self._events.get(event)

        pending: list[asyncio.Future[Any]] = []
        for handler in list(listeners.values()) if listeners else []:
            try:
                result = handler(*args, **kwargs)
            except Exception as e:
                if on_error is not None:
                    on_error(e)
                continue
            if asyncio.iscoroutine(result):
                future = asyncio.ensure_future(result)
                self._waiting.add(future)
                future.add_done_callback(self._waiting.discard)
                pending.append(future)

        if not pending:
            return True

        done, still_pending = await asyncio.wait(pending, timeout=timeout)
        for settled in done:
            if settled.cancelled():
                continue
            exc = settled.exception()
            if exc is not None and on_error is not None:
                on_error(exc)
        return not still_pending

    def remove_listener(self, event: str, f: Callable[..., Any]) -> None:
        event = self._normalize_event(event)
        listeners = self._events.get(event)
        if listeners is not None:
            listeners.pop(f, None)
            if not listeners:
                del self._events[event]

    def remove_all_listeners(self, event: str | None = None) -> None:
        if event is not None:
            self._events.pop(self._normalize_event(event), None)
        else:
            self._events.clear()

    def cancel(self) -> None:
        for future in self._waiting:
            future.cancel()
        self._waiting.clear()

    @staticmethod
    def _normalize_event(event: Any) -> str:
        return event.value if hasattr(event, "value") else str(event)
