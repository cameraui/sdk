from __future__ import annotations

from typing import TYPE_CHECKING, Protocol, TypedDict

if TYPE_CHECKING:
    from PIL.Image import Image as PILImageType

from .enums import DecoderFormat, ImageInputFormat, ImageOutputFormat


class FrameMetadata(TypedDict):
    """Decoded frame metadata from the video decoder."""

    format: DecoderFormat
    """Decoder format."""
    frameSize: int
    """Total frame data size in bytes."""
    width: int
    """Current frame width (may be scaled)."""
    height: int
    """Current frame height (may be scaled)."""
    origWidth: int
    """Original video width before scaling."""
    origHeight: int
    """Original video height before scaling."""


class ImageInformation(TypedDict):
    """Image dimension and format information."""

    width: int
    """Image width in pixels."""
    height: int
    """Image height in pixels."""
    channels: int
    """Number of color channels (1=gray, 3=RGB, 4=RGBA)."""
    format: ImageInputFormat
    """Pixel format."""


class ImageCrop(TypedDict):
    """Crop region for image processing."""

    top: int
    """Top offset in pixels."""
    left: int
    """Left offset in pixels."""
    width: int
    """Crop width in pixels."""
    height: int
    """Crop height in pixels."""


class ImageResize(TypedDict):
    """Resize dimensions for image processing."""

    width: int
    """Target width in pixels."""
    height: int
    """Target height in pixels."""


class ImageFormat(TypedDict):
    """Output format conversion option."""

    to: ImageOutputFormat
    """Target pixel format."""


class ImageOptions(TypedDict, total=False):
    """Combined image processing options."""

    format: ImageFormat
    """Output format conversion."""
    crop: ImageCrop
    """Crop region."""
    resize: ImageResize
    """Resize dimensions."""


class FrameImage(TypedDict):
    """Processed image with PIL Image instance."""

    image: PILImageType
    """PIL Image instance for further processing."""
    info: ImageInformation
    """Image information."""


class FrameBuffer(TypedDict):
    """Processed image as raw buffer."""

    image: bytes
    """Raw pixel data."""
    info: ImageInformation
    """Image information."""


class FrameData(TypedDict):
    """Raw frame data from decoder."""

    id: str
    """Unique frame identifier."""
    data: bytes
    """Raw frame pixel data."""
    timestamp: int
    """Frame capture timestamp."""
    metadata: FrameMetadata
    """Decoder metadata."""
    info: ImageInformation
    """Image information."""


class VideoFrame(Protocol):
    """
    Video frame with processing capabilities.
    Provides methods to convert raw decoder output to usable image formats.
    """

    @property
    def id(self) -> str:
        """Unique frame identifier."""
        ...

    @property
    def data(self) -> bytes:
        """Raw frame pixel data."""
        ...

    @property
    def metadata(self) -> FrameMetadata:
        """Decoder metadata."""
        ...

    @property
    def info(self) -> ImageInformation:
        """Image information."""
        ...

    @property
    def timestamp(self) -> int:
        """Frame capture timestamp."""
        ...

    @property
    def inputWidth(self) -> int:
        """Original video width."""
        ...

    @property
    def inputHeight(self) -> int:
        """Original video height."""
        ...

    @property
    def inputFormat(self) -> DecoderFormat:
        """Decoder output format."""
        ...

    async def toBuffer(self) -> FrameBuffer:
        """
        Convert frame to raw pixel buffer.

        Returns:
            Processed image buffer with metadata.
        """
        ...

    async def toImage(self) -> FrameImage:
        """
        Convert frame to PIL image instance.

        Returns:
            PIL image for further processing.
        """
        ...


class CameraFrameWorkerSettings(TypedDict):
    """Frame worker (decoder) settings."""

    fps: int
    """Target frames per second for detection."""


class SnapshotSettings(TypedDict):
    """Snapshot settings for a camera."""

    autoRefresh: bool
    """Enable automatic snapshot refresh."""
    ttl: int
    """Cache TTL in seconds (how long a snapshot is valid)."""
    interval: int
    """Auto-refresh interval in seconds (min: 10, max: 60)."""
