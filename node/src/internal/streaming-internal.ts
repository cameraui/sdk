import type { Disposable } from '../observable/index.js';

/**
 * WebRTC ICE server configuration.
 */
export interface IceServer {
  /** STUN/TURN server URLs */
  urls: string[];
  /** Authentication username */
  username?: string;
  /** Authentication credential */
  credential?: string;
}

/**
 * Subscription management interface for sessions.
 */
export interface Subscribed {
  /** Add subscriptions to be cleaned up on unsubscribe */
  addSubscriptions(...subscriptions: Disposable[]): void;
  /** Add additional subscriptions (separate cleanup) */
  addAdditionalSubscriptions(...subscriptions: Disposable[]): void;
  /** Unsubscribe all main subscriptions */
  unsubscribe(): void;
  /** Unsubscribe additional subscriptions only */
  unsubscribeAdditional(): void;
}
