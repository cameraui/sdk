from __future__ import annotations

from typing import Literal, NotRequired

from ..manager import DiscoveredCamera

ConnectionStatus = Literal["idle", "connecting", "connected", "error"]


class DiscoveredCameraWithState(DiscoveredCamera):
    provider: str

    connectionStatus: ConnectionStatus

    errorMessage: NotRequired[str]
