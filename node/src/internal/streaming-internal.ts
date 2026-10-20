import type { Disposable } from '../observable/index.js';

export interface IceServer {
  urls: string[];
  username?: string;
  credential?: string;
}

export interface Subscribed {
  /** Add subscriptions to be cleaned up on unsubscribe. */
  addSubscriptions(...subscriptions: Disposable[]): void;
  /** Add additional subscriptions (separate cleanup). */
  addAdditionalSubscriptions(...subscriptions: Disposable[]): void;
  /** Unsubscribe all main subscriptions. */
  unsubscribe(): void;
  /** Unsubscribe additional subscriptions only. */
  unsubscribeAdditional(): void;
}
