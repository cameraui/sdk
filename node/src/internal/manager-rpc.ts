import type { DiscoveredCamera } from '../manager/index.js';

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error';

export interface DiscoveredCameraWithState extends DiscoveredCamera {
  provider: string;
  connectionStatus: ConnectionStatus;
  errorMessage?: string;
}
