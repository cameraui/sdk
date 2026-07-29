from __future__ import annotations

from typing import Literal

FrameType = Literal["stream", "motion"]
"""Frame type identifier for frame workers."""

CameraFrameWorkerDecoder = Literal["wasm", "rust"]
"""Frame worker decoder implementation."""
