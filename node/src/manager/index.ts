import type { CameraDevice } from '../camera/index.js';
import type { Observable } from '../observable/index.js';
import type { PluginInfo, PluginInterface } from '../plugin/contract.js';
import type { BasePlugin, PluginInterfaces } from '../plugin/interfaces.js';
import type { Notification } from '../plugin/notifier.js';

/**
 * Core manager event payload.
 * Emitted when a core system event occurs (e.g. cloud account changes,
 * remote-server availability, plugin lifecycle changes). Subscribe via
 * `coreManager.onEvent` to react to system-level state changes.
 */
export interface CoreManagerEvent {
  /** Event type identifier (e.g. 'cloudAccountChanged'). */
  type: string;
  /** Event-specific data payload. Shape depends on the event type. */
  data: any;
}

/**
 * Core manager interface for system-level operations.
 *
 * Provides access to cross-cutting services like the FFmpeg binary path,
 * server addresses, HMAC signing for cloud requests, inter-plugin lookup,
 * and a stream of core system events.
 *
 * Accessed via `api.coreManager` in plugins.
 *
 * @example
 * ```typescript
 * const ffmpeg = await api.coreManager.getFFmpegPath();
 * const addresses = await api.coreManager.getServerAddresses();
 *
 * api.coreManager.onEvent.subscribe(({ type, data }) => {
 *   if (type === 'cloudAccountChanged') {
 *     console.log('Cloud account state:', data);
 *   }
 * });
 * ```
 */
export interface CoreManager {
  /**
   * Connect to another plugin by name.
   *
   * @param pluginName - Name of the plugin to connect to
   *
   * @returns Plugin proxy or undefined if not found
   */
  connectToPlugin(pluginName: string): Promise<(BasePlugin & PluginInterfaces) | undefined>;

  /**
   * Get the FFmpeg executable path.
   *
   * @returns Path to FFmpeg binary
   */
  getFFmpegPath(): Promise<string>;

  /**
   * Get server addresses (IP addresses the server is listening on).
   *
   * @returns Array of server addresses
   */
  getServerAddresses(): Promise<string[]>;

  /**
   * Get all active plugins that implement a specific interface.
   *
   * @param interfaceName - Name of the plugin interface (e.g., 'ClipDetection')
   *
   * @returns Array of plugin info objects
   */
  getPluginsByInterface(interfaceName: PluginInterface): Promise<PluginInfo[]>;

  /**
   * Observable for core manager events (e.g. cloud account changes).
   *
   * @example
   * ```typescript
   * api.coreManager.onEvent.subscribe(({ type, data }) => {
   *   if (type === 'cloudAccountChanged') {
   *     console.log('Cloud account changed:', data.connected);
   *   }
   * });
   * ```
   */
  readonly onEvent: Observable<CoreManagerEvent>;
}

/**
 * Device manager interface for camera operations.
 * Provides methods to push discovered cameras and get camera devices.
 *
 * Accessed via `api.deviceManager` in plugins.
 *
 * @example
 * ```typescript
 * // Push discovered cameras (after cloud login, etc.)
 * await api.deviceManager.pushDiscoveredCameras([
 *   { id: 'ring:123', name: 'Front Door', manufacturer: 'Ring' }
 * ]);
 *
 * // Get a camera by ID or name
 * const camera = await api.deviceManager.getCamera('Front Door');
 * ```
 */
export interface DeviceManager {
  /**
   * Push discovered cameras to the backend.
   * Use this when cameras are discovered asynchronously (e.g., after cloud login).
   * Cameras will be immediately visible in the UI without waiting for next poll.
   * Only available for CameraController and CameraAndSensorProvider plugins.
   *
   * @param cameras - Array of discovered cameras to push
   */
  pushDiscoveredCameras(cameras: DiscoveredCamera[]): Promise<void>;

  /**
   * Get a camera by ID or name.
   *
   * @param cameraIdOrName - Camera ID or name
   *
   * @returns Camera device or undefined if not found
   */
  getCamera(cameraIdOrName: string): Promise<CameraDevice | undefined>;
}

/**
 * Download manager interface for token-based file downloads.
 *
 * Allows plugins to register files for HTTP download via a token URL.
 * No JWT authentication is needed — the token itself is the auth.
 *
 * Accessed via `api.downloadManager` in plugins.
 *
 * @example
 * ```typescript
 * const { token, url } = await api.downloadManager.createDownload({
 *   filePath: '/tmp/export.mp4',
 *   filename: 'recording.mp4',
 *   mimeType: 'video/mp4',
 *   ttlMs: 600000,
 *   deleteFileAfterDownload: true,
 * });
 * ```
 */
