from __future__ import annotations

from abc import abstractmethod
from collections.abc import Mapping
from typing import Any, Generic, NotRequired

from typing_extensions import TypedDict, TypeVar

from ..camera.enums import Point
from .base import Sensor, SensorCategory, SensorType
from .detection import VideoFrameData
from .spec import ModelSpec


class FaceEmbeddingResult(TypedDict):
    """Return type for FaceEmbedderSensor.embedFaces()."""

    embedding: list[float]
    """Embedding vector for the face in this crop, empty when no face could be embedded."""
    embeddingModel: str
    """Identifier of the embedding model that produced the vector."""
    landmarks: NotRequired[list[Point]]
    """The five points the face was aligned on, in 0 - 1 of the input image: right eye, left eye, nose, right and left mouth corner."""
    quality: NotRequired[float]
    """How clearly the picture shows a face (0 - 1), also sent with an empty embedding when the face was too unclear; not sent when the landmarks were passed in."""


TStorage = TypeVar("TStorage", bound=Mapping[str, Any], default=dict[str, Any])


class FaceEmbedderSensor(Sensor[dict[str, Any], TStorage, str], Generic[TStorage]):
    """Face embedder that turns a face crop into a vector for recognition.

    Extend this class and implement ``embedFaces``.

    The crop comes from the face detector's box, cut from the source frame, so
    the sensor runs after face detection rather than on the raw scene. What a
    vector means depends on the model that produced it: vectors from different
    models are not comparable, which is why every result carries its
    ``embeddingModel``.
    """

    _requires_frames = True

    def __init__(self, name: str = "Face Embedder", *, native_id: str | None = None) -> None:
        super().__init__(name, native_id=native_id)

    @property
    def type(self) -> SensorType:
        return SensorType.FaceEmbedder

    @property
    def category(self) -> SensorCategory:
        return SensorCategory.Sensor

    @property
    @abstractmethod
    def modelSpec(self) -> ModelSpec: ...

    @abstractmethod
    async def embedFaces(self, frames: list[VideoFrameData]) -> list[FaceEmbeddingResult]:
        """Embed faces in batch. Each frame is one face crop, padded around the detected
        box and pre-scaled to ``modelSpec['input']``. Must return exactly one
        FaceEmbeddingResult per input frame, in the same order; return an empty
        ``embedding`` for a crop the model could not use."""
        ...

    async def updateValue(self, property: str, value: Any) -> None:
        """Read-only sensor: external writes are ignored."""
