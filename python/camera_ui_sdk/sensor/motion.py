from __future__ import annotations

from abc import abstractmethod
from collections.abc import Mapping
from enum import StrEnum
from typing import Any, Generic, Literal, Protocol, overload, runtime_checkable

from typing_extensions import TypedDict, TypeVar

from ..observable import Observable
from .base import Sensor, SensorCategory, SensorLike, SensorType
from .detection import (
    DETECTION_ATTRIBUTES,
    DETECTION_LABELS,
    BoundingBox,
    Detection,
    DetectionAttribute,
    DetectionLabel,
    VideoFrameData,
)

# Re-exports kept for backward compatibility — original public surface of this module.
__all__ = [
    "BoundingBox",
    "DETECTION_ATTRIBUTES",
    "DETECTION_LABELS",
    "Detection",
    "DetectionAttribute",
    "DetectionLabel",
    "MotionDetectorSensor",
    "MotionProperty",
    "MotionPropertyChangeData",
    "MotionResult",
    "MotionSensor",
    "MotionSensorLike",
    "MotionSensorProperties",
    "VideoFrameData",
]


class MotionProperty(StrEnum):
    """Property names of a motion sensor."""

    Detected = "detected"  # Whether motion is currently detected
    Detections = "detections"  # List of detection results with bounding boxes
    Blocked = "blocked"  # When true, detection updates are suppressed (set by the backend dwell logic)
    LastTriggered = (
        "lastTriggered"  # Timestamp in milliseconds of the last detection trigger, set by the backend
    )


class MotionSensorProperties(TypedDict):
    """Property shape carried by a MotionSensor."""

    detected: bool
    detections: list[Detection]
    blocked: bool


class MotionPropertyChangeData(TypedDict):
    """Property change payload emitted on MotionSensorLike.onPropertyChanged."""

    property: str  # MotionProperty value
    value: bool | list[Detection]


TStorage = TypeVar("TStorage", bound=Mapping[str, Any], default=dict[str, Any])


@runtime_checkable
class MotionSensorLike(SensorLike, Protocol):
    """Read-only proxy interface for a motion sensor."""

    @property
    def type(self) -> SensorType:
        return SensorType.Motion

    @overload
    def getValue(self, property: Literal[MotionProperty.Detected]) -> bool | None: ...
    @overload
    def getValue(self, property: Literal[MotionProperty.Detections]) -> list[Detection] | None: ...
    @overload
    def getValue(self, property: Literal[MotionProperty.Blocked]) -> bool | None: ...
    @overload
    def getValue(self, property: str) -> object | None: ...

    @property
    def onPropertyChanged(self) -> Observable[MotionPropertyChangeData]: ...


class MotionSensor(Sensor[MotionSensorProperties, TStorage, str], Generic[TStorage]):
    """Motion sensor that reports motion state and detection results.

    Plugin authors call `reportDetections(list)` to push detection results.
    `detected` is auto-derived from the detection list. `blocked` is read-only
    and is set by the backend (dwell logic) — `reportDetections()` becomes a
    no-op while the sensor is blocked.
    """

    _requires_frames = False

    def __init__(self, name: str = "Motion Sensor") -> None:
        super().__init__(name)
        self._write_state(
            {
                MotionProperty.Detected.value: False,
                MotionProperty.Detections.value: [],
                MotionProperty.Blocked.value: False,
            }
        )

    @property
    def type(self) -> SensorType:
        return SensorType.Motion

    @property
    def category(self) -> SensorCategory:
        return SensorCategory.Sensor

    @property
    def detected(self) -> bool:
        """Whether motion is currently detected."""
        return bool(self.props.detected)

    @property
    def detections(self) -> list[Detection]:
        """Current detection list."""
        return self.props.detections or []

    @property
    def blocked(self) -> bool:
        """Whether the sensor is currently blocked. Read-only — set by the backend dwell logic, not by plugin code."""
        return bool(self.props.blocked)

    def reportDetections(self, detected: bool, detections: list[Detection] | None = None) -> None:
        """Report a motion detection result.

        - ``reportDetections(True)`` — motion detected without bbox (e.g. Ring camera).
          The SDK synthesizes a single full-frame ``'motion'`` detection.
        - ``reportDetections(True, [...])`` — motion detected with explicit detections.
        - ``reportDetections(False)`` — no motion (clears detections).

        No-op while the sensor is blocked by backend dwell logic.

        Args:
            detected: Whether motion is currently detected.
            detections: Optional explicit detections produced for this frame.

        Example:
            ```python
            sensor.reportDetections(
                True,
                [
                    Detection(
                        label="motion",
                        confidence=0.85,
                        box=BoundingBox(x=0.1, y=0.2, width=0.3, height=0.4),
                    )
                ],
            )
            sensor.reportDetections(False)
            ```
        """
        if self.blocked:
            return
        list_ = self._normalize_reported_detections(detected, detections, "motion")  # type: ignore[arg-type]
        self._write_state(
            {
                MotionProperty.Detected.value: detected,
                MotionProperty.Detections.value: list_,
            }
        )

    def clearDetections(self) -> None:
        """Explicitly clear motion state (detected = False, detections = [])."""
        self.reportDetections(False)

    async def updateValue(self, property: str, value: Any) -> None:
        """Read-only sensor: external writes are ignored. State is reported via `reportDetections`."""
        # No-op — motion state is reported by the plugin, not set externally.


class MotionResult(TypedDict):
    """Return type for MotionDetectorSensor.detectMotion()."""

    detected: bool  # Ignored by the backend, which re-derives it from the detections
    detections: list[Detection]  # Detections emitted for this frame


class MotionDetectorSensor(MotionSensor[TStorage], Generic[TStorage]):
    """Motion detector that receives video frames from the backend pipeline.

    Extend this class and implement ``detectMotion`` to analyze frames for
    motion. The backend calls ``detectMotion`` at the configured frame
    interval, zone-filters the returned detections and applies them.
    ``detected`` is re-derived from the surviving detections, so a result with
    no detections reports no motion.
    """

    _requires_frames = True

    @abstractmethod
    async def detectMotion(self, frame: VideoFrameData) -> MotionResult:
        """Analyze a single video frame for motion. Called by the backend at the configured interval."""
        ...
