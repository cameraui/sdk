from __future__ import annotations

from typing import Literal, NotRequired, TypedDict

from ..sensor.detection import BoundingBox
from .enums import DetectionEventType, EventTriggerType


class EventDetection(TypedDict):
    """Aggregated object detection within a segment."""

    label: str
    """Detection label (e.g. "person", "car")."""
    score: float
    """Best confidence score."""
    maxCount: int
    """Maximum simultaneous count in a single frame."""
    box: NotRequired[BoundingBox]
    """Bounding box of the highest-confidence detection (normalized 0-1)."""
    thumbnail: NotRequired[bytes]
    """Best-selected JPEG thumbnail crop. Only present on 'end' events."""
    trackId: NotRequired[int]
    """Object tracker ID (links this detection across frames)."""
    moving: NotRequired[bool]
    """Whether the object was moving (True) or stationary (False)."""


class EventAttribute(TypedDict):
    """Unified attribute within a segment (face identity, license plate, classifier result)."""

    type: str
    """Attribute type ('face', 'license_plate', or classifier-specific like 'bird')."""
    label: str
    """Identity name, plate text, or classification label."""
    confidence: NotRequired[float]
    """Detection confidence (0-1)."""
    thumbnail: NotRequired[bytes]
    """Best-selected JPEG thumbnail crop. Only present on 'end' events."""
    embedding: NotRequired[list[float]]
    """Face embedding vector for unknown face persistence."""
    embeddingModel: NotRequired[str]
    """Embedding model identifier."""
    clipEmbedding: NotRequired[list[float]]
    """CLIP embedding vector for semantic search."""
    clipEmbeddingModel: NotRequired[str]
    """CLIP embedding model identifier."""
    parentTrackId: NotRequired[int]
    """Parent object's tracker ID (links this attribute to its parent detection)."""


class EventTrigger(TypedDict):
    """Event trigger (motion, audio, sensor, or line-crossing)."""

    type: EventTriggerType
    """Trigger type."""
    label: NotRequired[str]
    """Audio label (e.g. "doorbell", "glass_break")."""
    score: NotRequired[float]
    """Best confidence score."""
    firstSeen: int
    """First detection time (Unix ms)."""
    lastSeen: int
    """Last detection time (Unix ms)."""
    lineName: NotRequired[str]
    """Name of the crossed line (only for line-crossing triggers)."""
    crossingDirection: NotRequired[str]
    """Crossing direction (only for line-crossing triggers)."""
    trackId: NotRequired[int]
    """Track ID of the object that crossed (only for line-crossing triggers)."""


class EventDescription(TypedDict):
    """AI-generated event description."""

    title: str
    """Brief title of what occurred."""
    description: str
    """Chronological narrative of the scene."""
    summary: str
    """Two-sentence notification-friendly summary."""
    threatLevel: int
    """Threat level: 0 = normal, 1 = suspicious, 2 = threat."""


class EventSegment(TypedDict):
    """A contiguous object detection phase within an event."""

    firstSeen: int
    """Segment start time (Unix ms)."""
    lastSeen: int
    """Segment end time (Unix ms)."""
    thumbnail: NotRequired[bytes]
    """Best-selected JPEG scene thumbnail for this segment. Only present on 'end' events."""
    detections: list[EventDetection]
    """Object detections in this segment."""
    attributes: list[EventAttribute]
    """Unified attributes (faces, plates, classifications)."""
    zones: NotRequired[list[str]]
    """Names of detection zones any detection in this segment overlapped (deduplicated)."""
    description: NotRequired[EventDescription]
    """AI-generated description for this segment."""


class DetectionEvent(TypedDict):
    """Aggregated detection event with lifecycle (start -> update -> end).
    Groups individual sensor detections into structured events."""

    id: str
    """Unique event ID."""
    cameraId: str
    """Camera that produced this event."""
    state: Literal["active", "ended"]
    """Event lifecycle state."""
    startTime: int
    """Event start time (Unix ms)."""
    endTime: NotRequired[int]
    """Event end time (Unix ms, only when ended)."""
    lastUpdate: int
    """Last activity timestamp (Unix ms)."""
    types: list[str]
    """Detection types present in this event (for filtering)."""
    triggers: list[EventTrigger]
    """Event triggers (motion/audio)."""
    segments: list[EventSegment]
    """Detection segments (object detection phases).
    For segment-* messages: contains only the current segment.
    For start/end messages: empty."""
    segmentIndex: NotRequired[int]
    """Index of the segment in segments[0] for segment-* messages."""
    expectedEndTime: NotRequired[int]
    """Expected event end time (Unix ms) — the latest dwell expiry across all
    currently-active triggers. Monotonically non-decreasing during the event
    lifetime. Updated on each `update` / `segment-*` message."""
    thumbnail: NotRequired[bytes]
    """Full-frame downscaled JPEG captured at event start. Inline only on the first
    message that delivers it (start or the first update); the NVR plugin persists it
    and clients fetch it on demand via getEventThumbnails."""


class DetectionEventPayload(TypedDict):
    """Emitted for detection events (start/update/end)."""

    type: DetectionEventType
    """Event lifecycle type."""
    event: DetectionEvent
    """Full event data."""
