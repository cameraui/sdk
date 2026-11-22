import { SensorCategory, SensorType } from './base.js';
import { CommandControl } from './command.js';
import { defineSensor, SensorDomain } from './meta.js';
import { PERCENT } from '../internal/shared-utils.js';

import type { Observable } from '../observable/index.js';
import type { PropertyChangeOf, SensorLike, SensorOptions } from './base.js';

/** What a media player does right now. */
export enum MediaPlayerState {
  Off = 'off',
  /** On, without telling what it does. */
  On = 'on',
  Idle = 'idle',
  Playing = 'playing',
  Paused = 'paused',
  Buffering = 'buffering',
}

/** What kind of device a media player is. */
export enum MediaPlayerKind {
  Tv = 'tv',
  Speaker = 'speaker',
  Receiver = 'receiver',
  Projector = 'projector',
}

/** Commands a media player takes. */
export enum MediaPlayerCommand {
  Play = 'play',
  Pause = 'pause',
  Stop = 'stop',
  Next = 'next',
  Previous = 'previous',
}

/** Optional capabilities of a media player. */
export enum MediaPlayerCapability {
  /** Player turns on and off. */
  Power = 'power',
  /** Player sets its volume. */
  Volume = 'volume',
  /** Player mutes. */
  Mute = 'mute',
  /** Player switches between inputs or apps. */
  Source = 'source',
  /** Player reports the title and artist it plays. */
  NowPlaying = 'nowPlaying',
}

/** Property names of a media player. */
export enum MediaPlayerProperty {
  /** Whether the player is on, writable with the `power` capability. */
  On = 'on',
  /** What the player does right now, a {@link MediaPlayerState}. */
  State = 'state',
  /** What kind of device it is, a {@link MediaPlayerKind}. */
  Kind = 'kind',
  /** One-off {@link MediaPlayerCommand} when written, empty again right after. */
  Command = 'command',
  /** Volume, 0 to 100. */
  Volume = 'volume',
  /** Whether the sound is muted. */
  Muted = 'muted',
  /** Selected input or app, one of the choices the plugin sets. */
  Source = 'source',
  /** Title of what plays. */
  Title = 'title',
  /** Artist of what plays. */
  Artist = 'artist',
}

/** Property values of a media player. */
export interface MediaPlayerControlProperties {
  [MediaPlayerProperty.On]: boolean;
  [MediaPlayerProperty.State]: MediaPlayerState | undefined;
  [MediaPlayerProperty.Kind]: MediaPlayerKind | undefined;
  [MediaPlayerProperty.Command]: MediaPlayerCommand | '';
  [MediaPlayerProperty.Volume]: number | undefined;
  [MediaPlayerProperty.Muted]: boolean;
  [MediaPlayerProperty.Source]: string | undefined;
  [MediaPlayerProperty.Title]: string | undefined;
  [MediaPlayerProperty.Artist]: string | undefined;
}

/** Read-only proxy interface for a media player. */
export interface MediaPlayerControlLike extends SensorLike {
  readonly type: SensorType.MediaPlayer;
  readonly onPropertyChanged: Observable<PropertyChangeOf<MediaPlayerControlProperties>>;
  readonly onCapabilitiesChanged: Observable<MediaPlayerCapability[]>;

  getValue(property: MediaPlayerProperty.On): boolean | undefined;
  getValue(property: MediaPlayerProperty.State): MediaPlayerState | undefined;
  getValue(property: MediaPlayerProperty.Kind): MediaPlayerKind | undefined;
  getValue(property: MediaPlayerProperty.Command): MediaPlayerCommand | '' | undefined;
  getValue(property: MediaPlayerProperty.Volume): number | undefined;
  getValue(property: MediaPlayerProperty.Muted): boolean | undefined;
  getValue(property: MediaPlayerProperty.Source): string | undefined;
  getValue(property: MediaPlayerProperty.Title): string | undefined;
  getValue(property: MediaPlayerProperty.Artist): string | undefined;
  getValue(property: string): unknown;
}

