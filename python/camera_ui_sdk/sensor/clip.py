from __future__ import annotations

from abc import abstractmethod
from collections.abc import Mapping
from typing import Any, Generic

from typing_extensions import TypedDict, TypeVar

from .base import Sensor, SensorCategory, SensorType
from .detection import BoundingBox, VideoFrameData
from .spec import ModelSpec


class ClipEmbedding(TypedDict):
    """A CLIP embedding result for a detected region."""

    label: str  # Detection label this embedding was computed for (e.g. "person", "vehicle")
    box: BoundingBox  # Bounding box of the detected region in normalized coordinates
    embedding: list[float]  # CLIP embedding vector


class ClipResult(TypedDict):
    """Return type for ClipDetectorSensor.detectEmbeddings()."""

    embeddings: list[ClipEmbedding]  # Embeddings emitted for this frame
    embeddingModel: str  # Identifier of the embedding model used to produce the vectors


TStorage = TypeVar("TStorage", bound=Mapping[str, Any], default=dict[str, Any])


class ClipDetectorSensor(Sensor[dict[str, Any], TStorage, str], Generic[TStorage]):
    """CLIP detector sensor that receives video frames and generates semantic embeddings.

    Extend this class and implement ``detectEmbeddings`` to produce CLIP
    embeddings for downstream semantic search.
    """

    _requires_frames = True

    def __init__(self, name: str = "CLIP Sensor") -> None:
        super().__init__(name)

    @property
    def type(self) -> SensorType:
        return SensorType.Clip

    @property
    def category(self) -> SensorCategory:
        return SensorCategory.Sensor

    @property
    @abstractmethod
    def modelSpec(self) -> ModelSpec:
        """Declares the expected input dimensions and trigger labels."""
        ...

    @abstractmethod
    async def detectEmbeddings(self, frames: list[VideoFrameData]) -> list[ClipResult]:
        """Generate CLIP embeddings in batch. Each frame is a pre-cropped, pre-scaled trigger region
        produced by the upstream object detector. Must return exactly one ClipResult per input
        frame, in the same order. Use ``frame['label']`` to tag the emitted embedding."""
        ...

    async def updateValue(self, property: str, value: Any) -> None:
        """Frame-only sensor: no externally writable properties."""
        # No-op — clip detector has no state.
