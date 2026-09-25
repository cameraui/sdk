import type { CameraDevice } from '../camera/index.js';
import type { Observable } from '../observable/index.js';
import type { PluginInfo, PluginInterface } from '../plugin/contract.js';
import type { BasePlugin, PluginInterfaces } from '../plugin/interfaces.js';
import type { Notification } from '../plugin/notifier.js';
import type { SensorType } from '../sensor/base.js';

/** One recorded change of one sensor property. */
export interface SensorHistoryEntry {
  /** The sensor it belongs to. */
  sensorId: string;
  /** Property name, e.g. 'detected' or 'current'. */
  property: string;
  /** The value it changed to. */
  value: string | number | boolean | null;
  /** When it changed, in milliseconds. */
  timestamp: number;
}

/**
 * Core manager event payload.
 * The host currently publishes one event type, 'cloudAccountChanged'.
 * Subscribe via `coreManager.onEvent` to react to it.
 */
export interface CoreManagerEvent {
  /** Event type identifier (e.g. 'cloudAccountChanged'). */
  type: string;
  /** Event-specific data payload. Shape depends on the event type. */
  data: any;
}

/**
 * One completion request to the assistant model the admin assigned to this plugin.
 */
export interface AssistantAskRequest {
  /** The user message. */
  prompt: string;
  /** Optional system instruction. */
  system?: string;
  /** Pictures for the request, sent only when the assigned model sees pictures. */
  images?: { data: Uint8Array; mimeType: string }[];
  /** JSON schema of the expected answer; the result then carries `json`. */
  outputSchema?: Record<string, unknown>;
  /** Timeout in milliseconds, default 45 s, at most 300 s. */
  timeoutMs?: number;
}

/**
 * Answer of {@link CoreManager.assistantAsk}: the text (and parsed JSON when a schema was given) or the reason it did not run.
 */
export type AssistantAskResult =
  | { ok: true; text: string; json?: unknown; usage: { promptTokens: number; completionTokens: number } }
  | { ok: false; reason: 'not_allowed' | 'unconfigured' | 'timeout' | 'error'; message: string };

/**
 * Whether this plugin may use the assistant model, and what the assigned model can do.
 */
export interface AssistantAccess {
  /** True when the admin allowed this plugin under Settings, Assistant. */
  allowed: boolean;
  /** Model id of the assigned entry, null when not allowed. */
  model: string | null;
  /** Result of the picture probe for the assigned entry, null when unknown. */
  vision: boolean | null;
  /** Answer language of the assistant settings (for example `de`), null when it follows the user interface. */
  language: string | null;
}

/**
 * Core manager interface for system-level operations.
 *
 * Provides access to cross-cutting services like the FFmpeg binary path,
 * server addresses, the cloud server id, inter-plugin lookup, and a stream
 * of core system events.
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
   * Get server addresses (IP addresses the server is listening on). A plugin running on a worker
   * gets the addresses selected for that worker, empty when none are selected.
   *
   * @returns Array of server addresses
   */
  getServerAddresses(): Promise<string[]>;

  /**
   * Get the cloud server identity this server is registered as.
   *
   * Returns the cloud `server_id` from the active cloud pairing, or an empty
   * string when the server is not connected to the cloud.
   *
   * @returns Cloud server id, or an empty string if not paired
   */
  getCloudServerId(): Promise<string>;

  /**
   * Get all installed, enabled plugins that implement a specific interface.
   * Plugins the admin disabled are excluded. A returned plugin may still be
   * starting up or may have crashed, so a call into one can fail.
   *
   * @param interfaceName - Name of the plugin interface (e.g., 'ClipDetection')
   *
   * @returns Array of plugin info objects
   */
  getPluginsByInterface(interfaceName: PluginInterface): Promise<PluginInfo[]>;

  /**
   * Ask the assistant model for one completion.
   * The admin decides under Settings, Assistant which plugins may use the model and which entry they get;
   * the key never reaches the plugin.
   *
   * @param request - Prompt, optional system text, pictures and output schema
   *
   * @returns The answer, or `ok: false` with the reason when the plugin is not allowed or the call failed
   *
   * @example
   * ```typescript
   * const answer = await api.coreManager.assistantAsk({
   *   system: 'Answer with one word.',
   *   prompt: 'Is there a person in this picture?',
   *   images: [{ data: jpeg, mimeType: 'image/jpeg' }],
   * });
   * if (answer.ok) console.log(answer.text);
   * ```
   */
  assistantAsk(request: AssistantAskRequest): Promise<AssistantAskResult>;

  /**
   * Check whether this plugin may use the assistant model and what the assigned entry can do.
   * Subscribe to the `assistantModelChanged` event to learn about changes while running.
   *
   * @returns Access flag, model id and picture support
   */
  assistantAccess(): Promise<AssistantAccess>;

  /**
   * Observable for core manager events (e.g. cloud account changes, `assistantModelChanged` with `{ pluginId, configured }`).
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
   * Cameras become visible in the UI without waiting for the next poll.
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
 * Read access to the host's sensor registry, via `api.sensorManager`.
 *
 * Sensors are never created here: a camera's own sensors go through
 * `camera.addSensor()`, standalone sensors exist only once the user adopted
 * them from a `SensorDiscoveryProvider`.
 */