/**
 * A TV, speaker, receiver or projector. Override `setOn()`, `setOff()`,
 * `play()`, `pause()`, `stop()`, `next()`, `previous()`, `setVolume()`,
 * `setMuted()` and `setSource()` to drive hardware and call the `super` method
 * after success. Report what the player does with `setState()` and what plays
 * with `setNowPlaying()`.
 *
 * `setKind()` says what kind of device it is. Narrow the commands to those the
 * player takes with `setPropertySpec(MediaPlayerProperty.Command, { values: [...] })`.
 * The inputs come as choices with the `source` capability:
 * `setPropertySpec(MediaPlayerProperty.Source, { choices })`.
 *
 * @example
 * ```ts
 * class LivingRoomTv extends MediaPlayerControl {
 *   constructor() {
 *     super('Living Room TV');
 *     this.setKind(MediaPlayerKind.Tv);
 *     this.setPropertySpec(MediaPlayerProperty.Command, { values: [MediaPlayerCommand.Play, MediaPlayerCommand.Pause] });
 *   }
 *
 *   override async play(): Promise<void> {
 *     await tv.play();
 *     await super.play();
 *   }
 * }
 * ```
 */
export class MediaPlayerControl<TStorage extends object = Record<string, any>> extends CommandControl<MediaPlayerControlProperties, TStorage, MediaPlayerCapability> {
  readonly type = SensorType.MediaPlayer;

  constructor(name = 'Media Player', options?: SensorOptions) {
    super(name, options);

    this._writeState({ [MediaPlayerProperty.On]: false, [MediaPlayerProperty.Muted]: false });
  }

  /** Whether the player is on. */
  get on(): boolean {
    return this.props.on;
  }

  /** What the player does right now. */
  get state(): MediaPlayerState | undefined {
    return this.props.state;
  }

  /** What kind of device it is. */
  get kind(): MediaPlayerKind | undefined {
    return this.props.kind;
  }

  /** Volume, 0 to 100. */
  get volume(): number | undefined {
    return this.props.volume;
  }

  /** Whether the sound is muted. */
  get muted(): boolean {
    return this.props.muted;
  }

  /** Selected input or app. */
  get source(): string | undefined {
    return this.props.source;
  }

  /** Title of what plays. */
  get title(): string | undefined {
    return this.props.title;
  }

  /** Artist of what plays. */
  get artist(): string | undefined {
    return this.props.artist;
  }

  /**
   * Turn the player on. Override to drive hardware and call
   * `await super.setOn()` after success.
   *
   * @example
   * ```ts
   * await player.setOn();
   * ```
   */
  async setOn(): Promise<void> {
    this._writeState({ [MediaPlayerProperty.On]: true });
  }

  /**
   * Turn the player off. Override to drive hardware and call
   * `await super.setOff()` after success.
   *
   * @example
   * ```ts
   * await player.setOff();
   * ```
   */
  async setOff(): Promise<void> {
    this._writeState({ [MediaPlayerProperty.On]: false });
  }

  /**
   * Start or resume playback. Override to drive hardware and call
   * `await super.play()` after success.
   *
   * @example
   * ```ts
   * await player.play();
   * ```
   */
  async play(): Promise<void> {
    this._sent(MediaPlayerCommand.Play);
  }

  /**
   * Pause playback. Override to drive hardware and call `await super.pause()`
   * after success.
   *
   * @example
   * ```ts
   * await player.pause();
   * ```
   */
  async pause(): Promise<void> {
    this._sent(MediaPlayerCommand.Pause);
  }

  /**
   * Stop playback. Override to drive hardware and call `await super.stop()`
   * after success.
   *
   * @example
   * ```ts
   * await player.stop();
   * ```
   */
  async stop(): Promise<void> {
    this._sent(MediaPlayerCommand.Stop);
  }

  /**
   * Skip to the next track or channel. Override to drive hardware and call
   * `await super.next()` after success.
   *
   * @example
   * ```ts
   * await player.next();
   * ```
   */
  async next(): Promise<void> {
    this._sent(MediaPlayerCommand.Next);
  }

