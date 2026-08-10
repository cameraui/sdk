import type { JsonSchema } from '../storage/index.js';

/**
 * Severity classifies how urgent a Notification is. Notifiers map this to
 * platform-specific delivery characteristics; the host bypasses
 * user-configured Quiet Hours for `critical`.
 */
export enum Severity {
  /** Standard notification, default delivery (sound + banner). */
  Info = 'info',
  /** Heightened attention; notifiers may use a different sound or colour. */
  Warn = 'warn',
  /** Failure or action-required notification. */
  Error = 'error',
  /** Highest-priority delivery on supporting notifiers; bypasses Quiet Hours. */
  Critical = 'critical',
}

/**
 * A push-target managed by a notifier plugin (one phone, one chat, ...).
 * Devices are owned by the plugin that registered them; the manager queries
 * plugins for their device list rather than maintaining a shared registry.
 */
export interface NotifierDevice {
  /** Plugin-assigned device id, unique within the notifier. */
  id: string;
  /** User the device belongs to. */
  ownerUserId: string;
  /** Display name shown in the UI. */
  name: string;
  /** False while the user has muted this device; the manager skips it. */
  active: boolean;
  /** Plugin-specific extras (push tokens, chat ids, platform hints). */
  metadata?: Record<string, unknown>;
}

/**
 * Payload published via `api.notificationManager.publish` or routed by the
 * host. Plugins fill the user-visible fields; the host stamps the message id,
 * timestamp and source identifier on receive.
 */
export interface Notification {
  /** Headline shown by every notifier. */
  title: string;
  /** Optional second bold line, honoured natively on iOS; other notifiers may fold it into the body. */
  subtitle?: string;
  /** Optional secondary text. */
  body?: string;
  /** Drives DND / Critical-Alerts behaviour and Quiet-Hours bypass. Defaults to {@link Severity.Info}. */
  severity?: Severity;
  /**
   * Collapse-key (e.g. 'motion:cam-1'). The host replaces an older entry with
   * the same tag in the in-app list. Delivery is not throttled: every publish
   * is sent. Notifiers may map it to a platform collapse-id.
   */
  tag?: string;
  /** Optional inline JPEG attached to the notification. */
  thumbnail?: Uint8Array;
  /**
   * Publicly-fetchable URL to a rich image (e.g. a detection snapshot).
   * Preferred over inline {@link Notification.thumbnail} bytes when a URL is
   * available; empty renders text-only.
   */
  imageUrl?: string;
  /** Router-relative path for mobile / web tap-handlers (e.g. '/cameras/cam-1'). No host, no scheme. */
  deepLink?: string;
  /** Plugin-specific context (cameraId, eventId, plugin-defined keys), string values only. */
  data?: Record<string, string>;
  /**
   * Restricts delivery to users with the master or admin role. Use it for
   * operational alerts (camera offline, disk full, plugin failures) so they
   * don't reach guests the instance is merely shared with. Defaults to `false`.
   */
  adminOnly?: boolean;
  /**
   * Delivers without sound, vibration or badge increment: meant for publishes
   * that replace an earlier notification with the same {@link Notification.tag}
   * (e.g. a richer description superseding the initial alert). The banner
   * still updates. Ignored when {@link Notification.severity} is
   * {@link Severity.Critical}. Defaults to `false`.
   */
  silent?: boolean;
}

/**
 * Implemented by plugins that deliver notifications. The NotificationManager
 * invokes these methods over RPC. Plugins own their device storage, the
 * manager never persists devices itself.
 */
export interface NotifierInterface {
  /**
   * Returns the devices this notifier knows for the given users, each
   * carrying its `ownerUserId`. Returns [] when the notifier is unavailable
   * (e.g. invalid license). Called often, keep it cheap.
   */
  getDevices(ownerUserIds: string[]): Promise<NotifierDevice[]>;
  /** Returns a single device by id, or null if not found. */
  getDevice(deviceId: string): Promise<NotifierDevice | null>;
  /** Delivers a notification to the given devices in one call. Errors are logged, a failing notifier never aborts the fan-out. */
  sendNotification(deviceIds: string[], n: Notification): Promise<void>;
  /** Creates a new device. `input` is plugin-specific JSON the manager forwards opaquely. */
  registerDevice(ownerUserId: string, input: Record<string, unknown>): Promise<NotifierDevice>;
  /** Permanently removes a device. Called when the user revokes it through their notifier-specific UI. */
  revokeDevice(deviceId: string): Promise<void>;
  /** Mutates `name` / `active` on an existing device. Returns null if the id isn't ours so the manager can probe the next plugin. */
  updateDevice(deviceId: string, patch: Record<string, unknown>): Promise<NotifierDevice | null>;
  /** Returns the JSON schema used to render the notifier's settings form in the UI, or undefined for no schema. */
  notificationSettings?(): Promise<JsonSchema[] | undefined>;
}
