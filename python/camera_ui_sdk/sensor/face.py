from __future__ import annotations

from abc import abstractmethod
from collections.abc import Mapping
from enum import StrEnum
from typing import Any, Generic, Literal, NotRequired, Protocol, overload, runtime_checkable

from typing_extensions import TypedDict, TypeVar

from ..observable import Observable
from .base import Sensor, SensorCategory, SensorLike, SensorType
from .detection import Detection, VideoFrameData
from .spec import ModelSpec


class FaceProperty(StrEnum):
    """Property names of a face detection sensor."""

    Detected = "detected"  # Whether any face is currently detected
    Detections = "detections"  # List of detected faces with optional identity, embedding, and thumbnail


class FaceDetection(Detection):
    """A face detection result, extending Detection with face-specific fields."""

    attribute: Literal["face"]  # type: ignore[misc]  # Sub-detection attribute, fixed to "face"
    identity: NotRequired[str]  # Recognized identity name, if matched against known faces
    embedding: NotRequired[list[float]]  # Face embedding vector for recognition/comparison
    thumbnail: NotRequired[bytes]  # JPEG thumbnail crop of the detected face


class FaceSensorProperties(TypedDict):
    """Property shape carried by a FaceSensor."""

    detected: bool
    detections: list[FaceDetection]


class FacePropertyChangeData(TypedDict):
    """Property change payload emitted on FaceSensorLike.onPropertyChanged."""

    property: str  # FaceProperty value
    value: bool | list[FaceDetection]


TStorage = TypeVar("TStorage", bound=Mapping[str, Any], default=dict[str, Any])


@runtime_checkable
class FaceSensorLike(SensorLike, Protocol):
    """Read-only proxy interface for a face sensor."""

    @property
    def type(self) -> SensorType:
        return SensorType.Face

    @overload
    def getValue(self, property: Literal[FaceProperty.Detected]) -> bool | None: ...
    @overload
    def getValue(self, property: Literal[FaceProperty.Detections]) -> list[FaceDetection] | None: ...
    @overload
    def getValue(self, property: str) -> object | None: ...

    @property
    def onPropertyChanged(self) -> Observable[FacePropertyChangeData]: ...


class FaceSensor(Sensor[FaceSensorProperties, TStorage, str], Generic[TStorage]):
    """Face sensor that reports detected faces and optional identity matches.

    Plugin authors call `reportDetections(list)` to push detected faces.
    `detected` is auto-derived from the detection list.
    """

    _requires_frames = False

    def __init__(self, name: str = "Face Sensor") -> None:
        super().__init__(name)
        self._write_state(
            {
                FaceProperty.Detected.value: False,
                FaceProperty.Detections.value: [],
            }
        )

    @property
    def type(self) -> SensorType:
        return SensorType.Face

    @property
    def category(self) -> SensorCategory:
        return SensorCategory.Sensor

    @property
    def detected(self) -> bool:
        """Whether any face is currently detected."""
        return bool(self.props.detected)

    @property
    def detections(self) -> list[FaceDetection]:
        """Current detection list."""
        return self.props.detections or []

    def reportDetections(self, detected: bool, detections: list[FaceDetection] | None = None) -> None:
        """Report detected faces.

        - ``reportDetections(True)`` — face detected without specifics (e.g. a
          bare face-event from a discovery provider). The SDK synthesizes a
          single full-frame face detection without identity.
        - ``reportDetections(True, [...])`` — explicit face detections with
          identity, embedding, and/or thumbnail.
        - ``reportDetections(False)`` — clear.

        Args:
            detected: Whether any face is currently detected.
            detections: Optional explicit face detections to publish.

        Example:
            ```python
            sensor.reportDetections(
                True,
                [
                    FaceDetection(
                        label="person",
                        confidence=0.94,
                        box=BoundingBox(x=0.4, y=0.2, width=0.15, height=0.25),
                        attribute="face",
                        identity="Alice",
                    )
                ],
            )
            sensor.reportDetections(False)
            ```
        """
        list_ = self._normalize_reported_detections(
            detected,
            detections,  # type: ignore[arg-type]
            "person",
            {"attribute": "face"},
        )
        self._write_state(
            {
                FaceProperty.Detected.value: detected,
                FaceProperty.Detections.value: list_,
            }
        )

    def clearDetections(self) -> None:
        """Explicitly clear face detection state (detected = False, detections = [])."""
        self.reportDetections(False)

    async def updateValue(self, property: str, value: Any) -> None:
        """Read-only sensor: external writes are ignored."""
        # No-op — face detection state is reported by the plugin, not set externally.


class FaceResult(TypedDict):
    """Return type for FaceDetectorSensor.detectFaces()."""

    detected: bool  # Whether any face is detected in this frame
    detections: list[FaceDetection]  # Detections emitted for this frame


class FaceDetectorSensor(FaceSensor[TStorage], Generic[TStorage]):
    """Face detector that receives video frames from the backend pipeline.

    Extend this class and implement ``detectFaces`` for face detection and
    recognition.
    """

    _requires_frames = True

    @property
    @abstractmethod
    def modelSpec(self) -> ModelSpec:
        """Declares the expected input dimensions and trigger labels. The backend scales frames to match."""
        ...

    @abstractmethod
    async def detectFaces(self, frames: list[VideoFrameData]) -> list[FaceResult]:
        """Detect faces in batch. Each frame is pre-scaled to ``modelSpec['input']``:
        normally a person region cropped by the upstream object detector, but the whole
        scene when no decoded frame is available. Must return exactly one FaceResult per
        input frame, in the same order."""
        ...