  /**
   * Go back to the previous track or channel. Override to drive hardware and
   * call `await super.previous()` after success.
   *
   * @example
   * ```ts
   * await player.previous();
   * ```
   */
  async previous(): Promise<void> {
    this._sent(MediaPlayerCommand.Previous);
  }

  /**
   * Set the volume. Override to drive hardware and call
   * `await super.setVolume(volume)` after success to sync the SDK state.
   *
   * @param volume - 0 to 100, clamped and rounded.
   *
   * @example
   * ```ts
   * await player.setVolume(30);
   * ```
   */
  async setVolume(volume: number): Promise<void> {
    if (!Number.isFinite(volume)) return;
    this._writeState({ [MediaPlayerProperty.Volume]: Math.max(0, Math.min(100, Math.round(volume))) });
  }

  /**
   * Mute or unmute the sound. Override to drive hardware and call
   * `await super.setMuted(muted)` after success.
   *
   * @param muted - Whether the sound is muted.
   *
   * @example
   * ```ts
   * await player.setMuted(true);
   * ```
   */
  async setMuted(muted: boolean): Promise<void> {
    this._writeState({ [MediaPlayerProperty.Muted]: muted });
  }

  /**
   * Switch to another input or app. Override to drive hardware and call
   * `await super.setSource(value)` after success.
   *
   * @param value - One of the source choices.
   *
   * @example
   * ```ts
   * await player.setSource('hdmi1');
   * ```
   */
  async setSource(value: string): Promise<void> {
    this._writeState({ [MediaPlayerProperty.Source]: value });
  }

  /**
   * Report what the player does right now. `on` follows: everything but `off`
   * counts as on.
   *
   * @param value - Off, on, idle, playing, paused or buffering.
   *
   * @example
   * ```ts
   * player.setState(MediaPlayerState.Playing);
   * ```
   */
  setState(value: MediaPlayerState): void {
    this._writeState({ [MediaPlayerProperty.State]: value, [MediaPlayerProperty.On]: value !== MediaPlayerState.Off });
  }

  /**
   * Say what kind of device the player is. Smart homes show it by its kind,
   * and Home Assistant takes it as the device class.
   *
   * @param kind - TV, speaker, receiver or projector.
   *
   * @example
   * ```ts
   * player.setKind(MediaPlayerKind.Speaker);
   * ```
   */
  setKind(kind: MediaPlayerKind): void {
    this._writeState({ [MediaPlayerProperty.Kind]: kind });
    this.setPropertySpec(MediaPlayerProperty.Kind, { values: [kind] });
  }

  /**
   * Report what plays, needs the `nowPlaying` capability. Leave both out when
   * nothing plays.
   *
   * @param title - Title of the track, show or channel.
   *
   * @param artist - Artist of the track.
   *
   * @example
   * ```ts
   * player.setNowPlaying('So What', 'Miles Davis');
   * ```
   */
  setNowPlaying(title?: string, artist?: string): void {
    this._writeState({ [MediaPlayerProperty.Title]: title ?? '', [MediaPlayerProperty.Artist]: artist ?? '' });
  }

  /** @internal */
  async updateValue(property: string, value: unknown): Promise<void> {
    switch (property as MediaPlayerProperty) {
      case MediaPlayerProperty.On:
        await (value ? this.setOn() : this.setOff());
        return;
      case MediaPlayerProperty.Volume:
        await this.setVolume(Number(value));
        return;
      case MediaPlayerProperty.Muted:
        await this.setMuted(Boolean(value));
        return;
      case MediaPlayerProperty.Source:
        await this.setSource(String(value));
        return;
    }
    if ((property as MediaPlayerProperty) !== MediaPlayerProperty.Command) return;
    switch (value as MediaPlayerCommand) {
      case MediaPlayerCommand.Play:
        return await this.play();
      case MediaPlayerCommand.Pause:
        return await this.pause();
      case MediaPlayerCommand.Stop:
        return await this.stop();
      case MediaPlayerCommand.Next:
        return await this.next();
      case MediaPlayerCommand.Previous:
        return await this.previous();
    }
  }
}