export interface SensorManager {
  /**
   * Get what a set of sensors did during a window of time.
   *
   * Returns every recorded change between `from` and `to`, and for each
   * property also the value it already had when the window opened, because a
   * door that was open the whole time says as much as one that opened halfway
   * through. Entries come back oldest first.
   *
   * The history is a short tail, not an archive: it is coalesced to one entry
   * per second and capped per sensor, so a window far in the past may be gone.
   *
   * @param sensorIds - Sensors to read
   *
   * @param from - Start of the window, in milliseconds
   *
   * @param to - End of the window, in milliseconds
   *
   * @returns Recorded changes, oldest first
   *
   * @example
   * ```typescript
   * const changes = await api.sensorManager.getSensorHistory([contactId], event.start, event.end);
   * const opened = changes.find((change) => change.property === 'detected' && change.value === true);
   * ```
   */
  getSensorHistory(sensorIds: string[], from: number, to: number): Promise<SensorHistoryEntry[]>;
}

/**
 * Download manager interface for token-based file downloads.
 *
 * Plugins register a file and get back a token URL. No JWT is involved, the
 * token itself is the auth.
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
 *   cleanup: 'on-download',
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
 * When the file on disk gets deleted. The registry entry always expires at TTL,
 * this only controls the file itself.
 *  - 'never' (default): file persists; caller manages it.
 *  - 'on-expiry': file deleted at TTL. Can be fetched N times during the
 *    window, the right mode for notification images that fan out to multiple
 *    devices or recipients.
 *  - 'on-download': file deleted after first successful download OR on TTL,
 *    whichever first. One-shot mode for things like backup exports.
 */
export type DownloadCleanup = 'never' | 'on-expiry' | 'on-download';

/** Options for creating a download. */
export interface CreateDownloadOptions {
  /** Absolute path to the file on disk. */
  filePath: string;
  /** Filename for Content-Disposition header (defaults to basename of filePath). */
  filename?: string;
  /** MIME type for Content-Type header (defaults to application/octet-stream). */
  mimeType?: string;
  /** Time-to-live in milliseconds (defaults to 10 minutes). */
  ttlMs?: number;
  /**
   * When the file on disk gets cleaned up. Defaults to 'never' (caller
   * manages lifecycle). Use 'on-expiry' for multi-recipient notification
   * images, 'on-download' for one-shot exports.
   */
  cleanup?: DownloadCleanup;
}

/**
 * Notification manager interface for publishing notifications into the host.
 *
 * Plugins call `publish` to ask the host to fan a Notification out to every
 * installed Notifier-plugin and the in-app UI. The host applies user settings
 * (master toggle, per-source toggle, quiet hours) and the publishing plugin's
 * declared capabilities; calls from plugins without
 * `PluginCapability.PublishNotifications` are silently dropped.
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
   * @returns Resolves once the publish was handed to the transport. Downstream
   * delivery is async and failures there never propagate back here.
   */
  publish(notification: Notification): Promise<void>;
}

/** Token returned after registering a download. */
export interface DownloadToken {
  /** Unique download token. */
  token: string;
  /**
   * In-app, same-origin URL: `/api/download/<token>`. For callers already
   * authenticated against this server (UI, plugins via the proxy).
   */
  url: string;
  /**
   * Externally-reachable, session-less URL the server publishes for
   * out-of-band fetchers (push-notification image attachments, FCM / APNs
   * payloads, share recipients). Shape: `<externalUrl>/api/download/<token>`,
   * where the token is the auth. Empty string when the server has no external
   * URL configured (LAN-only deployments); fall back to `url` for in-app
   * callers.
   */
  publicUrl: string;
  /** Unix timestamp (ms) when the token expires. */
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
  /** Network address (IP or hostname) shown in the UI to disambiguate same-model cameras. */
  address?: string;
}

/** A sensor a plugin can offer for adoption (see SensorDiscoveryProvider). */
export interface DiscoveredSensor {
  /**
   * The source's stable identity for this sensor, never its address: a Home
   * Assistant entity-registry id, an MQTT `unique_id`, a vendor device id.
   * It becomes the sensor's `nativeId`, and a sensor keeps its record,
   * assignments and history for as long as this id stays the same. Using a
   * mutable address (a Home Assistant `entity_id`) here turns every rename at
   * the source into an orphan plus a new sensor.
   */
  id: string;
  /** Current address at the source (e.g. a Home Assistant entity id), shown next to the name. */
  address?: string;
  /** Display name shown in the UI adoption list. */
  name: string;
  /** Sensor type the plugin would register the sensor as. */
  type: SensorType;
  /** Room or area label from the source system (optional). */
  room?: string;
  /** Manufacturer label (optional). */
  manufacturer?: string;
  /** Model label (optional). */
  model?: string;
}

/** A sensor the user adopted; what the host hands a `SensorDiscoveryProvider` to build its runtime sensor from. */
export interface AdoptedSensor {
  /** Persistent registry id, the sensor's `id` once bound. */
  id: string;
  /** The `DiscoveredSensor.id` the adoption used. */
  nativeId: string;
  /** Last known address at the source, if any. */
  address?: string;
  /** Name at adoption time; the user may have renamed the sensor since. */
  name: string;
  /** Sensor type the plugin offered it as. */
  type: SensorType;
}
