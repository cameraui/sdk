"""Tests for lightweight reactive primitives."""

from __future__ import annotations

import asyncio

import pytest

from camera_ui_sdk.observable import (
    BehaviorSubject,
    Disposable,
    Observable,
    ReplaySubject,
    Subject,
    distinct_until_changed,
    filter_op,
    first_value_from,
    map_op,
    merge_map,
    pairwise,
    share,
)

# ── Disposable ────────────────────────────────────────────────────────


class TestDisposable:
    def test_calls_teardown_once(self) -> None:
        count = 0

        def teardown() -> None:
            nonlocal count
            count += 1

        d = Disposable(teardown)
        assert d.closed is False

        d.dispose()
        assert d.closed is True
        assert count == 1

        d.dispose()
        assert count == 1

    def test_unsubscribe_alias(self) -> None:
        called = False

        def teardown() -> None:
            nonlocal called
            called = True

        d = Disposable(teardown)
        d.unsubscribe()
        assert called is True
        assert d.closed is True


# ── Subject ───────────────────────────────────────────────────────────


class TestSubject:
    def test_emits_values(self) -> None:
        subject: Subject[int] = Subject()
        values: list[int] = []

        subject.subscribe(values.append)
        subject.next(1)
        subject.next(2)
        subject.next(3)

        assert values == [1, 2, 3]

    def test_multiple_subscribers(self) -> None:
        subject: Subject[int] = Subject()
        a: list[int] = []
        b: list[int] = []

        subject.subscribe(a.append)
        subject.subscribe(b.append)
        subject.next(42)

        assert a == [42]
        assert b == [42]

    def test_stops_after_complete(self) -> None:
        subject: Subject[int] = Subject()
        values: list[int] = []

        subject.subscribe(values.append)
        subject.next(1)
        subject.complete()
        subject.next(2)

        assert values == [1]
        assert subject.closed is True

    def test_dispose_removes_subscriber(self) -> None:
        subject: Subject[int] = Subject()
        values: list[int] = []

        sub = subject.subscribe(values.append)
        subject.next(1)
        sub.dispose()
        subject.next(2)

        assert values == [1]

    def test_subscribe_to_completed_subject(self) -> None:
        subject: Subject[int] = Subject()
        subject.complete()

        values: list[int] = []
        subject.subscribe(values.append)

        assert values == []

    def test_as_observable(self) -> None:
        subject: Subject[int] = Subject()
        obs = subject.as_observable()
        values: list[int] = []

        obs.subscribe(values.append)
        subject.next(10)

        assert values == [10]
        assert isinstance(obs, Observable)


# ── BehaviorSubject ───────────────────────────────────────────────────


class TestBehaviorSubject:
    def test_emits_current_value_on_subscribe(self) -> None:
        subject = BehaviorSubject(42)
        values: list[int] = []

        subject.subscribe(values.append)

        assert values == [42]

    def test_value_property_and_get_value(self) -> None:
        subject = BehaviorSubject("hello")
        assert subject.value == "hello"
        assert subject.get_value() == "hello"

        subject.next("world")
        assert subject.value == "world"

    def test_initial_and_subsequent_values(self) -> None:
        subject = BehaviorSubject(0)
        values: list[int] = []

        subject.subscribe(values.append)
        subject.next(1)
        subject.next(2)

        assert values == [0, 1, 2]

    def test_late_subscriber_gets_latest(self) -> None:
        subject = BehaviorSubject(0)
        subject.next(1)
        subject.next(2)

        values: list[int] = []
        subject.subscribe(values.append)

        assert values == [2]

    def test_no_emit_after_complete(self) -> None:
        subject = BehaviorSubject(0)
        subject.complete()

        values: list[int] = []
        subject.subscribe(values.append)

        assert values == []


# ── ReplaySubject ─────────────────────────────────────────────────────


