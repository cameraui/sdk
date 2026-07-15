from __future__ import annotations

from typing import TYPE_CHECKING, NotRequired, TypedDict

if TYPE_CHECKING:
    from ..sensor.base import SensorType

from ..sensor.detection import DetectionLabel
from .enums import LineDirection, MotionResolution, Point, ZoneFilter, ZoneType


class DetectionZone(TypedDict):
    """
    Detection zone configuration.
    Defines areas that restrict or drop detections.
    """

    name: str
    """Zone display name."""
    points: list[Point]
    """Polygon points (0-100 percentage coordinates)."""
    type: ZoneType
    """Intersection detection type."""
    filter: ZoneFilter
    """Include/exclude filter mode."""
    labels: list[DetectionLabel]
    """Labels to filter (empty = all labels)."""
    isPrivacyMask: bool
    """Whether this is an ignore zone: detections fully inside it are dropped."""
    color: str
    """Zone display color (hex)."""


class DetectionLine(TypedDict):
    """
    Detection line configuration.
    Defines a virtual tripwire for line crossing detection.
    The two points define grab-handle positions; the actual crossing line
    is perpendicular through their midpoint.
    """

    name: str
    """Line display name."""
    points: list[Point]
    """Grab-handle positions (0-100%). Crossing line is perpendicular through midpoint."""
    direction: LineDirection
    """Which crossing direction(s) trigger events."""
    labels: list[DetectionLabel]
    """Labels to filter (empty = all labels)."""
    color: str
    """Line display color (hex)."""


class MotionDetectionSettings(TypedDict):
    """Motion detection settings."""

    resolution: MotionResolution
    """Detection resolution quality."""
    timeout: int
    """Motion dwell time in seconds."""


class ObjectDetectionSettings(TypedDict):
    """Object detection settings."""

    confidence: float
    """Minimum confidence threshold (0-1)."""

    suppressStatic: NotRequired[bool]
    """Suppress events from objects that stay stationary across events (e.g. parked cars). Defaults to True."""


class AudioDetectionSettings(TypedDict):
    """Audio detection settings."""

    minDecibels: float
    """Minimum volume threshold in dBFS (-100 to 0). Audio below this level is skipped."""
    timeout: int
    """Audio dwell time in seconds."""


class SensorTriggerRef(TypedDict):
    """Stable reference to a sensor for cascade trigger configuration.
    Uses composite key (sensorType + sensorName + pluginId) instead of UUID
    so references survive plugin restarts."""

    sensorType: SensorType
    """Sensor type (e.g. 'contact', 'doorbell')."""
    sensorName: str
    """Sensor name (stable across restarts)."""
    pluginId: str
    """Plugin ID that provides this sensor."""


class SensorTriggerSettings(TypedDict):
    """Sensor trigger settings (contact, doorbell, switch, light, etc.)."""

    timeout: int
    """Sensor trigger timeout in seconds."""
    triggers: list[SensorTriggerRef]
    """Sensors that also trigger the detection cascade (in addition to motion/audio)."""


class PtzAutotrackSettings(TypedDict):
    """PTZ autotracking settings — automatically follow detected objects."""

    enabled: bool
    """Whether PTZ autotracking is enabled."""
    targetLabels: list[str]
    """Object labels to track (e.g. 'person', 'vehicle')."""
    minConfidence: float
    """Minimum detection confidence to track (0.3 - 1.0)."""
    triggerDeadZone: float
    """Dead zone around frame center (0 - 0.3). No motor command while the
    target is inside this zone."""
    trackingSpeed: float
    """How aggressively the camera moves to re-center the target (1 - 5).
    Higher reaches full pan/tilt speed at a smaller off-center error."""
    leadFrames: float
    """Motion prediction (0 - 6): aim this many detection-frames ahead along
    the target's measured velocity. 0 disables prediction."""
    panRate: float
    """Camera pan-rate calibration (0.1 - 3): assumed pan travel at full motor
    speed in normalized frame-widths per second. Lower it if the camera stops
    short of the target, raise it if it overshoots."""
    returnToHome: bool
    """Return to home position when no target is found for homeWaitMs."""
    homeWaitMs: int
    """How long to wait (ms) without a target before returning home."""


class CameraDetectionSettings(TypedDict):
    """Combined detection settings for a camera."""

    motion: MotionDetectionSettings
    """Motion detection settings."""
    object: ObjectDetectionSettings
    """Object detection settings."""
    audio: AudioDetectionSettings
    """Audio detection settings."""
    sensor: SensorTriggerSettings
    """Sensor trigger settings."""
    cascadeDetection: NotRequired[bool]
    """Whether the detection cascade is enabled"""
    cascadeTimeout: NotRequired[int]
    """Cascade hold-open window in seconds"""
    snooze: NotRequired[bool]
    """Whether detections are snoozed (paused)."""
