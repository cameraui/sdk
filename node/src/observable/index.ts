/**
 * Lightweight reactive primitives for camera.ui.
 *
 * Provides cold Observables, multicast Subjects (Subject, BehaviorSubject,
 * ReplaySubject) and a small set of composable operators for building
 * property-change notifications and event streams throughout the SDK.
 */

/** A function that transforms one Observable into another. Used as a building block for `pipe()` operator chains. */
export type OperatorFn<T, R> = (source: Observable<T>) => Observable<R>;

/**
 * Subscription handle returned by `subscribe()`.
 *
 * Call `dispose()` (or its alias `unsubscribe()`) to detach the listener
 * and run any teardown logic registered by the producer. Disposing twice
 * is a no-op.
 */
export class Disposable {
  #closed = false;
  #teardown: () => void;

  constructor(teardown: () => void) {
    this.#teardown = teardown;
  }

  get closed(): boolean {
    return this.#closed;
  }

  dispose(): void {
    if (this.#closed) return;
    this.#closed = true;
    this.#teardown();
  }

  unsubscribe(): void {
    this.dispose();
  }
}

/**
 * Cold producer of a push-based value stream.
 *
 * The producer function passed to the constructor is executed once per
 * `subscribe()` call, so each subscriber gets its own independent run.
 * `subscribe()` returns a {@link Disposable} that stops the stream and
 * triggers any teardown registered by the producer.
 */
export class Observable<T> {
  /** @internal */
  _subscribe: (callback: (value: T) => void) => Disposable;

  constructor(subscribe: (callback: (value: T) => void) => Disposable) {
    this._subscribe = subscribe;
  }

  /**
   * Start the producer for this subscriber and route emitted values to `callback`.
   *
   * @param callback - Receiver invoked once per emitted value.
   *
   * @returns Disposable that stops the stream and runs producer teardown.
   *
   * @example
   * ```ts
   * const sub = sensor.onPropertyChanged.subscribe((change) => {
   *   console.log(change.property, change.value);
   * });
   * // later
   * sub.dispose();
   * ```
   */
  subscribe(callback: (value: T) => void): Disposable {
    return this._subscribe(callback);
  }

  pipe(): Observable<T>;
  pipe<A>(op1: OperatorFn<T, A>): Observable<A>;
  pipe<A, B>(op1: OperatorFn<T, A>, op2: OperatorFn<A, B>): Observable<B>;
  pipe<A, B, C>(op1: OperatorFn<T, A>, op2: OperatorFn<A, B>, op3: OperatorFn<B, C>): Observable<C>;
  pipe<A, B, C, D>(op1: OperatorFn<T, A>, op2: OperatorFn<A, B>, op3: OperatorFn<B, C>, op4: OperatorFn<C, D>): Observable<D>;
  pipe<A, B, C, D, E>(op1: OperatorFn<T, A>, op2: OperatorFn<A, B>, op3: OperatorFn<B, C>, op4: OperatorFn<C, D>, op5: OperatorFn<D, E>): Observable<E>;
  pipe(...operators: OperatorFn<any, any>[]): Observable<any> {
    let result: Observable<any> = this;
    for (const op of operators) {
      result = op(result);
    }
    return result;
  }
}

/**
 * Multicast value source.
 *
 * Calls to `next(value)` are dispatched synchronously to every active
 * subscriber. `complete()` releases all subscribers and locks the
 * Subject so further `next()` calls become no-ops. `subscribe()`
 * returns a {@link Disposable} for individual cleanup.
 */
export class Subject<T> {
  #subscribers = new Set<(value: T) => void>();
  #completeHandlers = new Set<() => void>();
  #completed = false;

  get closed(): boolean {
    return this.#completed;
  }

