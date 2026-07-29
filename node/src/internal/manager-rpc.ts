import type { DiscoveredCamera } from '../manager/index.js';

/** Connection status for discovered cameras. */
export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error';

/** Discovered camera plus the provider that found it and its live connection state. */
export interface DiscoveredCameraWithState extends DiscoveredCamera {
  /** Name of the provider plugin that discovered this camera. */
  provider: string;
  /** Current connection status reported by the provider. */
  connectionStatus: ConnectionStatus;
  /** Last error message when `connectionStatus` is `'error'`. */
  errorMessage?: string;
}
