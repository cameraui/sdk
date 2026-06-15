import type { DiscoveredCamera } from '../manager/index.js';

/**
 * Connection status for discovered cameras.
 */
export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error';

/**
 * Discovered camera with provider and connection state.
 *
 * Extended version of `DiscoveredCamera` used by the UI to render the
 * adoption list — adds the provider plugin name and a live connection
 * status so users see whether the camera is currently reachable.
 */
export interface DiscoveredCameraWithState extends DiscoveredCamera {
  /** Name of the provider plugin that discovered this camera. */
  provider: string;
  /** Current connection status reported by the provider. */
  connectionStatus: ConnectionStatus;
  /** Last error message when `connectionStatus` is `'error'`. */
  errorMessage?: string;
}
