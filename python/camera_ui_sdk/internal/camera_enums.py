from __future__ import annotations

from typing import Literal

CameraFrameWorkerDecoder = Literal["wasm", "rust"]
"""Frame worker decoder implementation."""

FrameType = Literal["stream", "motion"]
"""Frame type identifier for frame workers."""
