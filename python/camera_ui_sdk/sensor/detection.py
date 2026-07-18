from __future__ import annotations

from typing import Literal, NotRequired

from typing_extensions import TypedDict

#: Object-detection labels the detector groups its classes into.
OBJECT_DETECTION_LABELS = ("person", "vehicle", "animal", "package")

#: Union of the object-detection label strings.
ObjectDetectionLabel = Literal["person", "vehicle", "animal", "package"]

#: Built-in detection label types recognized across the system.
DETECTION_LABELS = ("motion", *OBJECT_DETECTION_LABELS, "audio")

#: Union of the built-in detection label strings.
DetectionLabel = Literal["motion", "person", "vehicle", "animal", "package", "audio"]

#: Detection attribute types used to mark sub-detections (face, license plate, ...).
DETECTION_ATTRIBUTES = ("face", "license_plate")

#: Union of the built-in detection attribute strings.
DetectionAttribute = Literal["face", "license_plate"]


class BoundingBox(TypedDict):
    """Bounding box of a detection.

    All coordinates are normalized to 0-1 (fraction of frame dimensions),
    so they are independent of resolution.
    """

    x: float  # X coordinate of the top-left corner (0-1)
    y: float  # Y coordinate of the top-left corner (0-1)
    width: float  # Width as a fraction of frame width (0-1)
    height: float  # Height as a fraction of frame height (0-1)


class Detection(TypedDict):
    """A single detection result emitted by any detection sensor."""

    label: DetectionLabel  # Detection label (e.g. "person", "vehicle")
    confidence: float  # Confidence score in the range 0-1
    box: BoundingBox  # Bounding box in normalized coordinates
    attribute: NotRequired[
        str
    ]  # Optional sub-detection attribute (DetectionAttribute or classifier-specific)


class VideoFrameData(TypedDict):
    """Video frame data delivered to detector sensors by the backend pipeline.

    The backend handles capture, decoding, and scaling — detectors only need
    to process the pixel payload.
    """

    id: str  # Unique frame or crop identifier used to map batch results back to inputs
    cameraId: NotRequired[str]  # Camera the frame originated from
    data: bytes  # Raw pixel buffer
    width: int  # Frame width in pixels
    height: int  # Frame height in pixels
    format: Literal[
        "nv12", "rgb", "rgba", "gray"
    ]  # Pixel format: rgb=3 bytes/pixel, rgba=4 bytes/pixel, gray=1 byte/pixel, nv12=YUV semi-planar
    timestamp: NotRequired[int]  # Capture timestamp in milliseconds since epoch
    label: NotRequired[str]  # Trigger label propagated by the coordinator for secondary detectors
