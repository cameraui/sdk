from __future__ import annotations

from typing import Literal

FrameType = Literal["stream", "motion"]

CameraFrameWorkerDecoder = Literal["wasm", "rust"]
