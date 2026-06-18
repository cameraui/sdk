import { describe, expect, it } from 'vitest';

import {
  BehaviorSubject,
  Disposable,
  Observable,
  ReplaySubject,
  Subject,
  distinctUntilChanged,
  filter,
  firstValueFrom,
  map,
  mergeMap,
  pairwise,
  share,
} from './index.js';

describe('Disposable', () => {
  it('should call teardown once on dispose', () => {
    let count = 0;
    const d = new Disposable(() => count++);

    expect(d.closed).toBe(false);
    d.dispose();
    expect(d.closed).toBe(true);
    expect(count).toBe(1);

    d.dispose();
    expect(count).toBe(1);
  });

  it('should support unsubscribe alias', () => {
    let called = false;
    const d = new Disposable(() => (called = true));
    d.unsubscribe();
    expect(called).toBe(true);
    expect(d.closed).toBe(true);
  });
});

describe('Subject', () => {
  it('should emit values to subscribers', () => {
    const subject = new Subject<number>();
    const values: number[] = [];

    subject.subscribe((v) => values.push(v));
    subject.next(1);
    subject.next(2);
    subject.next(3);

    expect(values).toEqual([1, 2, 3]);
  });

  it('should support multiple subscribers', () => {
    const subject = new Subject<number>();
    const a: number[] = [];
    const b: number[] = [];

    subject.subscribe((v) => a.push(v));
    subject.subscribe((v) => b.push(v));
    subject.next(42);

    expect(a).toEqual([42]);
    expect(b).toEqual([42]);
  });

  it('should stop emitting after complete', () => {
    const subject = new Subject<number>();
    const values: number[] = [];

    subject.subscribe((v) => values.push(v));
    subject.next(1);
    subject.complete();
    subject.next(2);

    expect(values).toEqual([1]);
    expect(subject.closed).toBe(true);
  });

  it('should not deliver to unsubscribed callback', () => {
    const subject = new Subject<number>();
    const values: number[] = [];

    const sub = subject.subscribe((v) => values.push(v));
    subject.next(1);
    sub.dispose();
    subject.next(2);

    expect(values).toEqual([1]);
  });

  it('should return noop disposable when subscribing to completed subject', () => {
    const subject = new Subject<number>();
    subject.complete();

    const values: number[] = [];
    const sub = subject.subscribe((v) => values.push(v));

    expect(values).toEqual([]);
    expect(sub.closed).toBe(false); // noop disposable starts open
  });

  it('should provide asObservable', () => {
    const subject = new Subject<number>();
    const obs = subject.asObservable();
    const values: number[] = [];

    obs.subscribe((v) => values.push(v));
    subject.next(10);

    expect(values).toEqual([10]);
    expect(obs).toBeInstanceOf(Observable);
  });
});

describe('BehaviorSubject', () => {
  it('should emit current value on subscribe', () => {
    const subject = new BehaviorSubject<number>(42);
    const values: number[] = [];

    subject.subscribe((v) => values.push(v));

    expect(values).toEqual([42]);
  });

  it('should provide value via getter and getValue', () => {
    const subject = new BehaviorSubject<string>('hello');
    expect(subject.value).toBe('hello');
    expect(subject.getValue()).toBe('hello');

    subject.next('world');
    expect(subject.value).toBe('world');
  });

  it('should emit initial + subsequent values', () => {
    const subject = new BehaviorSubject<number>(0);
    const values: number[] = [];

    subject.subscribe((v) => values.push(v));
    subject.next(1);
    subject.next(2);

    expect(values).toEqual([0, 1, 2]);
  });

  it('should emit latest value to late subscribers', () => {
    const subject = new BehaviorSubject<number>(0);
    subject.next(1);
    subject.next(2);

    const values: number[] = [];
    subject.subscribe((v) => values.push(v));

    expect(values).toEqual([2]);
  });

  it('should not emit to subscriber after complete', () => {
    const subject = new BehaviorSubject<number>(0);
    subject.complete();

    const values: number[] = [];
    subject.subscribe((v) => values.push(v));

    expect(values).toEqual([]);
  });
});

