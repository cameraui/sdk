import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CHIME_AUTO_RESET_MS, ChimeControl, ChimeProperty } from './chime.js';
import { DisplayControl, DisplayProperty } from './display.js';

describe('chime', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('counts as done after the reset time unless the plugin stops it first', async () => {
    const chime = new ChimeControl();
    await chime.updateValue(ChimeProperty.Active, true);
    expect(chime.active).toBe(true);
    vi.advanceTimersByTime(CHIME_AUTO_RESET_MS);
    expect(chime.active).toBe(false);

    await chime.play();
    await chime.stop();
    await chime.play();
    vi.advanceTimersByTime(CHIME_AUTO_RESET_MS - 1);
    expect(chime.active).toBe(true);
  });

  it('clamps volume and repeat', async () => {
    const chime = new ChimeControl();
    await chime.updateValue(ChimeProperty.Volume, 140);
    await chime.updateValue(ChimeProperty.Repeat, 0);
    expect([chime.volume, chime.repeat]).toEqual([100, 1]);
  });
});

describe('display', () => {
  it('shows either a text or a preset', async () => {
    const display = new DisplayControl();
    await display.updateValue(DisplayProperty.Preset, 'LEAVE_PACKAGE');
    await display.updateValue(DisplayProperty.Message, 'Back soon');
    expect([display.message, display.preset]).toEqual(['Back soon', '']);
    await display.updateValue(DisplayProperty.Preset, 'LEAVE_PACKAGE');
    expect([display.message, display.preset]).toEqual(['', 'LEAVE_PACKAGE']);
  });
});
