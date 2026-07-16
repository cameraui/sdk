from __future__ import annotations

from typing import Literal, NotRequired

from typing_extensions import TypedDict


class VideoInputSpec(TypedDict):
    """Expected video input dimensions and pixel format for a detector model."""

    width: int  # Expected frame width in pixels
    height: int  # Expected frame height in pixels
    format: Literal[
        "rgb", "nv12", "gray"
    ]  # Pixel format: rgb=3 bytes/pixel, gray=1 byte/pixel, nv12=YUV semi-planar


class ObjectModelSpec(TypedDict):
    """Model spec for object detectors.

    Only declares input dimensions — the output label set is dynamic and
    comes from the model itself.
    """

    input: VideoInputSpec  # Required input frame dimensions and pixel format


class ModelSpec(TypedDict):
    """Model spec for detectors with fixed output labels (face, classifier, license plate).

    Declares the input shape the backend should produce and the trigger
    labels that should activate this detector.
    """

    input: VideoInputSpec  # Required input frame dimensions and pixel format
    triggerLabels: list[str]  # Labels emitted by an upstream object detector that activate this detector
    embeddingModel: NotRequired[
        str
    ]  # Embedding model identifier. Required for face recognition and for CLIP: embeddings are stored and matched under this id


class AudioInputSpec(TypedDict):
    """Expected audio input format for an audio detector model."""

    sampleRate: int  # Sample rate in Hz the model expects
    channels: int  # Channel count the model expects (typically 1 = mono)
    format: Literal[
        "pcm16", "float32"
    ]  # Sample format: pcm16=16-bit signed integer PCM, float32=32-bit float
    samplesPerFrame: NotRequired[
        int
    ]  # Number of samples per audio frame the detector expects; the backend buffers audio to deliver exactly this many samples per call


class AudioModelSpec(TypedDict):
    """Model spec for audio detectors."""

    input: AudioInputSpec  # Required input audio format