export interface DownloadManager {
  /**
   * Register a file for download and get a token-based URL.
   *
   * @param options - Download options
   *
   * @returns Token, URL, and expiry information
   */
  createDownload(options: CreateDownloadOptions): Promise<DownloadToken>;

  /**
   * Register a streaming file for progressive download.
   * The file is tailed during writing; the marker file signals completion.
   *
   * @param options - Streaming download options (includes markerPath)
   *
   * @returns Token, URL, and expiry information
   */
  createStreamDownload(options: CreateStreamDownloadOptions): Promise<DownloadToken>;

  /**
   * Remove a download token and optionally delete the file.
   *
   * @param token - The download token to remove
   */
  deleteDownload(token: string): Promise<void>;
}

/** Options for creating a streaming download (progressive file tailing). */
export interface CreateStreamDownloadOptions extends CreateDownloadOptions {
  /** Path to a marker file that signals export is still in progress. */
  markerPath: string;
}

/**
 * When the file on disk gets deleted. Registry entry always expires at
 *  TTL — this only controls the file itself.
 *  - 'never' (default): file persists; caller manages it.
 *  - 'on-expiry': file deleted at TTL. Can be fetched N times during the
 *    window — correct mode for notification images that fan out to
 *    multiple devices/recipients.
 *  - 'on-download': file deleted after first successful download OR on TTL,
 *    whichever first. One-shot mode for things like backup exports.
 */
export type DownloadCleanup = 'never' | 'on-expiry' | 'on-download';

/** Options for creating a download. */
export interface CreateDownloadOptions {
  /** Absolute path to the file on disk */
  filePath: string;
  /** Filename for Content-Disposition header (defaults to basename of filePath) */
  filename?: string;
  /** MIME type for Content-Type header (defaults to application/octet-stream) */
  mimeType?: string;
  /** Time-to-live in milliseconds (defaults to 10 minutes) */
  ttlMs?: number;
  /**
   * When the file on disk gets cleaned up. Defaults to 'never' (caller
   *  manages lifecycle). Use 'on-expiry' for multi-recipient notification
   *  images, 'on-download' for one-shot exports.
   */
  cleanup?: DownloadCleanup;
}

/**
 * Notification manager interface for publishing notifications into the host.
 *
 * Plugins call `publish` to ask the host to fan a Notification out to every
 * installed Notifier-plugin and the in-app
 * UI. The host applies user settings (master toggle, per-source toggle,
 * quiet hours) and the publishing plugin's declared capabilities; calls
 * from plugins without `PluginCapability.PublishNotifications` are silently
 * dropped.
 *
 * Accessed via `api.notificationManager` in plugins.
 *
 * @example
 * ```ts
 * await api.notificationManager.publish({
 *   title: 'Camera offline',
 *   body: 'Front Door stopped recording',
 *   severity: Severity.Warn,
 *   deepLink: '/cameras/front-door',
 *   data: { cameraId: 'front-door' },
 * });
 * ```
 */
export interface NotificationManager {
  /**
   * Send a notification to the host for fan-out to every installed
   * Notifier-plugin and the in-app UI.
   *
   * @param notification - Notification payload to publish.
   *
   * @returns Resolves once the publish was handed to the transport.
   * Downstream delivery is async and failures there never
   * propagate back here.
   */
  publish(notification: Notification): Promise<void>;
}

/** Token returned after registering a download. */
export interface DownloadToken {
  /** Unique download token */
  token: string;
  /**
   * In-app, same-origin URL: `/api/download/<token>`. For callers already
   *  authenticated against this server (UI, plugins via the proxy).
   */
  url: string;
  /**
   * Externally-reachable, session-less URL the server publishes for
   *  out-of-band fetchers (push-notification image attachments, FCM /
   *  APNs payloads, share recipients). Shape:
   *  `<externalUrl>/api/download/<token>` — the token in the URL is the
   *  auth. Empty string when the server has no external URL configured
   *  (LAN-only deployments); fall back to `url` for in-app callers.
   */
  publicUrl: string;
  /** Unix timestamp (ms) when the token expires */
  expiresAt: number;
}

/**
 * Discovered camera from a discovery provider.
 *
 * Represents a camera found during network scanning or cloud lookup that
 * can be adopted into the system. Push these via
 * `deviceManager.pushDiscoveredCameras` so the user can pick them in the
 * UI without waiting for the next discovery poll.
 */
export interface DiscoveredCamera {
  /** Unique, stable identifier for this discovered camera (used for deduplication). */
  id: string;
  /** Display name shown in the UI adoption list. */
  name: string;
  /** Camera manufacturer label (optional). */
  manufacturer?: string;
  /** Camera model label (optional). */
  model?: string;
}
