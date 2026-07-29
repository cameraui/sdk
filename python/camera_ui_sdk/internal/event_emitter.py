from __future__ import annotations

import asyncio
from collections import OrderedDict
from collections.abc import Callable
from typing import Any


class AsyncEventEmitter:
    """Event-listener registry that accepts sync and async handlers.

    Listeners are keyed by event name and invoked in registration order. Async
    handlers are scheduled fire-and-forget and tracked so :meth:`cancel` can stop them.
    """

    def __init__(self) -> None:
        self._events: dict[str, OrderedDict[Callable[..., Any], Callable[..., Any]]] = {}
        self._waiting: set[asyncio.Future[Any]] = set()

    def on(self, event: str, f: Callable[..., Any]) -> Callable[..., Any]:
        """Register a listener (sync or async) that is invoked for every emission of *event*."""
        event = self._normalize_event(event)
        listeners = self._events.get(event)
        if listeners is None:
            listeners = OrderedDict[Callable[..., Any], Callable[..., Any]]()
            self._events[event] = listeners
        listeners[f] = f
        return f

    def once(self, event: str, f: Callable[..., Any]) -> Callable[..., Any]:
        """Register a one-shot listener that runs on the next emission of *event*, then removes itself."""
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
        """Invoke every listener registered for *event* with the given arguments.

        Returns ``True`` if *event* had listeners, ``False`` otherwise.
        Async handlers are scheduled as fire-and-forget tasks.
        """
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
        """Invoke every listener registered for *event* and wait for async handlers to settle.

        Handler exceptions go to *on_error* instead of propagating, so one failing
        listener never blocks the others. Returns ``False`` if handlers were still
        pending after *timeout* seconds, they keep running and stay cancellable
        via :meth:`cancel`.
        """
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
        """Remove a previously registered listener *f* from *event*. No-op if it is not registered."""
        event = self._normalize_event(event)
        listeners = self._events.get(event)
        if listeners is not None:
            listeners.pop(f, None)
            if not listeners:
                del self._events[event]

    def remove_all_listeners(self, event: str | None = None) -> None:
        """Remove every listener for *event*, or every listener for every event when *event* is ``None``."""
        if event is not None:
            self._events.pop(self._normalize_event(event), None)
        else:
            self._events.clear()

    def cancel(self) -> None:
        """Cancel all pending async tasks."""
        for future in self._waiting:
            future.cancel()
        self._waiting.clear()

    @staticmethod
    def _normalize_event(event: Any) -> str:
        """Accept both plain event names and enum members."""
        return event.value if hasattr(event, "value") else str(event)