class TestReplaySubject:
    def test_replays_buffered_values(self) -> None:
        subject: ReplaySubject[int] = ReplaySubject(2)
        subject.next(1)
        subject.next(2)
        subject.next(3)

        values: list[int] = []
        subject.subscribe(values.append)

        assert values == [2, 3]

    def test_replay_plus_live(self) -> None:
        subject: ReplaySubject[int] = ReplaySubject(1)
        subject.next(1)

        values: list[int] = []
        subject.subscribe(values.append)
        subject.next(2)

        assert values == [1, 2]

    def test_replays_all_with_large_buffer(self) -> None:
        subject: ReplaySubject[int] = ReplaySubject(100)
        subject.next(1)
        subject.next(2)
        subject.next(3)

        values: list[int] = []
        subject.subscribe(values.append)

        assert values == [1, 2, 3]

    def test_no_buffer_after_complete(self) -> None:
        subject: ReplaySubject[int] = ReplaySubject(2)
        subject.next(1)
        subject.complete()
        subject.next(2)

        values: list[int] = []
        subject.subscribe(values.append)

        assert values == [1]


# ── Observable ────────────────────────────────────────────────────────


class TestObservable:
    def test_subscribe_calls_factory(self) -> None:
        called = False

        def subscribe_fn(cb: object) -> Disposable:
            nonlocal called
            called = True
            return Disposable(lambda: None)

        obs: Observable[int] = Observable(subscribe_fn)
        obs.subscribe(lambda _: None)

        assert called is True

    def test_pipe_no_operators(self) -> None:
        subject: Subject[int] = Subject()
        piped = subject.as_observable().pipe()
        values: list[int] = []

        piped.subscribe(values.append)
        subject.next(1)

        assert values == [1]


# ── Operators ─────────────────────────────────────────────────────────


class TestFilterOp:
    def test_filters_values(self) -> None:
        subject: Subject[int] = Subject()
        values: list[int] = []

        subject.pipe(filter_op(lambda v: v % 2 == 0)).subscribe(values.append)

        subject.next(1)
        subject.next(2)
        subject.next(3)
        subject.next(4)

        assert values == [2, 4]


class TestMapOp:
    def test_transforms_values(self) -> None:
        subject: Subject[int] = Subject()
        values: list[str] = []

        subject.pipe(map_op(lambda v: f"v{v}")).subscribe(values.append)

        subject.next(1)
        subject.next(2)

        assert values == ["v1", "v2"]


class TestDistinctUntilChanged:
    def test_skips_consecutive_duplicates(self) -> None:
        subject: Subject[int] = Subject()
        values: list[int] = []

        subject.pipe(distinct_until_changed()).subscribe(values.append)

        subject.next(1)
        subject.next(1)
        subject.next(2)
        subject.next(2)
        subject.next(1)

        assert values == [1, 2, 1]

    def test_custom_comparator(self) -> None:
        subject: Subject[dict[str, int]] = Subject()
        values: list[dict[str, int]] = []

        subject.pipe(distinct_until_changed(lambda a, b: a["id"] == b["id"])).subscribe(values.append)

        subject.next({"id": 1})
        subject.next({"id": 1})
        subject.next({"id": 2})

        assert values == [{"id": 1}, {"id": 2}]

    def test_always_emits_first(self) -> None:
        subject: Subject[int] = Subject()
        values: list[int] = []

        subject.pipe(distinct_until_changed()).subscribe(values.append)
        subject.next(5)

        assert values == [5]


class TestPairwise:
    def test_emits_pairs_of_consecutive_values(self) -> None:
        subject: Subject[int] = Subject()
        pairs: list[tuple[int, int]] = []

        subject.pipe(pairwise()).subscribe(pairs.append)

        subject.next(1)
        subject.next(2)
        subject.next(3)

        assert pairs == [(1, 2), (2, 3)]

    def test_does_not_emit_on_first_value(self) -> None:
        subject: Subject[int] = Subject()
        pairs: list[tuple[int, int]] = []

        subject.pipe(pairwise()).subscribe(pairs.append)
        subject.next(1)

        assert pairs == []


