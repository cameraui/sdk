"""Lightweight reactive primitives for camera.ui.

Provides cold Observables, multicast Subjects (Subject, BehaviorSubject,
ReplaySubject) and a small set of composable operators for building
property-change notifications and event streams throughout the SDK.
"""

from __future__ import annotations

import asyncio
import contextlib
from collections.abc import AsyncIterator, Awaitable, Callable
from typing import Any, Generic, TypeVar, cast

T = TypeVar("T")

_Comparator = Callable[[Any, Any], bool]

OperatorFn = Callable[["Observable[Any]"], "Observable[Any]"]
"""Function that transforms one Observable into another. Used as a building block for ``pipe()`` operator chains."""


class Disposable:
    """Subscription handle returned by ``subscribe()``.

    Call :meth:`dispose` (or its alias :meth:`unsubscribe`) to detach the
    listener and run any teardown logic registered by the producer.
    Disposing twice is a no-op.
    """

    __slots__ = ("_closed", "_teardown")

    def __init__(self, teardown: Callable[[], None]) -> None:
        self._closed = False
        self._teardown = teardown

    @property
    def closed(self) -> bool:
        return self._closed

    def dispose(self) -> None:
        if self._closed:
            return
        self._closed = True
        self._teardown()

    def unsubscribe(self) -> None:
        self.dispose()


class Observable(Generic[T]):
    """Cold producer of a push-based value stream.

    The ``subscribe_fn`` passed to the constructor is executed once per
    :meth:`subscribe` call, so each subscriber gets its own independent
    run. :meth:`subscribe` returns a :class:`Disposable` that stops the
    stream and triggers any teardown registered by the producer.
    """

    def __init__(self, subscribe_fn: Callable[[Callable[[T], None]], Disposable]) -> None:
        self._subscribe_fn = subscribe_fn

    def subscribe(self, callback: Callable[[T], None]) -> Disposable:
        """Start the producer for this subscriber and route emitted values to ``callback``. Returns a :class:`Disposable` for stopping the stream."""
        return self._subscribe_fn(callback)

    def pipe(self, *operators: OperatorFn) -> Observable[Any]:
        result: Observable[Any] = self
        for op in operators:
            result = op(result)
        return result

    def asubscribe(
        self,
        on_next: Callable[[T], Awaitable[Any]] | None = None,
        on_error: Callable[[Exception], Awaitable[Any]] | None = None,
    ) -> Disposable:
        """Subscribe asynchronously to the observable sequence."""
        error_future: asyncio.Future[Exception] = asyncio.Future()
        next_task: asyncio.Task[Any] | None = None
        error_task: asyncio.Task[Any] | None = None

        async def async_on_next(value: T) -> None:
            if on_next:
                try:
                    await on_next(value)
                except Exception as e:
                    if not error_future.done():
                        error_future.set_result(e)

        async def async_on_error() -> None:
            error = await error_future
            if on_error:
                disposable.dispose()
                with contextlib.suppress(Exception):
                    await on_error(error)

        def next_fn(x: T) -> None:
            nonlocal next_task
            next_task = asyncio.create_task(async_on_next(x), name="on_next")

        if on_error:
            error_task = asyncio.create_task(async_on_error(), name="on_error")

        disposable = self.subscribe(next_fn)

        def cancel_subscription() -> None:
            for task in (next_task, error_task):
                if task:
                    task.cancel()
            disposable.dispose()

        return Disposable(cancel_subscription)

    async def __aiter__(self) -> AsyncIterator[T]:
        """Async iterator implementation."""
        queue: asyncio.Queue[T | None] = asyncio.Queue(maxsize=100)
        done = False

        def on_next(value: T) -> None:
            if not queue.full():
                queue.put_nowait(value)

        subscription = self.subscribe(on_next)

        try:
            while not done:
                try:
                    item = await queue.get()
                    if item is None:
                        break
                    yield item
                except asyncio.CancelledError:
                    break
        finally:
            subscription.dispose()