describe('ReplaySubject', () => {
  it('should replay buffered values to new subscribers', () => {
    const subject = new ReplaySubject<number>(2);
    subject.next(1);
    subject.next(2);
    subject.next(3);

    const values: number[] = [];
    subject.subscribe((v) => values.push(v));

    expect(values).toEqual([2, 3]);
  });

  it('should replay all values with Infinity buffer', () => {
    const subject = new ReplaySubject<number>(Infinity);
    subject.next(1);
    subject.next(2);
    subject.next(3);

    const values: number[] = [];
    subject.subscribe((v) => values.push(v));

    expect(values).toEqual([1, 2, 3]);
  });

  it('should replay + receive live values', () => {
    const subject = new ReplaySubject<number>(1);
    subject.next(1);

    const values: number[] = [];
    subject.subscribe((v) => values.push(v));
    subject.next(2);

    expect(values).toEqual([1, 2]);
  });

  it('should not buffer after complete', () => {
    const subject = new ReplaySubject<number>(2);
    subject.next(1);
    subject.complete();
    subject.next(2);

    const values: number[] = [];
    subject.subscribe((v) => values.push(v));

    // Replays what was buffered before complete, but no live delivery
    expect(values).toEqual([1]);
  });
});

describe('Observable', () => {
  it('should call subscribe function on subscribe', () => {
    let called = false;
    const obs = new Observable<number>((cb) => {
      called = true;
      cb(42);
      return new Disposable(() => {});
    });

    const values: number[] = [];
    obs.subscribe((v) => values.push(v));

    expect(called).toBe(true);
    expect(values).toEqual([42]);
  });

  it('should support pipe with no operators', () => {
    const subject = new Subject<number>();
    const piped = subject.asObservable().pipe();
    const values: number[] = [];

    piped.subscribe((v) => values.push(v));
    subject.next(1);

    expect(values).toEqual([1]);
  });
});

describe('filter', () => {
  it('should filter values based on predicate', () => {
    const subject = new Subject<number>();
    const values: number[] = [];

    subject.pipe(filter((v) => v % 2 === 0)).subscribe((v) => values.push(v));

    subject.next(1);
    subject.next(2);
    subject.next(3);
    subject.next(4);

    expect(values).toEqual([2, 4]);
  });
});

describe('map', () => {
  it('should transform values', () => {
    const subject = new Subject<number>();
    const values: string[] = [];

    subject.pipe(map((v) => `v${v}`)).subscribe((v) => values.push(v));

    subject.next(1);
    subject.next(2);

    expect(values).toEqual(['v1', 'v2']);
  });
});

