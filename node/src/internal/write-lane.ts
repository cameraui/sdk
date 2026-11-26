/** @internal */
export const WRITE_TIMEOUT_MS = 10_000;

// a caller waits a little longer than the lane, so the lane's own answer arrives first
/** @internal */
export const WRITE_CALL_TIMEOUT_MS = WRITE_TIMEOUT_MS + 2_000;

// writes a sensor accepts at once, the lane needs the next one to arrive while one runs
/** @internal */
export const WRITE_CONCURRENCY = 16;

interface Waiter {
  resolve: () => void;
  reject: (error: unknown) => void;
}

interface Write {
  property: string;
  apply: () => void | Promise<void>;
  waiters: Waiter[];
  deadline: number;
}

type Outcome = { ok: true } | { ok: false; error: unknown };

/** @internal */
export class WriteLane {
  #queue: Write[] = [];
  #running = false;

  write(property: string, apply: () => void | Promise<void>, replaces: boolean): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const waiters: Waiter[] = [{ resolve, reject }];
      const waiting = replaces ? this.#queue.findIndex((write) => write.property === property) : -1;
      // the replaced caller learns how the newer value went
      if (waiting >= 0) waiters.unshift(...this.#queue.splice(waiting, 1)[0].waiters);
      this.#queue.push({ property, apply, waiters, deadline: Date.now() + WRITE_TIMEOUT_MS });
      this.#next();
    });
  }

  #next(): void {
    if (this.#running) return;
    const write = this.#queue.shift();
    if (!write) return;

    const left = write.deadline - Date.now();
    if (left <= 0) {
      settle(write, { ok: false, error: noAnswer(write.property) });
      this.#next();
      return;
    }

    this.#running = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const done = run(write.apply);
    // a device call that hangs keeps its promise, the lane goes on without it
    const late = new Promise<Outcome>((resolve) => {
      timer = setTimeout(() => resolve({ ok: false, error: noAnswer(write.property) }), left);
    });
    Promise.race([done, late]).then((outcome) => {
      clearTimeout(timer);
      settle(write, outcome);
      this.#running = false;
      this.#next();
    });
  }
}

/** @internal */
function run(apply: () => void | Promise<void>): Promise<Outcome> {
  try {
    return Promise.resolve(apply()).then(
      (): Outcome => ({ ok: true }),
      (error: unknown): Outcome => ({ ok: false, error }),
    );
  } catch (error) {
    return Promise.resolve({ ok: false, error });
  }
}

/** @internal */
function settle(write: Write, outcome: Outcome): void {
  for (const waiter of write.waiters) {
    if (outcome.ok) waiter.resolve();
    else waiter.reject(outcome.error);
  }
}

/** @internal */
function noAnswer(property: string): Error {
  return new Error(`No answer to ${property} within ${WRITE_TIMEOUT_MS / 1000} s`);
}