class Subject(Generic[T]):
    """Multicast value source.

    Calls to :meth:`next` are dispatched synchronously to every active
    subscriber. :meth:`complete` releases all subscribers and locks the
    Subject so further :meth:`next` calls become no-ops. :meth:`subscribe`
    returns a :class:`Disposable` for individual cleanup.
    """

    def __init__(self) -> None:
        self._subscribers: set[Callable[[T], None]] = set()
        self._completed = False

    @property
    def closed(self) -> bool:
        return self._completed

    def next(self, value: T) -> None:
        if self._completed:
            return
        for cb in list(self._subscribers):
            cb(value)

    def complete(self) -> None:
        if self._completed:
            return
        self._completed = True
        self._subscribers.clear()

    def subscribe(self, callback: Callable[[T], None]) -> Disposable:
        if self._completed:
            return Disposable(lambda: None)
        self._subscribers.add(callback)
        return Disposable(lambda: self._subscribers.discard(callback))

    def pipe(self, *operators: OperatorFn) -> Observable[Any]:
        return self.as_observable().pipe(*operators)

    def as_observable(self) -> Observable[T]:
        """Return a read-only :class:`Observable` that mirrors this Subject without exposing :meth:`next` or :meth:`complete`."""
        return Observable(lambda cb: self.subscribe(cb))


class BehaviorSubject(Subject[T]):
    """Subject seeded with an initial value that always remembers the latest emission.

    New subscribers receive the current value immediately on
    :meth:`subscribe` and then all subsequent values. The current value
    is also accessible synchronously via :attr:`value` and
    :meth:`get_value`.
    """

    def __init__(self, initial_value: T) -> None:
        super().__init__()
        self._value = initial_value

    def next(self, value: T) -> None:
        self._value = value
        super().next(value)

    def get_value(self) -> T:
        return self._value

    @property
    def value(self) -> T:
        return self._value

    def subscribe(self, callback: Callable[[T], None]) -> Disposable:
        disposable = super().subscribe(callback)
        if not self.closed:
            callback(self._value)
        return disposable


class ReplaySubject(Subject[T]):
    """Subject that buffers up to the last ``buffer_size`` values.

    New subscribers immediately receive every buffered value in order
    before continuing with live emissions.
    """

    def __init__(self, buffer_size: int = 1) -> None:
        super().__init__()
        self._buffer: list[T] = []
        self._buffer_size = buffer_size

    def next(self, value: T) -> None:
        if self.closed:
            return
        self._buffer.append(value)
        if len(self._buffer) > self._buffer_size:
            self._buffer.pop(0)
        super().next(value)

    def subscribe(self, callback: Callable[[T], None]) -> Disposable:
        for value in self._buffer:
            callback(value)
        return super().subscribe(callback)


# ── Operators ──────────────────────────────────────────────────────


def _default_comparator(a: Any, b: Any) -> bool:
    return cast(bool, a == b)


def distinct_until_changed(comparator: _Comparator | None = None) -> OperatorFn:
    """Emit a value only when it differs from the previous one. Uses ``==`` by
    default, or an optional custom comparator (e.g. for deep equality).

    Args:
        comparator: Equality function; return True to suppress duplicates.

    Returns:
        Operator that drops consecutive equal values.

    Example:
        ```python
        from camera_ui_sdk import distinct_until_changed

        sensor.onPropertyChanged.pipe(
            distinct_until_changed(),
        ).subscribe(handle)
        ```
    """

    compare: _Comparator = comparator or _default_comparator

    def operator(source: Observable[Any]) -> Observable[Any]:
        def subscribe_fn(cb: Callable[[Any], None]) -> Disposable:
            has_value = False
            last_value: Any = None

            def on_next(value: Any) -> None:
                nonlocal has_value, last_value
                if not has_value or not compare(last_value, value):
                    has_value = True
                    last_value = value
                    cb(value)

            return source.subscribe(on_next)

        return Observable(subscribe_fn)

    return operator


def share(connector: Callable[[], Subject[Any]] | None = None) -> OperatorFn:
    """Multicast a cold Observable through a Subject, sharing a single
    upstream subscription among all subscribers (reference-counted). Supply a
    custom connector (e.g. ``lambda: ReplaySubject(1)``) to change buffering.

    Args:
        connector: Factory returning the multicast Subject to use.

    Returns:
        Operator that multicasts the source.

    Example:
        ```python
        from camera_ui_sdk import ReplaySubject, share

        events = source.pipe(share(lambda: ReplaySubject(1)))
        events.subscribe(lambda v: print("a", v))
        events.subscribe(lambda v: print("b", v))
        ```
    """

    def operator(source: Observable[Any]) -> Observable[Any]:
        subject: Subject[Any] | None = None
        source_disposable: Disposable | None = None
        ref_count = 0

        def subscribe_fn(cb: Callable[[Any], None]) -> Disposable:
            nonlocal subject, source_disposable, ref_count

            if subject is None:
                subject = connector() if connector else Subject()
                source_disposable = source.subscribe(lambda v: subject.next(v))  # type: ignore[union-attr]

            ref_count += 1
            sub = subject.subscribe(cb)

            def teardown() -> None:
                nonlocal subject, source_disposable, ref_count
                sub.dispose()
                ref_count -= 1
                if ref_count == 0:
                    if source_disposable:
                        source_disposable.dispose()
                    source_disposable = None
                    subject = None

            return Disposable(teardown)

        return Observable(subscribe_fn)

    return operator


