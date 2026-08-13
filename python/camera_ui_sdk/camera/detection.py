from __future__ import annotations

from typing import Literal, NotRequired, TypedDict

from ..sensor.detection import DetectionLabel
from .enums import LineDirection, MotionResolution, Point, ZoneFilter, ZoneType


class MotionZone(TypedDict):
    """
    Motion zone configuration.
    Motion carries no labels, so a motion zone only says where frame motion
    counts. No motion zone at all means motion counts everywhere.
    """

    name: str
    """Zone display name."""
    points: list[Point]
    """Polygon points (0-100 percentage coordinates)."""
    filter: ZoneFilter
    """Include/exclude filter mode."""
    color: str
    """Zone display color (hex)."""


class ObjectZone(TypedDict):
    """
    Object zone configuration.
    With at least one include object zone, an object counts only inside such a
    zone and only when its label is listed there.
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
    """Labels that count in this zone."""
    color: str
    """Zone display color (hex)."""


class PrivacyZone(TypedDict):
    """
    Privacy zone configuration.
    camera.ui always covers the area in live view, playback and the pictures it
    generates; dropDetections decides whether detections inside are dropped too.
    """

    name: str
    """Zone display name."""
    points: list[Point]
    """Polygon points (0-100 percentage coordinates)."""
    dropDetections: bool
    """Whether detections inside are dropped as well. Default: True."""


PrivacyFallback = Literal["send", "drop"]
"""What happens to a picture whose privacy zones could not be applied: ship it unmasked, or drop it."""


class CameraZones(TypedDict):
    """
    Everything the zone editor draws, one list per purpose.
    Motion decides where frame motion counts, object which types count where,
    privacy where nothing is looked at, alert which types notify from where,
    and lines report objects crossing them.
    """

    privacyFallback: PrivacyFallback
    motion: list[MotionZone]
    object: list[ObjectZone]
    privacy: list[PrivacyZone]
    alert: list[AlertZone]
    lines: list[DetectionLine]


AlertZoneMatch = Literal["anchor", "intersect", "contain"]
"""When an object counts as inside an alert zone: where it stands, touching, or fully inside."""


class AlertZone(TypedDict):
    """
    Alert zone configuration.
    Never filters detections: a label selected here only sends push
    notifications while an object of that label is inside the zone.
    """

    name: str
    """Zone display name."""
    points: list[Point]
    """Polygon points (0-100 percentage coordinates)."""
    labels: list[DetectionLabel]
    """Labels that alert from inside this zone (empty = zone is inert)."""
    match: AlertZoneMatch
    """When an object counts as inside. Default: anchor."""
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
    """Minimum confidence threshold (0.3 - 1.0)."""
    labels: NotRequired[list[DetectionLabel]]
    """Object labels to detect (empty = all). Detections with other labels are dropped."""
    suppressStatic: NotRequired[bool]
    """Suppress events from objects that stay stationary across events (e.g. parked cars). Defaults to True."""
    timeout: NotRequired[int]
    """Object dwell time in seconds for camera-based object sensors that report a detection without a matching end report. Frame-based detection ignores this. Defaults to 15."""


class AudioDetectionSettings(TypedDict):
    """Audio detection settings."""

    minDecibels: float
    """Minimum volume threshold in dBFS (-100 to 0). Audio below this level is skipped."""
    timeout: int
    """Audio dwell time in seconds."""
    confidence: NotRequired[float]
    """Minimum confidence threshold (0 - 1) for a labelled audio detection to count."""


class FaceDetectionSettings(TypedDict):
    """Face detection settings."""

    confidence: NotRequired[float]
    """Minimum confidence threshold (0 - 1) for a face to count."""


class LicensePlateDetectionSettings(TypedDict):
    """License plate detection settings."""

    confidence: NotRequired[float]
    """Minimum text recognition confidence (0 - 1) for a plate read to count."""
    minLength: NotRequired[int]
    """Minimum plate text length, shorter reads are dropped as fragments."""


class SensorTriggerSettings(TypedDict):
    """Sensor trigger settings (contact, doorbell, switch, light, etc.)."""

    timeout: int
    """Sensor trigger timeout in seconds."""
    triggers: list[str]
    """Sensor entity ids that also trigger the detection cascade (in addition to motion/audio)."""


class PtzAutotrackSettings(TypedDict):
    """PTZ autotracking settings: the camera follows detected objects automatically."""

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
    leadMs: float
    """Motion prediction (0 - 4000): aim this many milliseconds ahead along the
    target's measured velocity, covering the time the camera needs to move and
    settle. 0 disables prediction."""
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
    face: NotRequired[FaceDetectionSettings]
    """Face detection settings."""
    licensePlate: NotRequired[LicensePlateDetectionSettings]
    """License plate detection settings."""
    sensor: SensorTriggerSettings
    """Sensor trigger settings."""
    cascadeDetection: NotRequired[bool]
    """Whether the detection cascade is enabled."""
    cascadeTimeout: NotRequired[int]
    """Cascade hold-open window in seconds."""
    snooze: NotRequired[bool]
    """Whether detections are snoozed (paused)."""
