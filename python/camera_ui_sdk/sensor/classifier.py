from __future__ import annotations

from abc import abstractmethod
from collections.abc import Mapping
from enum import StrEnum
from typing import Any, Generic, Literal, Protocol, overload, runtime_checkable

from typing_extensions import TypedDict, TypeVar

from ..observable import Observable
from .base import Sensor, SensorCategory, SensorLike, SensorType
from .detection import Detection, VideoFrameData
from .spec import ModelSpec


class ClassifierProperty(StrEnum):
    """Property names of a classifier sensor."""

    Detected = "detected"  # Whether any classification result is active
    Detections = "detections"  # List of classification results with labels and confidence
    Labels = "labels"  # Unique labels of the current detections (auto-derived when reporting detections)


class ClassifierDetection(Detection):
    """A classifier detection result with an open attribute for classifier categories."""

    attribute: str  # type: ignore[misc]  # Classifier category (e.g. "bird", "delivery") — open string for any classifier
    subAttribute: str  # Classifier sub-category (e.g. "woodpecker", "amazon")


class ClassifierSensorProperties(TypedDict):
    """Property shape carried by a ClassifierSensor."""

    detected: bool
    detections: list[ClassifierDetection]
    labels: list[str]


class ClassifierPropertyChangeData(TypedDict):
    """Property change payload emitted on ClassifierSensorLike.onPropertyChanged."""

    property: str  # ClassifierProperty value
    value: bool | list[ClassifierDetection] | list[str]


TStorage = TypeVar("TStorage", bound=Mapping[str, Any], default=dict[str, Any])


@runtime_checkable
class ClassifierSensorLike(SensorLike, Protocol):
    """Read-only proxy interface for a classifier sensor."""

    @property
    def type(self) -> SensorType:
        return SensorType.Classifier

    @overload
    def getValue(self, property: Literal[ClassifierProperty.Detected]) -> bool | None: ...
    @overload
    def getValue(
        self, property: Literal[ClassifierProperty.Detections]
    ) -> list[ClassifierDetection] | None: ...
    @overload
    def getValue(self, property: Literal[ClassifierProperty.Labels]) -> list[str] | None: ...
    @overload
    def getValue(self, property: str) -> object | None: ...

    @property
    def onPropertyChanged(self) -> Observable[ClassifierPropertyChangeData]: ...


class ClassifierSensor(Sensor[ClassifierSensorProperties, TStorage, str], Generic[TStorage]):
    """General-purpose image classifier sensor.

    Plugin authors call `reportDetections(list)` to push classification results.
    `detected` and `labels` are auto-derived from the detection list.
    """

    _requires_frames = False

    def __init__(self, name: str = "Classifier") -> None:
        super().__init__(name)
        self._write_state(
            {
                ClassifierProperty.Detected.value: False,
                ClassifierProperty.Detections.value: [],
                ClassifierProperty.Labels.value: [],
            }
        )

    @property
    def type(self) -> SensorType:
        return SensorType.Classifier

    @property
    def category(self) -> SensorCategory:
        return SensorCategory.Sensor

    @property
    def detected(self) -> bool:
        """Whether any classification result is active."""
        return bool(self.props.detected)

    @property
    def detections(self) -> list[ClassifierDetection]:
        """Current detection list."""
        return self.props.detections or []

    @property
    def labels(self) -> list[str]:
        """Unique labels of the current detections."""
        return self.props.labels or []

    def reportDetections(self, detected: bool, detections: list[ClassifierDetection] | None = None) -> None:
        """Report classification results. Auto-derives ``detected`` and
        ``labels`` from the list.

        - ``reportDetections(True)`` — generic classification trigger. The SDK
          synthesizes a single full-frame detection with empty attribute and
          sub-attribute.
        - ``reportDetections(True, [...])`` — explicit classifier detections.
        - ``reportDetections(False)`` — clear.

        Args:
            detected: Whether any classification result is active.
            detections: Optional explicit classifier detections to publish.

        Example:
            ```python
            sensor.reportDetections(
                True,
                [
                    ClassifierDetection(
                        label="animal",
                        confidence=0.88,
                        box=BoundingBox(x=0.1, y=0.2, width=0.3, height=0.4),
                        attribute="bird",
                        subAttribute="woodpecker",
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
            {"attribute": "", "subAttribute": ""},
        )
        labels = list(dict.fromkeys(d["label"] for d in list_))
        self._write_state(
            {
                ClassifierProperty.Detected.value: detected,
                ClassifierProperty.Detections.value: list_,
                ClassifierProperty.Labels.value: labels,
            }
        )

    def clearDetections(self) -> None:
        """Explicitly clear classifier state (detected = False, detections = [], labels = [])."""
        self.reportDetections(False)

    async def updateValue(self, property: str, value: Any) -> None:
        """Read-only sensor: external writes are ignored."""
        # No-op — classifier state is reported by the plugin, not set externally.


class ClassifierResult(TypedDict):
    """Return type for ClassifierDetectorSensor.detectClassifications()."""

    detected: bool  # Whether any classification result is emitted for this frame
    detections: list[ClassifierDetection]  # Detections emitted for this frame


class ClassifierDetectorSensor(ClassifierSensor[TStorage], Generic[TStorage]):
    """Classifier detector that receives video frames from the backend pipeline.

    Extend this class and implement ``detectClassifications`` to run image
    classification models against trigger regions.
    """

    _requires_frames = True

    @property
    @abstractmethod
    def modelSpec(self) -> ModelSpec:
        """Declares the expected input dimensions and trigger labels. The backend scales frames to match."""
        ...

    @abstractmethod
    async def detectClassifications(self, frames: list[VideoFrameData]) -> list[ClassifierResult]:
        """Classify frames in batch. Each frame is pre-scaled to ``modelSpec['input']``:
        normally a trigger region cropped by the upstream object detector, but the whole
        scene when no decoded frame is available. Must return exactly one ClassifierResult
        per input frame, in the same order."""
        ...
