"""Generic event-listener registry for camera.ui.

Provides :class:`AsyncEventEmitter`, an event-name keyed listener
registry that supports both sync and async handlers. Handlers are
registered via :meth:`AsyncEventEmitter.on` /
:meth:`AsyncEventEmitter.once`, removed via
:meth:`AsyncEventEmitter.remove_listener` /
:meth:`AsyncEventEmitter.remove_all_listeners`, and invoked through
:meth:`AsyncEventEmitter.emit`.
"""

from __future__ import annotations

import asyncio
from collections import OrderedDict
from collections.abc import Callable
from typing import Any


class AsyncEventEmitter:
    """Generic event-listener registry that accepts sync and async handlers.

    Listeners are keyed by event name and invoked in registration order
    by :meth:`emit`. Async handlers are scheduled via ``ensure_future``
    (fire-and-forget) and tracked so they can be cancelled with
    :meth:`cancel`.
    """

    @staticmethod
    def _normalize_event(event: Any) -> str:
        return event.value if hasattr(event, "value") else str(event)

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
        """Register a one-shot listener that is invoked the next time *event* is emitted and then removed automatically."""
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
