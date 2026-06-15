import type { CoreManager, DeviceManager, DownloadManager, NotificationManager } from '../manager/index.js';

/**
 * Lifecycle events emitted on the PluginAPI EventEmitter. Plugins subscribe
 * with `api.on(API_EVENT.X, handler)` to react to host-driven phase changes.
 */
export enum API_EVENT {
  /**
   * Emitted exactly once after the plugin has been constructed, all assigned
   * cameras have been wired up, and `configureCameras()` has returned. Use
   * this to start background work that must wait until the camera set is
   * stable (timers, model warm-up, outbound connections).
   */
  FINISH_LAUNCHING = 'finishLaunching',
  /**
   * Emitted when the host is tearing the plugin down (graceful stop, reload
   * or process exit). Listeners must release resources synchronously enough
   * to finish before the host kills the process — open files, sockets,
   * timers, child processes.
   */
  SHUTDOWN = 'shutdown',
}

/**
 * The PluginAPI is injected into the plugin at runtime and exposes the
 * system services the plugin is allowed to talk to. It also acts as an
 * EventEmitter for plugin lifecycle events (see {@link API_EVENT}).
 */
export interface PluginAPI {
  /**
   * System-level operations such as the FFmpeg path and the server addresses
   *  used for media URLs (HTTP/RTSP).
   */
  readonly coreManager: CoreManager;
  /**
   * Owns the camera devices assigned to this plugin and publishes
   *  camera-state changes.
   */
  readonly deviceManager: DeviceManager;
  /**
   * Mints token-protected download URLs for files the plugin wants to
   *  expose to the UI (e.g. clip exports, snapshots).
   */
  readonly downloadManager: DownloadManager;
  /**
   * Publishes notifications into the host so they fan out to every installed
   * Notifier-plugin and the in-app UI. Requires
   * `PluginCapability.PublishNotifications` in the plugin contract.
   */
  readonly notificationManager: NotificationManager;
  /**
   * Absolute path to the plugin's writable storage directory. Created and
   *  cleaned up by the host. Use it for caches, models, sqlite/bolt files.
   */
  readonly storagePath: string;

  /** Subscribe to a lifecycle event. Returns `this` for chaining. */
  on(event: API_EVENT, listener: () => void): this;
  /** Subscribe to a lifecycle event for one delivery only. */
  once(event: API_EVENT, listener: () => void): this;
  /** Remove a previously registered listener (alias of `removeListener`). */
  off(event: API_EVENT, listener: () => void): this;
  /** Remove a previously registered listener. */
  removeListener(event: API_EVENT, listener: () => void): this;
  /**
   * Remove every listener for `event`, or every listener entirely if no
   *  event is given.
   */
  removeAllListeners(event?: API_EVENT): this;
}
