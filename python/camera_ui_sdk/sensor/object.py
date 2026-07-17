from __future__ import annotations

from abc import abstractmethod
from collections.abc import Mapping
from enum import StrEnum
from typing import Any, Generic, Literal, Protocol, overload, runtime_checkable

from typing_extensions import TypedDict, TypeVar

from ..observable import Observable
from .base import Sensor, SensorCategory, SensorLike, SensorType
from .detection import Detection, DetectionLabel, VideoFrameData
from .spec import ObjectModelSpec


class ObjectProperty(StrEnum):
    """Property names of an object detection sensor."""

    Detected = "detected"  # Whether any object is currently detected
    Detections = "detections"  # List of detected objects with labels and bounding boxes
    Labels = "labels"  # Unique labels of the current detections (auto-derived when reporting detections)


class TrackVelocity(TypedDict):
    """Signed centroid velocity vector in normalized units per frame step.

    Positive x = moving right, positive y = moving down. Consumers doing
    motion prediction (PTZ autotrack, trajectory estimation) should use this
    instead of deriving velocity from frame-to-frame position deltas.
    """

    x: float
    y: float


class TrackedDetection(Detection, total=False):
    """Detection enriched with tracking metadata (stable IDs, velocity)."""

    trackId: int  # Stable sequential ID for this object across frames
    trackAge: int  # Number of frames this object has been continuously tracked
    trackSpeed: float  # Velocity magnitude in normalized units per frame; 0 = stationary
    trackVelocity: TrackVelocity  # Signed centroid velocity vector in normalized units per frame
    trackLost: bool  # True if the object was not matched in the current frame


class ObjectSensorProperties(TypedDict):
    """Property shape carried by an ObjectSensor."""

    detected: bool
    detections: list[TrackedDetection]
    labels: list[DetectionLabel]


class ObjectPropertyChangeData(TypedDict):
    """Property change payload emitted on ObjectSensorLike.onPropertyChanged."""

    property: str  # ObjectProperty value
    value: bool | list[Detection] | list[DetectionLabel]


TStorage = TypeVar("TStorage", bound=Mapping[str, Any], default=dict[str, Any])


@runtime_checkable
class ObjectSensorLike(SensorLike, Protocol):
    """Read-only proxy interface for an object detection sensor."""

    @property
    def type(self) -> SensorType:
        return SensorType.Object

    @overload
    def getValue(self, property: Literal[ObjectProperty.Detected]) -> bool | None: ...
    @overload
    def getValue(self, property: Literal[ObjectProperty.Detections]) -> list[TrackedDetection] | None: ...
    @overload
    def getValue(self, property: Literal[ObjectProperty.Labels]) -> list[DetectionLabel] | None: ...
    @overload
    def getValue(self, property: str) -> object | None: ...

    @property
    def onPropertyChanged(self) -> Observable[ObjectPropertyChangeData]: ...


class ObjectSensor(Sensor[ObjectSensorProperties, TStorage, str], Generic[TStorage]):
    """Object detection sensor that reports detected objects (person, vehicle, animal, etc.).

    Plugin authors call `reportDetections(list)` to push detection results.
    `detected` and `labels` are auto-derived from the detection list.
    """

    _requires_frames = False

    def __init__(self, name: str = "Object Sensor") -> None:
        super().__init__(name)
        self._write_state(
            {
                ObjectProperty.Detected.value: False,
                ObjectProperty.Detections.value: [],
                ObjectProperty.Labels.value: [],
            }
        )

    @property
    def type(self) -> SensorType:
        return SensorType.Object

    @property
    def category(self) -> SensorCategory:
        return SensorCategory.Sensor

    @property
    def detected(self) -> bool:
        """Whether any object is currently detected."""
        return bool(self.props.detected)

    @property
    def detections(self) -> list[TrackedDetection]:
        """Current detection list."""
        return self.props.detections or []

    @property
    def labels(self) -> list[DetectionLabel]:
        """Unique labels of the current detections."""
        return self.props.labels or []

    def reportDetections(
        self,
        detected: bool,
        detections: list[TrackedDetection] | None = None,
    ) -> None:
        """Report detected objects. Auto-derives ``detected`` and ``labels``
        from the list.

        - ``reportDetections(True)`` — something detected without specific data.
          The SDK synthesizes a single full-frame ``'motion'`` detection as a
          generic fallback.
        - ``reportDetections(True, [...])`` — explicit detections (typical case).
        - ``reportDetections(False)`` — clear.

        Args:
            detected: Whether any object is currently detected.
            detections: Optional explicit object detections (with optional
                tracking metadata).

        Example:
            ```python
            sensor.reportDetections(
                True,
                [
                    TrackedDetection(
                        label="person",
                        confidence=0.92,
                        box=BoundingBox(x=0.1, y=0.2, width=0.3, height=0.4),
                    )
                ],
            )
            sensor.reportDetections(False)
            ```
        """
        list_ = self._normalize_reported_detections(
            detected,
            detections,  # type: ignore[arg-type]
            "motion",
        )
        labels = list(dict.fromkeys(d["label"] for d in list_))
        self._write_state(
            {
                ObjectProperty.Detected.value: detected,
                ObjectProperty.Detections.value: list_,
                ObjectProperty.Labels.value: labels,
            }
        )

    def clearDetections(self) -> None:
        """Explicitly clear detection state (detected = False, detections = [], labels = [])."""
        self.reportDetections(False)

    async def updateValue(self, property: str, value: Any) -> None:
        """Read-only sensor: external writes are ignored. State is reported via `reportDetections`."""
        # No-op — object detection state is reported by the plugin, not set externally.


class ObjectResult(TypedDict):
    """Return type for ObjectDetectorSensor.detectObjects()."""

    detected: bool  # Whether any object is detected in this frame
    detections: list[TrackedDetection]  # Detections emitted for this frame


class ObjectDetectorSensor(ObjectSensor[TStorage], Generic[TStorage]):
    """Object detector that receives video frames from the backend pipeline.

    Extend this class and implement ``detectObjects`` and ``modelSpec``. The
    backend scales frames to match ``modelSpec.input`` dimensions before each
    call.
    """

    _requires_frames = True

    @property
    @abstractmethod
    def modelSpec(self) -> ObjectModelSpec:
        """Declares the expected input dimensions. The backend scales frames to match."""
        ...

    @abstractmethod
    async def detectObjects(self, frame: VideoFrameData) -> ObjectResult:
        """Analyze a single video frame for objects. Called by the backend at the configured interval."""
        ...
