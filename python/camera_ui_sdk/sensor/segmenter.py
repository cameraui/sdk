from __future__ import annotations

from abc import abstractmethod
from collections.abc import Mapping
from typing import Any, Generic, NotRequired

from typing_extensions import TypedDict, TypeVar

from .base import Sensor, SensorCategory, SensorType
from .detection import BoundingBox, VideoFrameData
from .spec import ModelSpec


class ObjectMask(TypedDict):
    """Outline of one object: a mask laid over its box."""

    box: BoundingBox
    """Box the mask covers, normalized to the image the object was found in."""
    width: int
    """Mask width in pixels."""
    height: int
    """Mask height in pixels."""
    data: bytes
    """One byte per pixel, row by row from the top left: how likely the pixel belongs to the object (0 - 255). Above 127 counts as the object."""


class SegmentationFrame(VideoFrameData):
    """Crop handed to SegmenterSensor.segmentObjects(), with the object it was cut for."""

    box: BoundingBox
    """Box of the object to outline, normalized to this crop."""


class SegmentationResult(TypedDict):
    """Return type for SegmenterSensor.segmentObjects()."""

    mask: NotRequired[ObjectMask]
    """The object's outline, missing when the model found no object at the box."""


TStorage = TypeVar("TStorage", bound=Mapping[str, Any], default=dict[str, Any])


class SegmenterSensor(Sensor[dict[str, Any], TStorage, str], Generic[TStorage]):
    """Segmenter that outlines an object inside a crop.

    Extend this class and implement ``segmentObjects``.

    Each crop is a region around an object the object detector found, and the
    object's box inside it says which object is meant. The mask separates the
    object from its background, but not from a neighbour the detector saw as
    part of it: two people in one box come back as one outline.
    """

    _requires_frames = True

    def __init__(self, name: str = "Segmenter", *, native_id: str | None = None) -> None:
        super().__init__(name, native_id=native_id)

    @property
    def type(self) -> SensorType:
        return SensorType.Segmenter

    @property
    def category(self) -> SensorCategory:
        return SensorCategory.Sensor

    @property
    @abstractmethod
    def modelSpec(self) -> ModelSpec: ...

    @abstractmethod
    async def segmentObjects(self, frames: list[SegmentationFrame]) -> list[SegmentationResult]:
        """Outline objects in batch. Each frame is a region around one object, scaled to
        ``modelSpec['input']``, and carries the object's box. Must return exactly one
        SegmentationResult per input frame, in the same order; leave ``mask`` out when
        the model found no object at the box."""
        ...

    async def updateValue(self, property: str, value: Any) -> None:
        """Read-only sensor: external writes are ignored."""
