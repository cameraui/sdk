/**
 * Generic notification types — domain-agnostic. The NotificationManager and
 * notifier plugins talk over RPC and JSON-encode these types directly.
 */

import type { JsonSchema } from '../storage/index.js';

/**
 * Severity classifies how urgent a Notification is. Notifiers map this to
 * platform-specific delivery characteristics; the host bypasses user-configured
 * Quiet Hours for `critical`.
 */
export enum Severity {
  /** Standard notification — default delivery (sound + banner). */
  Info = 'info',
  /** Heightened attention; notifiers may use a different sound/colour. */
  Warn = 'warn',
  /** Failure or action-required notification. */
  Error = 'error',
  /**
   * Highest-priority delivery on supporting notifiers; bypasses user-configured
   * Quiet Hours on the host.
   */
  Critical = 'critical',
}

/**
 * A push-target managed by a notifier plugin (one phone, one chat, ...).
 * Devices are owned by the plugin that registered them; the manager queries
 * plugins for their device list rather than maintaining a shared registry.
 */
export interface NotifierDevice {
  id: string;
  ownerUserId: string;
  name: string;
  active: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Payload published via `api.notificationManager.publish` or routed by the
 * host. Plugins fill the user-visible fields; the host stamps the message
 * id, timestamp and source identifier on receive — plugins do not set those.
 */
export interface Notification {
  /** Headline shown by every notifier. */
  title: string;
  /**
   * Optional second bold line between title and body. Honoured natively on
   * iOS (APNs `alert.subtitle`); other notifiers may fold it into the body
   * or ignore it.
   */
  subtitle?: string;
  /** Optional secondary text. */
  body?: string;
  /**
   * Drives DND / Critical-Alerts behaviour and Quiet-Hours bypass. Defaults
   * to {@link Severity.Info} if omitted.
   */
  severity?: Severity;
  /**
   * Collapse-key for dedup at both manager and notifier level (e.g.
   * 'motion:cam-1' — multiple events with the same tag inside the throttle
   * window collapse into one notification on the device).
   */
  tag?: string;
  /** Optional inline JPEG attached to the notification. */
  thumbnail?: Uint8Array;
  /**
   * Publicly-fetchable URL to a rich image (e.g. a detection snapshot).
   * Notifier-agnostic: FCM/APNs and other notifiers fetch it to render the
   * image. Preferred over inline {@link Notification.thumbnail} bytes when a
   * URL is available; empty renders text-only.
   */
  imageUrl?: string;
  /**
   * Router-relative path consumed by mobile / web tap-handlers (e.g.
   * '/cameras/cam-1?startTs=…'). No host, no scheme.
   */
  deepLink?: string;
  /**
   * Plugin-specific context (cameraId, eventId, plugin-defined keys). String
   * values keep the wire format predictable across notifier implementations.
   */
  data?: Record<string, string>;
  /**
   * Restricts delivery to users with the master or admin role. Use it for
   * operational alerts that concern whoever runs the instance — camera
   * offline, disk full, plugin failures — so they don't reach guests the
   * instance is merely shared with. Defaults to `false` (every user of the
   * instance receives it, subject to their own notification settings).
   */
  adminOnly?: boolean;
}

/**
 * Result of a {@link NotifierInterface.testNotification} call: whether the
 * test notification was delivered and, when known, to how many devices.
 */
export interface TestNotificationResponse {
  /** True when the notifier accepted and dispatched the test notification. */
  delivered: boolean;
  /** Number of devices the test notification was delivered to. */
  deviceCount?: number;
  /** Human-readable status or error detail. */
  message?: string;
}

/**
 * Implemented by plugins that deliver notifications. The NotificationManager
 * invokes these methods over RPC. Plugins own their device storage — the
 * manager never persists devices itself.
 */
export interface NotifierInterface {
  /**
   * Returns every device this notifier knows about for the given users. Each
   *  device carries its `ownerUserId` so the caller can map results back. May
   *  return [] when the notifier is unavailable (e.g. license invalid). Called
   *  frequently — keep cheap.
   */
  getDevices(ownerUserIds: string[]): Promise<NotifierDevice[]>;
  /** Returns a single device by id, or null if not found. */
  getDevice(deviceId: string): Promise<NotifierDevice | null>;
  /**
   * Delivers a notification to the given devices in one call. Errors are
   *  logged; the manager never aborts a fan-out because one notifier failed.
   */
  sendNotification(deviceIds: string[], n: Notification): Promise<void>;
  /**
   * Creates a new device on this notifier. `input` is plugin-specific JSON
   *  whose schema the notifier defines; the NotificationManager forwards it
   *  opaquely.
   */
  registerDevice(ownerUserId: string, input: Record<string, unknown>): Promise<NotifierDevice>;
  /**
   * Permanently removes a device. Called when the user revokes the device
   *  through their notifier-specific UI.
   */
  revokeDevice(deviceId: string): Promise<void>;
  /**
   * Mutates a subset of fields on an existing device. `patch` is
   *  plugin-agnostic (`name`, `active`); plugins ignore unknown keys.
   *  Returns the updated device, or null if the id isn't ours so the
   *  manager can probe the next plugin.
   */
  updateDevice(deviceId: string, patch: Record<string, unknown>): Promise<NotifierDevice | null>;
  /**
   * Sends a test notification to the given devices and returns the delivery
   *  result. `deviceIds` optionally restricts delivery to a subset.
   */
  testNotification?(notification: Notification, deviceIds?: string[]): Promise<TestNotificationResponse | undefined>;
  /**
   * Returns the JSON schema used to render the notifier's settings form in
   *  the UI, or undefined for no schema.
   */
  notificationSettings?(): Promise<JsonSchema[] | undefined>;
}
