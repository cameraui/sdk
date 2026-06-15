from __future__ import annotations

from typing import NotRequired

from typing_extensions import TypedDict


class IceServer(TypedDict):
    """WebRTC ICE server configuration."""

    urls: list[str]
    """STUN/TURN server URLs."""
    username: NotRequired[str]
    """Authentication username."""
    credential: NotRequired[str]
    """Authentication credential."""
