from __future__ import annotations

from typing import Literal, NotRequired

from ..manager import DiscoveredCamera

ConnectionStatus = Literal["idle", "connecting", "connected", "error"]
"""Connection status for discovered cameras."""


class DiscoveredCameraWithState(DiscoveredCamera):
    """
    Discovered camera with provider and connection state.

    Extended version of ``DiscoveredCamera`` used by the UI to render the
    adoption list — adds the provider plugin name and a live connection
    status so users see whether the camera is currently reachable.
    """

    provider: str
    """Name of the provider plugin that discovered this camera."""

    connectionStatus: ConnectionStatus
    """Current connection status reported by the provider."""

    errorMessage: NotRequired[str]
    """Last error message when ``connectionStatus`` is ``error``."""
