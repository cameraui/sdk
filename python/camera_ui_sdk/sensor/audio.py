from __future__ import annotations

from abc import abstractmethod
from collections.abc import Mapping
from enum import StrEnum
from typing import Any, Generic, Literal, NotRequired, Protocol, overload, runtime_checkable

from typing_extensions import TypedDict, TypeVar

from ..observable import Observable
from .base import Sensor, SensorCategory, SensorLike, SensorType
from .detection import Detection
from .spec import AudioModelSpec

#: Built-in audio label types recognized across the system.
BASE_AUDIO_LABELS = (
    "doorbell",
    "glass_break",
    "siren",
    "speaking",
    "gunshot",
    "dog_bark",
    "baby_cry",
    "alarm",
    "scream",
    "cat",
    "car_alarm",
    "smoke_alarm",
)

#: Union of the built-in audio label strings.
BaseAudioLabel = Literal[
    "doorbell",
    "glass_break",
    "siren",
    "speaking",
    "gunshot",
    "dog_bark",
    "baby_cry",
    "alarm",
    "scream",
    "cat",
    "car_alarm",
    "smoke_alarm",
]

#: Audio label — one of the built-in labels or any custom string emitted by an audio detector.
AudioLabel = BaseAudioLabel | str


class AudioProperty(StrEnum):
    """Property names of an audio detection sensor."""

    Detected = "detected"  # Whether an audio event is currently detected
    Detections = "detections"  # List of detected audio events (e.g. glass break, scream)
    Decibels = "decibels"  # Current audio level in decibels
    LastTriggered = (
        "lastTriggered"  # Timestamp in milliseconds of the last detection trigger, set by the backend
    )


class AudioSensorProperties(TypedDict):
    """Property shape carried by an AudioSensor."""

    detected: bool
    detections: list[Detection]
    decibels: float


class AudioPropertyChangeData(TypedDict):
    """Property change payload emitted on AudioSensorLike.onPropertyChanged."""

    property: str  # AudioProperty value
    value: bool | list[Detection] | float


TStorage = TypeVar("TStorage", bound=Mapping[str, Any], default=dict[str, Any])


@runtime_checkable
class AudioSensorLike(SensorLike, Protocol):
    """Read-only proxy interface for an audio sensor."""

    @property
    def type(self) -> SensorType:
        return SensorType.Audio

    @overload
    def getValue(self, property: Literal[AudioProperty.Detected]) -> bool | None: ...
    @overload
    def getValue(self, property: Literal[AudioProperty.Detections]) -> list[Detection] | None: ...
    @overload
    def getValue(self, property: Literal[AudioProperty.Decibels]) -> float | None: ...
    @overload
    def getValue(self, property: str) -> object | None: ...

    @property
    def onPropertyChanged(self) -> Observable[AudioPropertyChangeData]: ...


class AudioSensor(Sensor[AudioSensorProperties, TStorage, str], Generic[TStorage]):
    """Audio sensor that reports audio events and decibel levels.

    Plugin authors call `reportDetections(list)` to push detected audio events
    (auto-derives `detected`) and `setDecibels(value)` to update the audio level.
    """

    _requires_frames = False

    def __init__(self, name: str = "Audio Sensor") -> None:
        super().__init__(name)
        self._write_state(
            {
                AudioProperty.Detected.value: False,
                AudioProperty.Detections.value: [],
                AudioProperty.Decibels.value: 0.0,
            }
        )

    @property
    def type(self) -> SensorType:
        return SensorType.Audio

    @property
    def category(self) -> SensorCategory:
        return SensorCategory.Sensor

    @property
    def detected(self) -> bool:
        """Whether an audio event is currently detected."""
        return bool(self.props.detected)

    @property
    def detections(self) -> list[Detection]:
        """Current detection list."""
        return self.props.detections or []

    @property
    def decibels(self) -> float:
        """Current audio level in decibels."""
        return float(self.props.decibels or 0.0)

    def reportDetections(self, detected: bool, detections: list[Detection] | None = None) -> None:
        """Report detected audio events.

        - ``reportDetections(True)`` — audio detected without specifics. The SDK
          synthesizes a single full-frame ``'audio'`` detection.
        - ``reportDetections(True, [...])`` — audio detected with explicit detections.
        - ``reportDetections(False)`` — clear.

        Args:
            detected: Whether an audio event is currently detected.
            detections: Optional explicit detections produced for this event.

        Example:
            ```python
            sensor.reportDetections(
                True,
                [
                    Detection(
                        label="glass_break",
                        confidence=0.91,
                        box=BoundingBox(x=0, y=0, width=1, height=1),
                    )
                ],
            )
            sensor.reportDetections(False)
            ```
        """
        list_ = self._normalize_reported_detections(detected, detections, "audio")  # type: ignore[arg-type]
        self._write_state(
            {
                AudioProperty.Detected.value: detected,
                AudioProperty.Detections.value: list_,
            }
        )

    def clearDetections(self) -> None:
        """Explicitly clear audio detection state (detected = False, detections = [])."""
        self.reportDetections(False)

    def setDecibels(self, value: float) -> None:
        """Update the current audio level (in decibels).

        Args:
            value: Audio level in decibels.

        Example:
            ```python
            sensor.setDecibels(72)
            ```
        """
        self._write_state({AudioProperty.Decibels.value: value})

    async def updateValue(self, property: str, value: Any) -> None:
        """Read-only sensor: external writes are ignored."""
        # No-op — audio state is reported by the plugin, not set externally.


class AudioFrameData(TypedDict):
    """Audio frame data delivered to audio detector sensors by the backend pipeline."""

    cameraId: NotRequired[str]  # Camera the frame originated from
    data: bytes  # Raw audio sample buffer
    sampleRate: int  # Sample rate of the buffer in Hz
    channels: int  # Channel count of the buffer (typically 1 = mono)
    format: Literal[
        "pcm16", "float32"
    ]  # Sample format: pcm16=16-bit signed integer PCM, float32=32-bit float
    decibels: NotRequired[float]  # Pre-computed decibel level for this frame, if available
    timestamp: NotRequired[int]  # Capture timestamp in milliseconds since epoch


class AudioResult(TypedDict):
    """Return type for AudioDetectorSensor.detectAudio()."""

    detected: bool  # Whether an audio event is detected in this frame
    detections: list[Detection]  # Detections emitted for this frame
    decibels: NotRequired[float]  # Optional decibel level computed for this frame


class AudioDetectorSensor(AudioSensor[TStorage], Generic[TStorage]):
    """Audio detector that receives audio frames from the backend pipeline.

    Extend this class and implement ``detectAudio`` and ``modelSpec``. The
    backend resamples and buffers audio to match ``modelSpec`` before each
    call.
    """

    _requires_frames = True

    @property
    @abstractmethod
    def modelSpec(self) -> AudioModelSpec:
        """Declares the expected audio input format. The backend resamples to match."""
        ...

    @abstractmethod
    async def detectAudio(self, audio: AudioFrameData) -> AudioResult:
        """Analyze a single audio frame for events. Called by the backend at the configured cadence."""
        ...
