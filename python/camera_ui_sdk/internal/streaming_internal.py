from __future__ import annotations

from typing import NotRequired

from typing_extensions import TypedDict


class IceServer(TypedDict):
    urls: list[str]
    username: NotRequired[str]
    credential: NotRequired[str]