def filter_op(predicate: Callable[[Any], bool]) -> OperatorFn:
    """Emit only the values for which ``predicate`` returns ``True``.

    Args:
        predicate: Predicate evaluated for each upstream value.

    Returns:
        Operator that drops values failing the predicate.

    Example:
        ```python
        from camera_ui_sdk import filter_op

        sensor.onPropertyChanged.pipe(
            filter_op(lambda e: e["property"] == "detected"),
        ).subscribe(handle)
        ```
    """

    def operator(source: Observable[Any]) -> Observable[Any]:
        def subscribe_fn(cb: Callable[[Any], None]) -> Disposable:
            return source.subscribe(lambda v: cb(v) if predicate(v) else None)

        return Observable(subscribe_fn)

    return operator


def map_op(transform: Callable[[Any], Any]) -> OperatorFn:
    """Apply ``transform`` to each emitted value and emit the result.

    Args:
        transform: Projection invoked for each upstream value.

    Returns:
        Operator that maps every value into a new shape.

    Example:
        ```python
        from camera_ui_sdk import map_op

        sensor.onPropertyChanged.pipe(
            map_op(lambda e: e["value"]),
        ).subscribe(handle)
        ```
    """

    def operator(source: Observable[Any]) -> Observable[Any]:
        def subscribe_fn(cb: Callable[[Any], None]) -> Disposable:
            return source.subscribe(lambda v: cb(transform(v)))

        return Observable(subscribe_fn)

    return operator


def pairwise() -> OperatorFn:
    """Emit ``(previous, current)`` pairs for every value after the first.

    Returns:
        Operator that yields adjacent value pairs.

    Example:
        ```python
        from camera_ui_sdk import pairwise

        source.pipe(pairwise()).subscribe(lambda pair: print(pair))
        ```
    """

    def operator(source: Observable[Any]) -> Observable[Any]:
        def subscribe_fn(cb: Callable[[Any], None]) -> Disposable:
            has_value = False
            prev: Any = None

            def on_next(value: Any) -> None:
                nonlocal has_value, prev
                if has_value:
                    cb((prev, value))
                has_value = True
                prev = value

            return source.subscribe(on_next)

        return Observable(subscribe_fn)

    return operator


def merge_map(project: Callable[[Any, int], list[Any]]) -> OperatorFn:
    """Project each source value to a list and flatten the results into the
    output stream.

    Args:
        project: Function returning a list of values for each input
            (receives the value and a zero-based index).

    Returns:
        Operator that flattens projected lists into the output stream.

    Example:
        ```python
        from camera_ui_sdk import merge_map

        source.pipe(merge_map(lambda v, i: [v, v * 2])).subscribe(handle)
        ```
    """

    def operator(source: Observable[Any]) -> Observable[Any]:
        def subscribe_fn(cb: Callable[[Any], None]) -> Disposable:
            index = 0

            def on_next(value: Any) -> None:
                nonlocal index
                results = project(value, index)
                index += 1
                for r in results:
                    cb(r)

            return source.subscribe(on_next)

        return Observable(subscribe_fn)

    return operator


# ── Utilities ──────────────────────────────────────────────────────


async def first_value_from(observable: Observable[T] | Subject[T]) -> T:
    """Subscribe to the source and return its first emitted value as a
    coroutine, then dispose the subscription.

    Args:
        observable: Source observable or subject to read once.

    Returns:
        The first value emitted by the source.

    Example:
        ```python
        from camera_ui_sdk import first_value_from

        value = await first_value_from(behavior_subject)
        ```
    """
    loop = asyncio.get_event_loop()
    future: asyncio.Future[T] = loop.create_future()
    sub: Disposable | None = None

    def on_next(value: T) -> None:
        nonlocal sub
        if not future.done():
            if sub is not None:
                sub.dispose()
            future.set_result(value)

    sub = observable.subscribe(on_next)

    # Already resolved synchronously (BehaviorSubject / ReplaySubject)
    if future.done():
        sub.dispose()

    return await future


__all__ = [
    "BehaviorSubject",
    "Disposable",
    "Observable",
    "ReplaySubject",
    "Subject",
    "distinct_until_changed",
    "filter_op",
    "first_value_from",
    "map_op",
    "merge_map",
    "pairwise",
    "share",
]