class TestMergeMap:
    def test_flattens_projected_lists(self) -> None:
        subject: Subject[int] = Subject()
        values: list[int] = []

        subject.pipe(merge_map(lambda v, _idx: [v, v * 10])).subscribe(values.append)

        subject.next(1)
        subject.next(2)

        assert values == [1, 10, 2, 20]

    def test_handles_empty_lists(self) -> None:
        subject: Subject[int] = Subject()
        values: list[int] = []

        subject.pipe(merge_map(lambda v, idx: [] if idx == 0 else [v])).subscribe(values.append)

        subject.next(1)
        subject.next(2)

        assert values == [2]


class TestShare:
    def test_shares_single_source_subscription(self) -> None:
        subscribe_count = 0

        def subscribe_fn(cb: object) -> Disposable:
            nonlocal subscribe_count
            subscribe_count += 1
            return Disposable(lambda: None)

        source: Observable[int] = Observable(subscribe_fn)
        shared = source.pipe(share())

        shared.subscribe(lambda _: None)
        shared.subscribe(lambda _: None)

        assert subscribe_count == 1

    def test_custom_connector(self) -> None:
        subject: Subject[int] = Subject()
        values: list[int] = []

        shared = subject.as_observable().pipe(
            share(lambda: ReplaySubject(1)),
        )

        subject.next(1)

        shared.subscribe(values.append)
        subject.next(2)

        late_values: list[int] = []
        shared.subscribe(late_values.append)
        subject.next(3)

        assert 2 in values
        assert 2 in late_values  # replayed from ReplaySubject
        assert 3 in late_values

    def test_resubscribes_after_all_dispose(self) -> None:
        subscribe_count = 0
        subject: Subject[int] = Subject()

        def subscribe_fn(cb: object) -> Disposable:
            nonlocal subscribe_count
            subscribe_count += 1
            return subject.subscribe(cb)  # type: ignore[arg-type]

        source: Observable[int] = Observable(subscribe_fn)
        shared = source.pipe(share())

        sub1 = shared.subscribe(lambda _: None)
        sub2 = shared.subscribe(lambda _: None)
        assert subscribe_count == 1

        sub1.dispose()
        sub2.dispose()

        shared.subscribe(lambda _: None)
        assert subscribe_count == 2


# ── Pipe chaining ─────────────────────────────────────────────────────


class TestPipeChaining:
    def test_chains_multiple_operators(self) -> None:
        subject: Subject[int] = Subject()
        values: list[int] = []

        subject.pipe(
            filter_op(lambda v: v > 1),
            map_op(lambda v: v * 10),
            distinct_until_changed(),
        ).subscribe(values.append)

        subject.next(1)
        subject.next(2)
        subject.next(2)
        subject.next(3)

        assert values == [20, 30]

    def test_behavior_subject_pipe(self) -> None:
        subject = BehaviorSubject(0)
        values: list[int] = []

        subject.pipe(
            distinct_until_changed(),
            share(lambda: ReplaySubject(1)),
        ).subscribe(values.append)

        subject.next(1)
        subject.next(1)
        subject.next(2)

        assert values == [0, 1, 2]


# ── firstValueFrom ───────────────────────────────────────────────────


class TestFirstValueFrom:
    @pytest.mark.asyncio
    async def test_resolves_with_first_value(self) -> None:
        subject: Subject[int] = Subject()

        async def emit_later() -> None:
            await asyncio.sleep(0.01)
            subject.next(42)

        asyncio.create_task(emit_later())
        value = await first_value_from(subject)
        assert value == 42

    @pytest.mark.asyncio
    async def test_resolves_immediately_for_behavior_subject(self) -> None:
        subject = BehaviorSubject("hello")
        value = await first_value_from(subject)
        assert value == "hello"

    @pytest.mark.asyncio
    async def test_resolves_with_replayed_value(self) -> None:
        subject: ReplaySubject[int] = ReplaySubject(1)
        subject.next(99)

        value = await first_value_from(subject)
        assert value == 99

    @pytest.mark.asyncio
    async def test_hangs_for_closed_empty_subject(self) -> None:
        subject: Subject[int] = Subject()
        subject.complete()

        with pytest.raises(asyncio.TimeoutError):
            await asyncio.wait_for(first_value_from(subject), timeout=0.05)
