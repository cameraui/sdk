import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CHIME_AUTO_RESET_MS, ChimeControl, ChimeProperty } from './chime.js';
import { COMMAND_AUTO_RESET_MS } from './command.js';
import { DisplayControl, DisplayProperty } from './display.js';
import { LawnMowerCommand, LawnMowerControl, LawnMowerProperty } from './lawnMower.js';
import { MediaPlayerCommand, MediaPlayerControl, MediaPlayerKind, MediaPlayerProperty, MediaPlayerState } from './mediaPlayer.js';
import { VacuumActivity, VacuumCommand, VacuumControl, VacuumProperty } from './vacuum.js';

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

describe('robots', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('runs the method of a written command and reads empty again after the reset time', async () => {
    class Vacuum extends VacuumControl {
      docked = 0;

      override async dock(): Promise<void> {
        this.docked++;
        await super.dock();
      }
    }
    const vacuum = new Vacuum();
    await vacuum.updateValue(VacuumProperty.Command, VacuumCommand.Dock);
    await vacuum.updateValue(VacuumProperty.Command, VacuumCommand.Dock);
    expect(vacuum.docked).toBe(2);
    expect(vacuum.getValue(VacuumProperty.Command)).toBe(VacuumCommand.Dock);
    vi.advanceTimersByTime(COMMAND_AUTO_RESET_MS);
    expect(vacuum.getValue(VacuumProperty.Command)).toBe('');
  });

  it('keeps the activity a plugin reports and the fan speed it was set to', async () => {
    const vacuum = new VacuumControl();
    expect(vacuum.activity).toBeUndefined();
    await vacuum.updateValue(VacuumProperty.FanSpeed, 'turbo');
    vacuum.setActivity(VacuumActivity.Cleaning);
    expect([vacuum.activity, vacuum.fanSpeed]).toEqual(['cleaning', 'turbo']);

    const mower = new LawnMowerControl();
    await mower.updateValue(LawnMowerProperty.Command, LawnMowerCommand.Start);
    expect(mower.getValue(LawnMowerProperty.Command)).toBe(LawnMowerCommand.Start);
  });
});

describe('media player', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('takes commands, power and sound, and reads on from the state', async () => {
    const player = new MediaPlayerControl();
    await player.updateValue(MediaPlayerProperty.Command, MediaPlayerCommand.Next);
    expect(player.getValue(MediaPlayerProperty.Command)).toBe(MediaPlayerCommand.Next);
    vi.advanceTimersByTime(COMMAND_AUTO_RESET_MS);
    expect(player.getValue(MediaPlayerProperty.Command)).toBe('');

    await player.updateValue(MediaPlayerProperty.On, true);
    await player.updateValue(MediaPlayerProperty.Volume, 130);
    await player.updateValue(MediaPlayerProperty.Muted, true);
    expect([player.on, player.volume, player.muted]).toEqual([true, 100, true]);

    player.setState(MediaPlayerState.Off);
    expect(player.on).toBe(false);
    player.setState(MediaPlayerState.Playing);
    player.setNowPlaying('So What', 'Miles Davis');
    expect([player.on, player.title, player.artist]).toEqual([true, 'So What', 'Miles Davis']);
    player.setNowPlaying();
    expect([player.title, player.artist]).toEqual(['', '']);
  });

  it('narrows the kind to the one it is', () => {
    const player = new MediaPlayerControl();
    player.setKind(MediaPlayerKind.Tv);
    expect(player.kind).toBe(MediaPlayerKind.Tv);
    expect(player.toJSON().propertySpecs?.[MediaPlayerProperty.Kind]?.values).toEqual([MediaPlayerKind.Tv]);
  });
});
