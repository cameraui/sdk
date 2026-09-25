from __future__ import annotations

from abc import abstractmethod
from collections.abc import Mapping
from typing import Any, Generic

from typing_extensions import TypedDict, TypeVar

from .base import Sensor, SensorCategory, SensorType
from .detection import VideoFrameData
from .spec import ModelSpec


class PersonEmbeddingResult(TypedDict):
    """Return type for PersonEmbedderSensor.embedPersons()."""

    embedding: list[float]
    """Embedding vector for the person in this crop, empty when the crop could not be embedded."""
    embeddingModel: str
    """Identifier of the embedding model that produced the vector."""


TStorage = TypeVar("TStorage", bound=Mapping[str, Any], default=dict[str, Any])


class PersonEmbedderSensor(Sensor[dict[str, Any], TStorage, str], Generic[TStorage]):
    """Person embedder that turns the crop of a person into a vector of their
    appearance, to find the same person again when no face is visible.

    Extend this class and implement ``embedPersons``.

    The crop is the person's box from the object detector, cut tight from the
    source frame. A vector describes clothing and build, not identity: it finds
    the same person on the same day, not after a change of clothes. Vectors from
    different models are not comparable, which is why every result carries its
    ``embeddingModel``.
    """

    _requires_frames = True

    def __init__(self, name: str = "Person Embedder", *, native_id: str | None = None) -> None:
        super().__init__(name, native_id=native_id)

    @property
    def type(self) -> SensorType:
        return SensorType.PersonEmbedder

    @property
    def category(self) -> SensorCategory:
        return SensorCategory.Sensor

    @property
    @abstractmethod
    def modelSpec(self) -> ModelSpec: ...

    @abstractmethod
    async def embedPersons(self, frames: list[VideoFrameData]) -> list[PersonEmbeddingResult]:
        """Embed persons in batch. Each frame is one person crop, cut tight around the
        detected box and stretched to ``modelSpec['input']``. Must return exactly one
        PersonEmbeddingResult per input frame, in the same order; return an empty
        ``embedding`` for a crop the model could not use."""
        ...

    async def updateValue(self, property: str, value: Any) -> None:
        """Read-only sensor: external writes are ignored."""
