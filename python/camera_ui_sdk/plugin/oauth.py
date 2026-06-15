from __future__ import annotations

from typing import Literal, NotRequired, Protocol, TypedDict, runtime_checkable

from .contract import PluginInterface

OAuthStatus = Literal["disconnected", "awaiting_user", "polling", "connected", "error"]
"""Lifecycle phase of an OAuth provider connection, carried in ``OAuthState.status``."""


class OAuthState(TypedDict):
    """Snapshot of a provider connection's lifecycle. Lives in the plugin and
    is the source of truth for both the host UI and downstream plugin code
    that needs a token. The host polls it via ``getOAuthState`` while a flow
    runs.
    """

    status: OAuthStatus
    """Current lifecycle phase."""
    userCode: NotRequired[str]
    """Device-flow user code shown to the user (set while ``awaiting_user``)."""
    verificationUri: NotRequired[str]
    """Device-flow verification URI the user opens (set while ``awaiting_user``)."""
    verificationUriComplete: NotRequired[str]
    """Verification URI with the user code embedded — rendered as a QR code."""
    authUrl: NotRequired[str]
    """Authorization-code-flow URL the browser must open (set while ``awaiting_user``)."""
    userEmail: NotRequired[str]
    """Connected account email (set while ``connected``)."""
    connectedAt: NotRequired[int]
    """Unix timestamp the grant was established (set while ``connected``)."""
    scopesGranted: NotRequired[list[str]]
    """Scopes granted by the IdP (set while ``connected``)."""
    errorCode: NotRequired[str]
    """OAuth error code (set while ``error``): ``access_denied`` | ``expired_token`` | ``server_error``."""
    errorMessage: NotRequired[str]
    """Human-readable error detail (set while ``error``)."""


class OAuthMetadata(TypedDict):
    """Informational data the host renders in the connect dialog."""

    idpDisplayName: str
    """Human name of the identity provider, e.g. ``cameraui.com``, ``Spotify``."""
    scopeDescriptions: dict[str, str]
    """Maps each scope to a human-readable description."""
    supportedFlows: list[PluginInterface]
    """Flow sub-interfaces the plugin implements, so the host knows which affordance to render."""


class OAuthProviderConfig(TypedDict):
    """Points the plugin's OAuth manager at an identity provider."""

    preset: NotRequired[str]
    """Built-in IdP endpoint set, e.g. ``cameraui.com``. When unset, the explicit endpoints are used."""
    deviceAuthUrl: NotRequired[str]
    """Device-authorization endpoint (used when ``preset`` is unset)."""
    authUrl: NotRequired[str]
    """Authorization endpoint (used when ``preset`` is unset)."""
    tokenUrl: NotRequired[str]
    """Token endpoint (used when ``preset`` is unset)."""
    revokeUrl: NotRequired[str]
    """Revocation endpoint (used when ``preset`` is unset)."""


class OAuthProviderDeclaration(TypedDict):
    """One provider a plugin integrates with. A single-provider plugin
    declares exactly one.
    """

    id: str
    """Plugin-local provider identifier (storage-key dimension for multi-provider plugins)."""
    provider: OAuthProviderConfig
    """IdP endpoint configuration."""
    clientId: str
    """OAuth client id the plugin authenticates as."""
    scopes: list[str]
    """Scopes requested for this provider."""
    required: NotRequired[bool]
    """Whether the provider is mandatory for the plugin to function."""
    description: NotRequired[str]
    """One-line UI hint shown alongside the connect button."""


@runtime_checkable
class OAuthCapable(Protocol):
    """Base interface every OAuth-capable plugin implements, alongside at least
    one flow sub-interface. IdP-agnostic — the plugin brings its own endpoint
    config and knows nothing about the host's internals.
    """

    async def getOAuthMetadata(self) -> OAuthMetadata:
        """Return IdP display info, scope descriptions and the implemented flow sub-interfaces."""
        ...

    async def getOAuthState(self) -> OAuthState:
        """Return a snapshot of the current lifecycle state; the host polls this to mirror progress."""
        ...

    async def disconnect(self) -> None:
        """Revoke the current grant at the IdP and clear stored tokens."""
        ...


@runtime_checkable
class OAuthDeviceFlowCapable(OAuthCapable, Protocol):
    """Implemented by plugins whose IdP supports the RFC 8628 Device
    Authorization Grant. The plugin polls the IdP internally; the host only
    polls ``getOAuthState`` to mirror progress.
    """

    async def startDeviceFlow(self, scope: list[str]) -> OAuthState:
        """Request a device code for the given scopes and begin polling; return the awaiting-user state."""
        ...

    async def cancelDeviceFlow(self) -> None:
        """Abort an in-progress device flow."""
        ...


@runtime_checkable
class OAuthAuthCodeFlowCapable(OAuthCapable, Protocol):
    """Implemented by plugins that use the Authorization Code Flow with PKCE.
    The host opens the auth URL and forwards the IdP redirect's code+state to
    ``completeAuthCodeFlow``.
    """

    async def startAuthCodeFlow(self, scope: list[str]) -> OAuthState:
        """Build the authorization URL for the given scopes; return the awaiting-user state (``authUrl`` set)."""
        ...

    async def completeAuthCodeFlow(self, code: str, state: str) -> OAuthState:
        """Exchange the IdP-returned code for tokens after validating ``state``."""
        ...

    async def cancelAuthCodeFlow(self) -> None:
        """Abort an in-progress authorization-code flow."""
        ...


@runtime_checkable
class OAuthClientCredentialsCapable(OAuthCapable, Protocol):
    """Implemented by plugins that authenticate with a user-supplied client_id
    + client_secret (no user redirect). The plugin validates by fetching a
    token immediately.
    """

    async def configureClientCredentials(self, client_id: str, client_secret: str) -> OAuthState:
        """Store the supplied credentials and fetch an initial token to validate them."""
        ...
