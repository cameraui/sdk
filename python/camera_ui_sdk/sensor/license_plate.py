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


class LicensePlateProperty(StrEnum):
    """Property names of a license plate sensor."""

    Detected = "detected"
    """Whether any license plate is currently detected."""
    Detections = "detections"
    """List of detected plates with OCR text."""
    Plates = "plates"
    """Plate texts recognized during the active detection phase."""


class LicensePlateDetection(Detection):
    """A license plate detection result, extending Detection with OCR fields."""

    attribute: Literal["license_plate"]  # type: ignore[misc]
    """Sub-detection attribute, fixed to ``"license_plate"``."""
    plateText: str
    """Recognized plate text (e.g. ``"ABC 1234"``)."""
    ocrConfidence: NotRequired[float]
    """Average text recognition confidence (0-1), separate from the box confidence."""


class LicensePlateSensorProperties(TypedDict):
    """Property values of a license plate sensor."""

    detected: bool
    detections: list[LicensePlateDetection]
    plates: list[str]


class LicensePlatePropertyChangeData(TypedDict):
    """Property change payload emitted on LicensePlateSensorLike.onPropertyChanged."""

    property: str
    """Name of the changed property, a LicensePlateProperty value."""
    value: bool | list[str] | list[LicensePlateDetection]
    """New value of the property."""


TStorage = TypeVar("TStorage", bound=Mapping[str, Any], default=dict[str, Any])


@runtime_checkable
class LicensePlateSensorLike(SensorLike, Protocol):
    """Read-only proxy interface for a license plate sensor."""

    @property
    def type(self) -> SensorType:
        return SensorType.LicensePlate

    @property
    def onPropertyChanged(self) -> Observable[LicensePlatePropertyChangeData]: ...

    @overload
    def getValue(self, property: Literal[LicensePlateProperty.Detected]) -> bool | None: ...
    @overload
    def getValue(
        self, property: Literal[LicensePlateProperty.Detections]
    ) -> list[LicensePlateDetection] | None: ...
    @overload
    def getValue(self, property: Literal[LicensePlateProperty.Plates]) -> list[str] | None: ...
    @overload
    def getValue(self, property: str) -> object | None: ...


class LicensePlateSensor(Sensor[LicensePlateSensorProperties, TStorage, str], Generic[TStorage]):
    """License plate sensor that reports detected plates with OCR text.

    Plugin authors call `reportDetections(list)` to push detected plates.
    `detected` is auto-derived from the detection list.
    """

    _requires_frames = False

    def __init__(self, name: str = "License Plate Sensor", *, native_id: str | None = None) -> None:
        super().__init__(name, native_id=native_id)
        self._write_state(
            {
                LicensePlateProperty.Detected.value: False,
                LicensePlateProperty.Detections.value: [],
                LicensePlateProperty.Plates.value: [],
            }
        )

    @property
    def type(self) -> SensorType:
        return SensorType.LicensePlate

    @property
    def category(self) -> SensorCategory:
        return SensorCategory.Sensor

    @property
    def detected(self) -> bool:
        return bool(self.props.detected)

    @property
    def detections(self) -> list[LicensePlateDetection]:
        return self.props.detections or []

    @property
    def plates(self) -> list[str]:
        return list(self.props.plates or [])

    def reportDetections(
        self,
        detected: bool,
        detections: list[LicensePlateDetection] | None = None,
    ) -> None:
        """Report detected license plates.

        - ``reportDetections(True)``: plate detected without specifics. The SDK
          synthesizes a single full-frame detection with empty plateText.
        - ``reportDetections(True, [...])``: explicit plate detections with OCR text.
        - ``reportDetections(False)``: clear.

        Args:
            detected: Whether any license plate is currently detected.
            detections: Optional explicit plate detections to publish.

        Example:
            ```python
            sensor.reportDetections(
                True,
                [
                    LicensePlateDetection(
                        label="vehicle",
                        confidence=0.93,
                        box=BoundingBox(x=0.2, y=0.5, width=0.2, height=0.08),
                        attribute="license_plate",
                        plateText="ABC 1234",
                    )
                ],
            )
            sensor.reportDetections(False)
            ```
        """
        list_ = self._normalize_reported_detections(
            detected,
            detections,  # type: ignore[arg-type]
            "vehicle",
            {"attribute": "license_plate", "plateText": ""},
        )
        # recognized plates accumulate while plates stay visible, so automations
        # don't flap when the OCR misses a frame mid-presence
        recognized = [d["plateText"] for d in list_ if d.get("plateText")]
        state: dict[str, Any] = {
            LicensePlateProperty.Detected.value: detected,
            LicensePlateProperty.Detections.value: list_,
        }
        if not detected:
            state[LicensePlateProperty.Plates.value] = []
        elif recognized:
            state[LicensePlateProperty.Plates.value] = sorted({*self.plates, *recognized})
        self._write_state(state)

    def clearDetections(self) -> None:
        """Explicitly clear license plate state (detected = False, detections = [])."""
        self.reportDetections(False)

    async def updateValue(self, property: str, value: Any) -> None:
        """Read-only sensor: external writes are ignored."""


class LicensePlateResult(TypedDict):
    """Return type for LicensePlateDetectorSensor.detectLicensePlates()."""

    detected: bool
    """Whether any license plate is detected in this frame."""
    detections: list[LicensePlateDetection]
    """Detections emitted for this frame."""


class LicensePlateDetectorSensor(LicensePlateSensor[TStorage], Generic[TStorage]):
    """License plate detector that receives video frames from the backend pipeline.

    Extend this class and implement ``detectLicensePlates`` for plate detection
    and OCR. The backend scales frames to match ``modelSpec.input`` dimensions
    before each call.
    """

    _requires_frames = True

    @property
    @abstractmethod
    def modelSpec(self) -> ModelSpec: ...

    @abstractmethod
    async def detectLicensePlates(self, frames: list[VideoFrameData]) -> list[LicensePlateResult]:
        """Detect license plates in batch. Each frame is pre-scaled to ``modelSpec['input']``:
        normally a vehicle region cropped by the upstream object detector, but the whole
        scene when no decoded frame is available. Must return exactly one result per input
        frame, in the same order.
        """
        ...
