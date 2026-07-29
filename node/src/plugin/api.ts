import type { CoreManager, DeviceManager, DownloadManager, NotificationManager, SensorManager } from '../manager/index.js';

/**
 * Lifecycle events emitted on the PluginAPI EventEmitter. Plugins subscribe
 * with `api.on(API_EVENT.X, handler)` to react to host-driven phase changes.
 */
export enum API_EVENT {
  /** Emitted once after every assigned camera is wired up and `configureCameras()` returned. Start timers and warm-ups here. */
  FINISH_LAUNCHING = 'finishLaunching',
  /** Emitted when the host tears the plugin down. Release files, sockets, timers and child processes now. */
  SHUTDOWN = 'shutdown',
}

/**
 * The PluginAPI is injected into the plugin at runtime and exposes the
 * system services the plugin is allowed to talk to. It also acts as an
 * EventEmitter for plugin lifecycle events (see {@link API_EVENT}).
 *
 * @example
 * ```ts
 * import { BasePlugin } from '@camera.ui/sdk';
 *
 * export default class MyPlugin extends BasePlugin {
 *   async configureCameras() {
 *     const ffmpeg = await this.api.coreManager.getFFmpegPath();
 *   }
 * }
 * ```
 */
export interface PluginAPI {
  /** System-level operations: the FFmpeg path and the server addresses used for media URLs (HTTP/RTSP). */
  readonly coreManager: CoreManager;
  /** Owns the camera devices assigned to this plugin and publishes camera-state changes. */
  readonly deviceManager: DeviceManager;
  /** Registers standalone sensors: entities of their own, persisted across restarts, assignable to cameras by the user. */
  readonly sensorManager: SensorManager;
  /** Mints token-protected download URLs for files the plugin exposes to the UI (clip exports, snapshots). */
  readonly downloadManager: DownloadManager;
  /** Publishes notifications to every installed notifier and the in-app UI. Requires `PluginCapability.PublishNotifications`. */
  readonly notificationManager: NotificationManager;
  /** Absolute path to the plugin's writable storage directory, created and cleaned up by the host. */
  readonly storagePath: string;

  /** Subscribe to a lifecycle event. Returns `this` for chaining. */
  on(event: API_EVENT, listener: () => void): this;
  /** Subscribe to a lifecycle event for one delivery only. */
  once(event: API_EVENT, listener: () => void): this;
  /** Remove a previously registered listener (alias of `removeListener`). */
  off(event: API_EVENT, listener: () => void): this;
  /** Remove a previously registered listener. */
  removeListener(event: API_EVENT, listener: () => void): this;
  /** Remove every listener for `event`, or every listener when no event is given. */
  removeAllListeners(event?: API_EVENT): this;
}
