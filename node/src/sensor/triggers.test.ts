import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ACCESS_AUTO_RESET_MS, AccessMethod, AccessResult, AccessTrigger } from './access.js';
import { ButtonPress, ButtonTrigger, PRESS_AUTO_RESET_MS } from './button.js';

function recorded(sensor: ButtonTrigger | AccessTrigger): Record<string, unknown>[] {
  const deltas: Record<string, unknown>[] = [];
  sensor._init((delta) => deltas.push(delta));
  return deltas;
}

describe('button', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('offers a single press and the presses passed, as the values of press', () => {
    expect(new ButtonTrigger('Remote').toJSON().propertySpecs).toEqual({ press: { values: ['single'] } });
    const button = new ButtonTrigger('Remote', { presses: [ButtonPress.Long, ButtonPress.Single] });
    expect(button.toJSON().propertySpecs).toEqual({ press: { values: ['single', 'long'] } });
    expect(() => button.press(ButtonPress.Double)).toThrow(/double/);
  });

  it('sets the press and clears it after the reset time', () => {
    const button = new ButtonTrigger('Remote', { index: 2 });
    const deltas = recorded(button);
    expect(button.index).toBe(2);

    button.press();
    expect(button.pressed).toBe(ButtonPress.Single);
    vi.advanceTimersByTime(PRESS_AUTO_RESET_MS);
    expect(button.pressed).toBe('');
    expect(deltas).toEqual([{ press: 'single' }, { press: '' }]);
  });

  it('counts a press during the last one as a new one', () => {
    const button = new ButtonTrigger('Remote');
    const deltas = recorded(button);

    button.press();
    vi.advanceTimersByTime(PRESS_AUTO_RESET_MS - 100);
    button.press();
    vi.advanceTimersByTime(PRESS_AUTO_RESET_MS - 100);
    expect(button.pressed).toBe(ButtonPress.Single);
    expect(deltas).toEqual([{ press: 'single' }, { press: '' }, { press: 'single' }]);
  });
});

describe('access reader', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('writes method and user before the result and clears only the result', () => {
    const reader = new AccessTrigger('Door');
    const deltas = recorded(reader);

    reader.report(AccessResult.Granted, { method: AccessMethod.Fingerprint, user: 'Anna' });
    vi.advanceTimersByTime(ACCESS_AUTO_RESET_MS);
    reader.report(AccessResult.Denied, { method: AccessMethod.Nfc });

    expect(deltas).toEqual([{ method: 'fingerprint', user: 'Anna' }, { result: 'granted' }, { result: '' }, { method: 'nfc', user: '' }, { result: 'denied' }]);
  });
});