const MEDIA_PLAYER_COMMANDS = {
  play: MediaPlayerCommand.Play,
  pause: MediaPlayerCommand.Pause,
  stop: MediaPlayerCommand.Stop,
  next: MediaPlayerCommand.Next,
  previous: MediaPlayerCommand.Previous,
};

/** Registry metadata for {@link MediaPlayerControl}. */
export const mediaPlayerMeta = defineSensor({
  type: SensorType.MediaPlayer,
  category: SensorCategory.Control,
  assignmentKey: 'mediaPlayer',
  multiProvider: true,
  isDetectionType: false,
  properties: {
    [MediaPlayerProperty.On]: { type: 'boolean', writable: true },
    [MediaPlayerProperty.State]: {
      type: 'enum',
      values: {
        off: MediaPlayerState.Off,
        on: MediaPlayerState.On,
        idle: MediaPlayerState.Idle,
        playing: MediaPlayerState.Playing,
        paused: MediaPlayerState.Paused,
        buffering: MediaPlayerState.Buffering,
      },
    },
    [MediaPlayerProperty.Kind]: {
      type: 'enum',
      values: { tv: MediaPlayerKind.Tv, speaker: MediaPlayerKind.Speaker, receiver: MediaPlayerKind.Receiver, projector: MediaPlayerKind.Projector },
    },
    [MediaPlayerProperty.Command]: { type: 'enum', values: MEDIA_PLAYER_COMMANDS, writable: true },
    [MediaPlayerProperty.Volume]: { ...PERCENT, writable: true },
    [MediaPlayerProperty.Muted]: { type: 'boolean', writable: true },
    [MediaPlayerProperty.Source]: { type: 'string', writable: true },
    [MediaPlayerProperty.Title]: { type: 'string' },
    [MediaPlayerProperty.Artist]: { type: 'string' },
  },
  shortcutable: true,
  cascadeTrigger: { property: MediaPlayerProperty.State, values: Object.values(MediaPlayerState).filter((state) => state !== MediaPlayerState.Off), sustained: true },
  propertyCapabilities: {
    [MediaPlayerProperty.On]: MediaPlayerCapability.Power,
    [MediaPlayerProperty.Volume]: MediaPlayerCapability.Volume,
    [MediaPlayerProperty.Muted]: MediaPlayerCapability.Mute,
    [MediaPlayerProperty.Source]: MediaPlayerCapability.Source,
    [MediaPlayerProperty.Title]: MediaPlayerCapability.NowPlaying,
    [MediaPlayerProperty.Artist]: MediaPlayerCapability.NowPlaying,
  },
  virtual: {
    properties: { [MediaPlayerProperty.State]: MediaPlayerState.Off, [MediaPlayerProperty.Kind]: MediaPlayerKind.Tv },
    capabilities: [MediaPlayerCapability.Power, MediaPlayerCapability.Volume, MediaPlayerCapability.Mute],
    optionalCapabilities: {
      [MediaPlayerCapability.Power]: { [MediaPlayerProperty.On]: false },
      [MediaPlayerCapability.Volume]: { [MediaPlayerProperty.Volume]: 50 },
      [MediaPlayerCapability.Mute]: { [MediaPlayerProperty.Muted]: false },
      [MediaPlayerCapability.Source]: {},
      [MediaPlayerCapability.NowPlaying]: {},
    },
  },
  semantics: {
    domain: SensorDomain.MediaPlayer,
    stateProperty: MediaPlayerProperty.State,
    commandProperty: MediaPlayerProperty.Command,
    deviceClassProperty: MediaPlayerProperty.Kind,
    commands: MEDIA_PLAYER_COMMANDS,
    mediaPlayer: {
      power: MediaPlayerProperty.On,
      volume: MediaPlayerProperty.Volume,
      muted: MediaPlayerProperty.Muted,
      source: MediaPlayerProperty.Source,
      title: MediaPlayerProperty.Title,
      artist: MediaPlayerProperty.Artist,
    },
  },
});