  next(value: T): void {
    if (this.#completed) return;
    for (const cb of this.#subscribers) {
      cb(value);
    }
  }

  complete(): void {
    if (this.#completed) return;
    this.#completed = true;
    this.#subscribers.clear();
    const handlers = [...this.#completeHandlers];
    this.#completeHandlers.clear();
    for (const handler of handlers) {
      handler();
    }
  }

  /**
   * Register a handler invoked once when this Subject completes. Runs
   * immediately if already completed. Used by {@link firstValueFrom}.
   *
   * @internal
   *
   * @param handler - Completion callback.
   *
   * @returns Disposable that cancels the registration.
   */
  _onComplete(handler: () => void): Disposable {
    if (this.#completed) {
      handler();
      return new Disposable(() => {});
    }
    this.#completeHandlers.add(handler);
    return new Disposable(() => {
      this.#completeHandlers.delete(handler);
    });
  }

  subscribe(callback: (value: T) => void): Disposable {
    if (this.#completed) {
      return new Disposable(() => {});
    }
    this.#subscribers.add(callback);
    return new Disposable(() => {
      this.#subscribers.delete(callback);
    });
  }

  pipe(): Observable<T>;
  pipe<A>(op1: OperatorFn<T, A>): Observable<A>;
  pipe<A, B>(op1: OperatorFn<T, A>, op2: OperatorFn<A, B>): Observable<B>;
  pipe<A, B, C>(op1: OperatorFn<T, A>, op2: OperatorFn<A, B>, op3: OperatorFn<B, C>): Observable<C>;
  pipe<A, B, C, D>(op1: OperatorFn<T, A>, op2: OperatorFn<A, B>, op3: OperatorFn<B, C>, op4: OperatorFn<C, D>): Observable<D>;
  pipe<A, B, C, D, E>(op1: OperatorFn<T, A>, op2: OperatorFn<A, B>, op3: OperatorFn<B, C>, op4: OperatorFn<C, D>, op5: OperatorFn<D, E>): Observable<E>;
  pipe(...operators: OperatorFn<any, any>[]): Observable<any> {
    let result: Observable<any> = this.asObservable();
    for (const op of operators) {
      result = op(result);
    }
    return result;
  }

  /**
   * Returns a read-only Observable that mirrors this Subject without
   * exposing `next()` or `complete()`. Useful for handing out a public
   * stream while keeping write access internal.
   *
   * @returns Read-only Observable view of this Subject.
   *
   * @example
   * ```ts
   * const subject = new Subject<number>();
   * export const events$ = subject.asObservable();
   * ```
   */
  asObservable(): Observable<T> {
    return new Observable<T>((cb) => this.subscribe(cb));
  }
}

/**
 * Subject seeded with an initial value that always remembers the latest
 * emission. New subscribers receive the current value immediately on
 * `subscribe()` and then all subsequent values. The current value is
 * also accessible synchronously via `value` and `getValue()`.
 */
export class BehaviorSubject<T> extends Subject<T> {
  #value: T;

  constructor(initialValue: T) {
    super();
    this.#value = initialValue;
  }

  override next(value: T): void {
    this.#value = value;
    super.next(value);
  }

  getValue(): T {
    return this.#value;
  }

  get value(): T {
    return this.#value;
  }

  override subscribe(callback: (value: T) => void): Disposable {
    const disposable = super.subscribe(callback);
    if (!this.closed) {
      callback(this.#value);
    }
    return disposable;
  }
}

/**
 * Subject that buffers up to the last `bufferSize` values (configurable,
 * defaults to unbounded). New subscribers immediately receive every
 * buffered value in order before continuing with live emissions.
 */
export class ReplaySubject<T> extends Subject<T> {
  #buffer: T[] = [];
  #bufferSize: number;

  constructor(bufferSize = Infinity) {
    super();
    this.#bufferSize = bufferSize;
  }

  override next(value: T): void {
    if (this.closed) return;
    this.#buffer.push(value);
    if (this.#buffer.length > this.#bufferSize) {
      this.#buffer.shift();
    }
    super.next(value);
  }

  override subscribe(callback: (value: T) => void): Disposable {
    // Replay buffered values before subscribing to live values
    for (const value of this.#buffer) {
      callback(value);
    }
    return super.subscribe(callback);
  }
}

/**
 * Emit only the values for which `predicate` returns `true`.
 *
 * @param predicate - Test invoked for each value; truthy passes downstream.
 *
 * @returns Operator that filters the source stream.
 *
 * @example
 * ```ts
 * import { filter } from '@camera.ui/sdk';
 *
 * sensor.onPropertyChanged
 *   .pipe(filter((c) => c.property === 'detected'))
 *   .subscribe((c) => console.log('motion:', c.value));
 * ```
 */
export function filter<T>(predicate: (value: T) => boolean): OperatorFn<T, T> {
  return (source) =>
    new Observable<T>((cb) =>
      source.subscribe((value) => {
        if (predicate(value)) cb(value);
      }),
    );
}

/**
 * Apply `transform` to each emitted value and emit the result.
 *
 * @param transform - Projection invoked for each upstream value.
 *
 * @returns Operator that maps every value into a new shape.
 *
 * @example
 * ```ts
 * import { map } from '@camera.ui/sdk';
 *
 * sensor.onPropertyChanged
 *   .pipe(map((c) => c.value as number))
 *   .subscribe((n) => console.log('battery %:', n));
 * ```
 */
export function map<T, R>(transform: (value: T) => R): OperatorFn<T, R> {
  return (source) =>
    new Observable<R>((cb) =>
      source.subscribe((value) => {
        cb(transform(value));
      }),
    );
}

/**
 * Emit a value only when it differs from the previous one. Uses `===` by
 * default, or an optional custom comparator (e.g. for deep equality).
 *
 * @param comparator - Equality function; return `true` to suppress duplicates.
 *
 * @returns Operator that drops consecutive equal values.
 *
 * @example
 * ```ts
 * import { distinctUntilChanged } from '@camera.ui/sdk';
 *
 * sensor.onPropertyChanged
 *   .pipe(distinctUntilChanged((a, b) => a.value === b.value))
 *   .subscribe((c) => console.log('changed:', c));
 * ```
 */
export function distinctUntilChanged<T>(comparator?: (previous: T, current: T) => boolean): OperatorFn<T, T> {
  return (source) =>
    new Observable<T>((cb) => {
      let hasValue = false;
      let lastValue: T;
      const compare = comparator ?? ((a: T, b: T) => a === b);
      return source.subscribe((value) => {
        if (!hasValue || !compare(lastValue, value)) {
          hasValue = true;
          lastValue = value;
          cb(value);
        }
      });
    });
}

/**
 * Emit `[previous, current]` pairs for every value after the first.
 *
 * @returns Operator that yields adjacent value pairs.
 *
 * @example
 * ```ts
 * import { pairwise } from '@camera.ui/sdk';
 *
 * sensor.onPropertyChanged
 *   .pipe(pairwise())
 *   .subscribe(([prev, curr]) => console.log(prev.value, '->', curr.value));
 * ```
 */
export function pairwise<T>(): OperatorFn<T, [T, T]> {
  return (source) =>
    new Observable<[T, T]>((cb) => {
      let hasValue = false;
      let prev: T;
      return source.subscribe((value) => {
        if (hasValue) {
          cb([prev, value]);
        }
        hasValue = true;
        prev = value;
      });
    });
}

/**
 * Project each source value to a list and flatten the results into the
 * output stream.
 *
 * @param project - Function returning an array of values for each input.
 *
 * @returns Operator that flattens projected arrays into a single stream.
 *
 * @example
 * ```ts
 * import { mergeMap } from '@camera.ui/sdk';
 *
 * motionSensor.onPropertyChanged
 *   .pipe(mergeMap((c) => (c.property === 'detections' ? c.value as any[] : [])))
 *   .subscribe((det) => console.log('detection:', det));
 * ```
 */
export function mergeMap<T, R>(project: (value: T, index: number) => R[]): OperatorFn<T, R> {
  return (source) =>
    new Observable<R>((cb) => {
      let index = 0;
      return source.subscribe((value) => {
        const results = project(value, index++);
        for (const r of results) {
          cb(r);
        }
      });
    });
}

/**
 * Multicast a cold Observable through a Subject, sharing a single upstream
 * subscription among all subscribers (reference-counted). Supply a custom
 * connector (e.g. `() => new ReplaySubject(1)`) to change buffering.
 *
 * @param config - Optional config with a `connector` factory for the Subject.
 *
 * @param config.connector - Factory returning the multicast Subject to use.
 *
 * @returns Operator that multicasts the source.
 *
 * @example
 * ```ts
 * import { share, ReplaySubject } from '@camera.ui/sdk';
 *
 * const events$ = source$.pipe(share({ connector: () => new ReplaySubject(1) }));
 * events$.subscribe((v) => console.log('a', v));
 * events$.subscribe((v) => console.log('b', v));
 * ```
 */
export function share<T>(config?: { connector: () => Subject<T> }): OperatorFn<T, T> {
  return (source) => {
    let subject: Subject<T> | null = null;
    let sourceDisposable: Disposable | null = null;
    let refCount = 0;

    return new Observable<T>((cb) => {
      if (!subject) {
        subject = config?.connector ? config.connector() : new Subject<T>();
        sourceDisposable = source.subscribe((value) => {
          subject!.next(value);
        });
      }

      refCount++;
      const sub = subject.subscribe(cb);

      return new Disposable(() => {
        sub.dispose();
        refCount--;
        if (refCount === 0) {
          sourceDisposable?.dispose();
          sourceDisposable = null;
          subject = null;
        }
      });
    });
  };
}

/**
 * Subscribe to the source and return a Promise that resolves with its first
 * emitted value, then disposes the subscription. Rejects if the source
 * completes before emitting (Subject, BehaviorSubject, ReplaySubject). A bare
 * Observable has no completion signal, so the Promise stays pending until it
 * emits.
 *
 * @param observable - Source stream to await.
 *
 * @returns Promise that resolves with the first emitted value.
 *
 * @example
 * ```ts
 * import { firstValueFrom } from '@camera.ui/sdk';
 *
 * const change = await firstValueFrom(sensor.onPropertyChanged);
 * console.log('first change:', change.property);
 * ```
 */
export function firstValueFrom<T>(observable: Observable<T> | Subject<T> | ReplaySubject<T> | BehaviorSubject<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    // Callbacks may fire synchronously during subscribe()/_onComplete()
    // (BehaviorSubject/ReplaySubject/already-completed), so declare the
    // handles up front and clean up both on settle.
    let valueSub: Disposable | undefined = undefined;
    let completeSub: Disposable | undefined = undefined;
    const cleanup = (): void => {
      valueSub?.dispose();
      completeSub?.dispose();
    };

    valueSub = observable.subscribe((value) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(value);
    });

    if (settled) {
      cleanup();
      return;
    }

    if (observable instanceof Subject) {
      completeSub = observable._onComplete(() => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error('Observable completed without emitting a value'));
      });
    }
  });
}
