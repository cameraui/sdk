import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MediaPlayerControl, MediaPlayerCommand, MediaPlayerProperty } from '../sensor/mediaPlayer.js';
import { LightControl, LightProperty } from '../sensor/light.js';
import { WRITE_TIMEOUT_MS, WriteLane } from './write-lane.js';

function deferred() {
  let resolve!: () => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('WriteLane', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('runs one write at a time in arrival order', async () => {
    const lane = new WriteLane();
    const ran: string[] = [];
    const first = deferred();
    const a = lane.write('a', () => (ran.push('a'), first.promise), true);
    const b = lane.write('b', () => void ran.push('b'), true);

    await vi.advanceTimersByTimeAsync(0);
    expect(ran).toEqual(['a']);
    first.resolve();
    await Promise.all([a, b]);
    expect(ran).toEqual(['a', 'b']);
  });

  it('lets a newer value replace the waiting one, both callers learn its outcome', async () => {
    const lane = new WriteLane();
    const ran: number[] = [];
    const first = deferred();
    lane.write('level', () => (ran.push(10), first.promise), true);
    const replaced = lane.write('level', () => void ran.push(20), true);
    const newest = lane.write('level', () => void ran.push(30), true);

    first.resolve();
    await Promise.all([replaced, newest]);
    expect(ran).toEqual([10, 30]);
  });

  it('moves a replaced value behind what came in between, a stop stays after the move', async () => {
    const lane = new WriteLane();
    const ran: string[] = [];
    const first = deferred();
    lane.write('position', () => (ran.push('position 10'), first.promise), true);
    lane.write('position', () => void ran.push('position 20'), true);
    lane.write('stop', () => void ran.push('stop'), true);
    const last = lane.write('position', () => void ran.push('position 30'), true);

    first.resolve();
    await last;
    expect(ran).toEqual(['position 10', 'stop', 'position 30']);
  });

  it('runs every command', async () => {
    const lane = new WriteLane();
    const ran: string[] = [];
    const first = deferred();
    lane.write('command', () => (ran.push('next'), first.promise), false);
    lane.write('command', () => void ran.push('next'), false);
    const last = lane.write('command', () => void ran.push('next'), false);

    first.resolve();
    await last;
    expect(ran).toEqual(['next', 'next', 'next']);
  });

  it('rejects with the setter error and goes on with the next write', async () => {
    const lane = new WriteLane();
    const failed = lane.write('on', () => Promise.reject(new Error('offline')), true);
    const thrown = lane.write(
      'mode',
      () => {
        throw new Error('unsupported');
      },
      true,
    );
    const next = lane.write('level', () => undefined, true);

    await expect(failed).rejects.toThrow('offline');
    await expect(thrown).rejects.toThrow('unsupported');
    await expect(next).resolves.toBeUndefined();
  });

  it('gives up on a write without an answer and goes on', async () => {
    const lane = new WriteLane();
    const hanging = lane.write('on', () => new Promise<void>(() => {}), true);
    const outcome = expect(hanging).rejects.toThrow('No answer to on');
    await vi.advanceTimersByTimeAsync(WRITE_TIMEOUT_MS / 2);
    const next = lane.write('level', () => undefined, true);

    await vi.advanceTimersByTimeAsync(WRITE_TIMEOUT_MS / 2);
    await outcome;
    await expect(next).resolves.toBeUndefined();
  });

  it('drops a write that waited the whole time behind one without an answer', async () => {
    const lane = new WriteLane();
    const ran: string[] = [];
    const hanging = lane.write('a', () => new Promise<void>(() => {}), true);
    const late = lane.write('b', () => void ran.push('b'), true);
    const outcomes = Promise.all([expect(hanging).rejects.toThrow('No answer to a'), expect(late).rejects.toThrow('No answer to b')]);

    await vi.advanceTimersByTimeAsync(WRITE_TIMEOUT_MS);
    await outcomes;
    expect(ran).toEqual([]);
  });
});

describe('Sensor.updateValue', () => {
  it('rejects when the plugin setter refuses', async () => {
    class Refusing extends LightControl {
      override async setBrightness(): Promise<void> {
        throw new Error('bulb unreachable');
      }
    }
    const light = new Refusing('Desk');

    await expect(light.updateValue(LightProperty.Brightness, 40)).rejects.toThrow('bulb unreachable');
    expect(light.brightness).toBe(100);
  });

  it('refuses a write while its source is unavailable', async () => {
    const sent: number[] = [];
    class Lamp extends LightControl {
      override async setBrightness(value: number): Promise<void> {
        sent.push(value);
        await super.setBrightness(value);
      }
    }
    const light = new Lamp('Desk');
    light.setSourceState('unavailable');

    await expect(light.updateValue(LightProperty.Brightness, 40)).rejects.toThrow('Desk is not reachable');
    light.setSourceState('connected');
    await light.updateValue(LightProperty.Brightness, 50);
    expect(sent).toEqual([50]);
  });

  it('runs every media command, also when they come quickly', async () => {
    const sent: string[] = [];
    class Player extends MediaPlayerControl {
      override async next(): Promise<void> {
        sent.push(MediaPlayerCommand.Next);
      }
    }
    const player = new Player('TV');

    await Promise.all([
      player.updateValue(MediaPlayerProperty.Command, MediaPlayerCommand.Next),
      player.updateValue(MediaPlayerProperty.Command, MediaPlayerCommand.Next),
      player.updateValue(MediaPlayerProperty.Command, MediaPlayerCommand.Next),
    ]);
    expect(sent).toEqual([MediaPlayerCommand.Next, MediaPlayerCommand.Next, MediaPlayerCommand.Next]);
  });
});