describe('distinctUntilChanged', () => {
  it('should skip consecutive duplicate values', () => {
    const subject = new Subject<number>();
    const values: number[] = [];

    subject.pipe(distinctUntilChanged()).subscribe((v) => values.push(v));

    subject.next(1);
    subject.next(1);
    subject.next(2);
    subject.next(2);
    subject.next(1);

    expect(values).toEqual([1, 2, 1]);
  });

  it('should support custom comparator', () => {
    const subject = new Subject<{ id: number }>();
    const values: { id: number }[] = [];

    subject.pipe(distinctUntilChanged((a, b) => a.id === b.id)).subscribe((v) => values.push(v));

    subject.next({ id: 1 });
    subject.next({ id: 1 });
    subject.next({ id: 2 });

    expect(values).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('should always emit first value', () => {
    const subject = new Subject<number>();
    const values: number[] = [];

    subject.pipe(distinctUntilChanged()).subscribe((v) => values.push(v));
    subject.next(5);

    expect(values).toEqual([5]);
  });
});

describe('pairwise', () => {
  it('should emit pairs of consecutive values', () => {
    const subject = new Subject<number>();
    const pairs: [number, number][] = [];

    subject.pipe(pairwise()).subscribe((v) => pairs.push(v));

    subject.next(1);
    subject.next(2);
    subject.next(3);

    expect(pairs).toEqual([
      [1, 2],
      [2, 3],
    ]);
  });

  it('should not emit on first value', () => {
    const subject = new Subject<number>();
    const pairs: [number, number][] = [];

    subject.pipe(pairwise()).subscribe((v) => pairs.push(v));
    subject.next(1);

    expect(pairs).toEqual([]);
  });
});

describe('mergeMap', () => {
  it('should flatten projected arrays', () => {
    const subject = new Subject<number>();
    const values: number[] = [];

    subject.pipe(mergeMap((v) => [v, v * 10])).subscribe((v) => values.push(v));

    subject.next(1);
    subject.next(2);

    expect(values).toEqual([1, 10, 2, 20]);
  });

  it('should handle empty arrays', () => {
    const subject = new Subject<number>();
    const values: number[] = [];

    subject.pipe(mergeMap((v, index) => (index === 0 ? [] : [v]))).subscribe((v) => values.push(v));

    subject.next(1);
    subject.next(2);

    expect(values).toEqual([2]);
  });
});

describe('share', () => {
  it('should share a single source subscription', () => {
    let subscribeCount = 0;
    const source = new Observable<number>((cb) => {
      subscribeCount++;
      cb(1);
      return new Disposable(() => {});
    });

    const shared = source.pipe(share());

    const a: number[] = [];
    const b: number[] = [];

    shared.subscribe((v) => a.push(v));
    shared.subscribe((v) => b.push(v));

    // Source subscribed only once
    expect(subscribeCount).toBe(1);
  });

  it('should resubscribe to source after all unsubscribe', () => {
    let subscribeCount = 0;
    const subject = new Subject<number>();
    const source = new Observable<number>((cb) => {
      subscribeCount++;
      return subject.subscribe(cb);
    });

    const shared = source.pipe(share());

    const sub1 = shared.subscribe(() => {});
    const sub2 = shared.subscribe(() => {});
    expect(subscribeCount).toBe(1);

    sub1.dispose();
    sub2.dispose();

    shared.subscribe(() => {});
    expect(subscribeCount).toBe(2);
  });

  it('should support custom connector', () => {
    const subject = new Subject<number>();
    const values: number[] = [];

    const shared = subject.asObservable().pipe(share({ connector: () => new ReplaySubject<number>(1) }));

    subject.next(1);

    // Subscribe after value was emitted; ReplaySubject should replay
    const sub1 = shared.subscribe((v) => values.push(v));

    // The source subscription happens on first subscribe, so the
    // value emitted before any subscriber won't be caught.
    // But subsequent values should be shared:
    subject.next(2);
    const lateValues: number[] = [];
    shared.subscribe((v) => lateValues.push(v));
    subject.next(3);

    sub1.dispose();

    expect(values).toContain(2);
    expect(lateValues).toContain(2); // replayed from ReplaySubject
    expect(lateValues).toContain(3);
  });
});

describe('pipe chaining', () => {
  it('should chain multiple operators', () => {
    const subject = new Subject<number>();
    const values: number[] = [];

    subject
      .pipe(
        filter((v) => v > 1),
        map((v) => v * 10),
        distinctUntilChanged(),
      )
      .subscribe((v) => values.push(v));

    subject.next(1);
    subject.next(2);
    subject.next(2);
    subject.next(3);

    expect(values).toEqual([20, 30]);
  });

  it('should work with BehaviorSubject pipe', () => {
    const subject = new BehaviorSubject<number>(0);
    const values: number[] = [];

    subject.pipe(distinctUntilChanged(), share({ connector: () => new ReplaySubject<number>(1) })).subscribe((v) => values.push(v));

    subject.next(1);
    subject.next(1);
    subject.next(2);

    expect(values).toEqual([0, 1, 2]);
  });
});

describe('firstValueFrom', () => {
  it('should resolve with first emitted value', async () => {
    const subject = new Subject<number>();

    const promise = firstValueFrom(subject);
    subject.next(42);

    expect(await promise).toBe(42);
  });

  it('should resolve immediately for BehaviorSubject', async () => {
    const subject = new BehaviorSubject<string>('hello');
    const value = await firstValueFrom(subject);
    expect(value).toBe('hello');
  });

  it('should resolve with replayed value for ReplaySubject', async () => {
    const subject = new ReplaySubject<number>(1);
    subject.next(99);

    const value = await firstValueFrom(subject);
    expect(value).toBe(99);
  });

  it('should reject for closed empty subject', async () => {
    const subject = new Subject<number>();
    subject.complete();

    await expect(firstValueFrom(subject)).rejects.toThrow();
  });

  it('should reject when subject completes after subscribe without emitting', async () => {
    const subject = new Subject<number>();
    const promise = firstValueFrom(subject);
    subject.complete();

    await expect(promise).rejects.toThrow();
  });
});
