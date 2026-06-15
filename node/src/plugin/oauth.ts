import type { PluginInterface } from './contract.js';

/** Lifecycle phase of an OAuth provider connection, carried in {@link OAuthState.status}. */
export type OAuthStatus = 'disconnected' | 'awaiting_user' | 'polling' | 'connected' | 'error';

/**
 * Snapshot of a provider connection's lifecycle. Lives in the plugin and is
 * the source of truth for both the host UI and downstream plugin code that
 * needs a token. The host polls it via `getOAuthState` while a flow runs.
 */
export interface OAuthState {
  /** Current lifecycle phase. */
  status: OAuthStatus;
  /** Device-flow user code shown to the user (set while `awaiting_user`). */
  userCode?: string;
  /** Device-flow verification URI the user opens (set while `awaiting_user`). */
  verificationUri?: string;
  /** Verification URI with the user code embedded — rendered as a QR code. */
  verificationUriComplete?: string;
  /** Authorization-code-flow URL the browser must open (set while `awaiting_user`). */
  authUrl?: string;
  /** Connected account email (set while `connected`). */
  userEmail?: string;
  /** Unix timestamp the grant was established (set while `connected`). */
  connectedAt?: number;
  /** Scopes granted by the IdP (set while `connected`). */
  scopesGranted?: string[];
  /** OAuth error code (set while `error`): `access_denied` | `expired_token` | `server_error`. */
  errorCode?: string;
  /** Human-readable error detail (set while `error`). */
  errorMessage?: string;
}

/** Informational data the host renders in the connect dialog. */
export interface OAuthMetadata {
  /** Human name of the identity provider, e.g. `cameraui.com`, `Spotify`. */
  idpDisplayName: string;
  /** Maps each scope to a human-readable description. */
  scopeDescriptions: Record<string, string>;
  /** Flow sub-interfaces the plugin implements, so the host knows which affordance to render. */
  supportedFlows: PluginInterface[];
}

/** Points the plugin's OAuth manager at an identity provider. */
export interface OAuthProviderConfig {
  /** Built-in IdP endpoint set, e.g. `cameraui.com`. When unset, the explicit endpoints are used. */
  preset?: string;
  /** Device-authorization endpoint (used when `preset` is unset). */
  deviceAuthUrl?: string;
  /** Authorization endpoint (used when `preset` is unset). */
  authUrl?: string;
  /** Token endpoint (used when `preset` is unset). */
  tokenUrl?: string;
  /** Revocation endpoint (used when `preset` is unset). */
  revokeUrl?: string;
}

/** One provider a plugin integrates with. A single-provider plugin declares exactly one. */
export interface OAuthProviderDeclaration {
  /** Plugin-local provider identifier (storage-key dimension for multi-provider plugins). */
  id: string;
  /** IdP endpoint configuration. */
  provider: OAuthProviderConfig;
  /** OAuth client id the plugin authenticates as. */
  clientId: string;
  /** Scopes requested for this provider. */
  scopes: string[];
  /** Whether the provider is mandatory for the plugin to function. */
  required?: boolean;
  /** One-line UI hint shown alongside the connect button. */
  description?: string;
}

/**
 * Base interface every OAuth-capable plugin implements, alongside at least one
 * flow sub-interface. IdP-agnostic — the plugin brings its own endpoint config
 * and knows nothing about the host's internals.
 */
export interface OAuthCapable {
  /** Return IdP display info, scope descriptions and the implemented flow sub-interfaces. */
  getOAuthMetadata(): Promise<OAuthMetadata>;
  /** Return a snapshot of the current lifecycle state; the host polls this to mirror progress. */
  getOAuthState(): Promise<OAuthState>;
  /** Revoke the current grant at the IdP and clear stored tokens. */
  disconnect(): Promise<void>;
}

/**
 * Implemented by plugins whose IdP supports the RFC 8628 Device Authorization
 * Grant. The plugin polls the IdP internally; the host only polls
 * `getOAuthState` to mirror progress.
 */
export interface OAuthDeviceFlowCapable extends OAuthCapable {
  /** Request a device code for the given scopes and begin polling; returns the awaiting-user state. */
  startDeviceFlow(scope: string[]): Promise<OAuthState>;
  /** Abort an in-progress device flow. */
  cancelDeviceFlow(): Promise<void>;
}

/**
 * Implemented by plugins that use the Authorization Code Flow with PKCE. The
 * host opens the auth URL and forwards the IdP redirect's code+state to
 * `completeAuthCodeFlow`.
 */
export interface OAuthAuthCodeFlowCapable extends OAuthCapable {
  /** Build the authorization URL for the given scopes; returns the awaiting-user state (`authUrl` set). */
  startAuthCodeFlow(scope: string[]): Promise<OAuthState>;
  /** Exchange the IdP-returned code for tokens after validating `state`. */
  completeAuthCodeFlow(code: string, state: string): Promise<OAuthState>;
  /** Abort an in-progress authorization-code flow. */
  cancelAuthCodeFlow(): Promise<void>;
}

/**
 * Implemented by plugins that authenticate with a user-supplied client_id +
 * client_secret (no user redirect). The plugin validates by fetching a token
 * immediately.
 */
export interface OAuthClientCredentialsCapable extends OAuthCapable {
  /** Store the supplied credentials and fetch an initial token to validate them. */
  configureClientCredentials(clientId: string, clientSecret: string): Promise<OAuthState>;
}
