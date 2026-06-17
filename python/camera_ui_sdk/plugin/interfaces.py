from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import Mapping
from typing import (
    TYPE_CHECKING,
    Any,
    Generic,
    Literal,
    NotRequired,
    Protocol,
    TypedDict,
    runtime_checkable,
)

from typing_extensions import TypeVar as ExtTypeVar

from ..sensor import ClassifierDetection, Detection, FaceDetection, LicensePlateDetection
from ..sensor.clip import ClipEmbedding
from ..sensor.motion import VideoFrameData
from .api import PluginAPI

if TYPE_CHECKING:
    from ..camera import CameraConfig, CameraDevice
    from ..manager import DiscoveredCamera
    from ..storage import DeviceStorage, JsonSchemaWithoutCallbacks
    from ..types import LoggerService

from ..storage import JsonSchema

# TypeVar for generic storage typing in BasePlugin
# Using Mapping as bound since TypedDict is compatible with Mapping but not dict
StorageT = ExtTypeVar("StorageT", bound=Mapping[str, Any], default=dict[str, Any])
"""TypeVar for plugin storage values type. Defaults to dict[str, Any]."""


class ImageMetadata(TypedDict):
    """Image metadata for detection test requests."""

    width: int
    height: int


class AudioMetadata(TypedDict):
    """Audio metadata for detection test requests."""

    mimeType: Literal["audio/mpeg", "audio/wav", "audio/ogg"]


class MotionDetectionPluginResponse(TypedDict):
    """Response from a motion detection test."""

    detected: bool
    detections: list[Detection]
    videoData: NotRequired[bytes]


class ObjectDetectionPluginResponse(TypedDict):
    """Response from an object detection test."""

    detected: bool
    detections: list[Detection]


class AudioDetectionPluginResponse(TypedDict):
    """Response from an audio detection test."""

    detected: bool
    detections: list[Detection]
    decibels: NotRequired[float]


class FaceDetectionPluginResponse(TypedDict):
    """Response from a face detection test."""

    detected: bool
    detections: list[FaceDetection]
    embeddingModel: NotRequired[str]


class LicensePlateDetectionPluginResponse(TypedDict):
    """Response from a license plate detection test."""

    detected: bool
    detections: list[LicensePlateDetection]


class ClassifierDetectionPluginResponse(TypedDict):
    """Response from a classifier detection test."""

    detected: bool
    detections: list[ClassifierDetection]


class ClipDetectionPluginResponse(TypedDict):
    """Response from a CLIP embedding test."""

    embeddings: list[ClipEmbedding]
    embeddingModel: str


class ClipTextEmbeddingResult(TypedDict):
    """Result of text-to-embedding conversion — a single embedding vector
    plus the model name used to produce it, so downstream code can refuse to
    mix embeddings from different models."""

    embedding: list[float]
    embeddingModel: str


class BasePlugin(ABC, Generic[StorageT]):
    """Base class every plugin extends.

    It wires up the three dependencies the host injects (logger, PluginAPI,
    DeviceStorage) and declares the lifecycle methods the host calls on the
    plugin.

    Lifecycle order: the host calls :meth:`configureCameras` once at startup
    with every camera already assigned to this plugin, then calls
    :meth:`onCameraAdded` / :meth:`onCameraReleased` as the user adds or
    removes cameras at runtime.

    The generic type parameter ``StorageT`` types ``storage.values`` so plugin
    code gets autocompletion for its own settings shape.

    Example:
        ```python
        class MyStorageValues(TypedDict):
            model_path: str
            threshold: float


        class MyPlugin(BasePlugin[MyStorageValues]):
            async def configureCameras(self, cameras: list[CameraDevice]) -> None:
                # storage.values is typed as MyStorageValues
                model_path = self.storage.values.get("model_path")  # str
                for camera in cameras:
                    await self.onCameraAdded(camera)

            async def onCameraAdded(self, camera: CameraDevice) -> None:
                # Initialize camera controller
                pass

            async def onCameraReleased(self, camera_id: str) -> None:
                # Cleanup camera controller
                pass
        ```
    """

    def __init__(self, logger: LoggerService, api: PluginAPI, storage: DeviceStorage[StorageT]) -> None:
        self.logger = logger
        self.api = api
        self.storage: DeviceStorage[StorageT] = storage

    @property
    def storage_schema(self) -> list[JsonSchema]:
        """Override to register a JSON schema for the plugin-level settings
        form rendered in the UI. Default: no schema."""
        return []

    @abstractmethod
    async def configureCameras(self, cameras: list[CameraDevice]) -> None:
        """Called once on startup with every camera already assigned to this
        plugin. The plugin should attach handlers, open vendor sessions, and
        warm up models. Raising aborts plugin startup.

        Args:
            cameras: Cameras already assigned to this plugin.
        """
        ...

    @abstractmethod
    async def onCameraAdded(self, camera: CameraDevice) -> None:
        """Called whenever a camera is assigned to this plugin at runtime —
        after a discovery adoption (:meth:`DiscoveryProvider.onAdoptCamera`)
        or after the user re-assigns an existing camera in the UI. The
        plugin should set up the same per-camera state as in
        :meth:`configureCameras`.

        Args:
            camera: The camera device that was added.
        """
        ...

    @abstractmethod
    async def onCameraReleased(self, cameraId: str) -> None:
        """Called when a camera is unassigned from this plugin or deleted
        from the system. The plugin must release per-camera resources
        (sessions, timers, decoders) before returning.

        Args:
            cameraId: ID of the camera that was released.
        """
        ...


@runtime_checkable
class DiscoveryProvider(Protocol):
    """Implemented by plugins that can scan the network for new cameras and
    adopt them. Only plugins with a camera-controlling role
    (CameraController or CameraAndSensorProvider) are queried for discovery."""

    async def onDiscoverCameras(self) -> list[DiscoveredCamera]:
        """Scan the network and return the cameras the plugin can offer for
        adoption. Called by the host on demand (UI rescan button) or on a
        polling schedule.

        Returns:
            Cameras currently discoverable by this plugin.
        """
        ...

    async def onGetCameraSettings(self, camera: DiscoveredCamera) -> list[JsonSchemaWithoutCallbacks]:
        """Return a JSON schema describing the form fields (credentials,
        transport options, ...) the user must fill in to adopt this specific
        discovered camera.

        Args:
            camera: The discovered camera the user is about to adopt.

        Returns:
            Schema for the adoption form.
        """
        ...

    async def onAdoptCamera(
        self, camera: DiscoveredCamera, cameraSettings: dict[str, object]
    ) -> CameraConfig:
        """Probe the device with the user-provided settings and return the
        camera configuration the host should persist. The host then creates
        the camera and invokes :meth:`BasePlugin.onCameraAdded` on the
        plugin.

        Args:
            camera: The discovered camera being adopted.
            cameraSettings: Values entered into the adoption form.

        Returns:
            Final camera configuration for the host to persist.
        """
        ...


@runtime_checkable
class MotionDetectionInterface(Protocol):
    """Interface implemented by plugins that perform video-based motion
    detection. The host invokes :meth:`testMotionDetection` from the UI test
    panel and :meth:`detectMotion` from automation / benchmark pipelines."""

    async def testMotionDetection(
        self, video_data: bytes, config: dict[str, Any]
    ) -> MotionDetectionPluginResponse | None:
        """Run detection on a raw video buffer captured by the UI test panel
        and return the result for preview rendering."""
        ...

    async def detectMotion(
        self, frames: list[VideoFrameData], config: dict[str, Any] | None = None
    ) -> MotionDetectionPluginResponse | None:
        """Run detection on already-decoded :class:`VideoFrameData`. Called
        from automation / benchmark pipelines that supply pre-decoded frames
        directly to avoid re-encoding."""
        ...

    async def motionDetectionSettings(self) -> list[JsonSchema] | None:
        """Return the JSON schema used to render the motion-detection
        settings form in the UI. Return None for no schema."""
        ...


@runtime_checkable
class ObjectDetectionInterface(Protocol):
    """Interface implemented by plugins that perform object detection
    (person, vehicle, animal, ...)."""

    async def testObjectDetection(
        self, image_data: bytes, metadata: ImageMetadata, config: dict[str, Any]
    ) -> ObjectDetectionPluginResponse | None:
        """Run detection on a single image captured by the UI test panel;
        ``metadata`` carries the image dimensions."""
        ...

    async def detectObjects(
        self, frame: VideoFrameData, config: dict[str, Any] | None = None
    ) -> ObjectDetectionPluginResponse | None:
        """Run detection on a pre-decoded video frame. Called from
        automation / benchmark pipelines."""
        ...

    async def objectDetectionSettings(self) -> list[JsonSchema] | None:
        """Return the JSON schema used to render the object-detection
        settings form in the UI. Return None for no schema."""
        ...


@runtime_checkable
class AudioDetectionInterface(Protocol):
    """Interface implemented by plugins that perform audio event or keyword
    detection."""

    async def testAudioDetection(
        self, audio_data: bytes, metadata: AudioMetadata, config: dict[str, Any]
    ) -> AudioDetectionPluginResponse | None:
        """Run detection on an audio buffer captured by the UI test panel;
        ``metadata`` carries the input MIME type (mpeg/wav/ogg)."""
        ...

    async def audioDetectionSettings(self) -> list[JsonSchema] | None:
        """Return the JSON schema used to render the audio-detection
        settings form in the UI. Return None for no schema."""
        ...


@runtime_checkable
class FaceDetectionInterface(Protocol):
    """Interface implemented by plugins that locate faces and emit per-face
    embeddings. The NVR owns matching against enrolled faces; the plugin
    only emits raw detections + embeddings."""

    async def testFaceDetection(
        self, image_data: bytes, metadata: ImageMetadata, config: dict[str, Any]
    ) -> FaceDetectionPluginResponse | None:
        """Run face detection on a single image captured by the UI test
        panel and return the result for preview rendering."""
        ...

    async def detectFaces(
        self, frame: VideoFrameData, config: dict[str, Any] | None = None
    ) -> FaceDetectionPluginResponse | None:
        """Run face detection on a pre-decoded video frame."""
        ...

    async def faceDetectionSettings(self) -> list[JsonSchema] | None:
        """Return the JSON schema for the face-detection settings form in
        the UI. Return None for no schema."""
        ...


@runtime_checkable
class LicensePlateDetectionInterface(Protocol):
    """Interface implemented by plugins that locate license plates and run
    OCR on them."""

    async def testLicensePlateDetection(
        self, image_data: bytes, metadata: ImageMetadata, config: dict[str, Any]
    ) -> LicensePlateDetectionPluginResponse | None:
        """Run detection on a single image captured by the UI test panel and
        return the result for preview rendering."""
        ...

    async def detectLicensePlates(
        self, frame: VideoFrameData, config: dict[str, Any] | None = None
    ) -> LicensePlateDetectionPluginResponse | None:
        """Run detection on a pre-decoded video frame."""
        ...

    async def licensePlateDetectionSettings(self) -> list[JsonSchema] | None:
        """Return the JSON schema for the license-plate-detection settings
        form in the UI. Return None for no schema."""
        ...


@runtime_checkable
class ClassifierDetectionInterface(Protocol):
    """Interface implemented by plugins that run a generic image classifier
    and emit attribute/label pairs (e.g. weather, scene, activity)."""

    async def testClassifierDetection(
        self, image_data: bytes, metadata: ImageMetadata, config: dict[str, Any]
    ) -> ClassifierDetectionPluginResponse | None:
        """Run classification on a single image captured by the UI test
        panel and return the result for preview rendering."""
        ...

    async def detectClassifications(
        self, frame: VideoFrameData, config: dict[str, Any] | None = None
    ) -> ClassifierDetectionPluginResponse | None:
        """Run classification on a pre-decoded video frame."""
        ...

    async def classifierDetectionSettings(self) -> list[JsonSchema] | None:
        """Return the JSON schema for the classifier-detection settings
        form in the UI. Return None for no schema."""
        ...


@runtime_checkable
class ClipDetectionInterface(Protocol):
    """Interface implemented by plugins that generate CLIP image and text
    embeddings used for semantic search over recorded events."""

    async def testClipEmbedding(
        self, image_data: bytes, metadata: ImageMetadata, config: dict[str, Any]
    ) -> ClipDetectionPluginResponse | None:
        """Run the CLIP image branch on a single image captured by the UI
        test panel."""
        ...

    async def detectClipEmbedding(
        self, frame: VideoFrameData, config: dict[str, Any] | None = None
    ) -> ClipDetectionPluginResponse | None:
        """Run the CLIP image branch on a pre-decoded video frame."""
        ...

    async def getTextEmbedding(self, text: str) -> ClipTextEmbeddingResult:
        """Run the CLIP text branch and return a single embedding vector
        usable for semantic-search queries against previously stored image
        embeddings."""
        ...

    async def clipSettings(self) -> list[JsonSchema] | None:
        """Return the JSON schema for the CLIP settings form in the UI.
        Return None for no schema."""
        ...


# Union of all optional plugin interfaces.
PluginInterfaces = (
    MotionDetectionInterface
    | ObjectDetectionInterface
    | AudioDetectionInterface
    | FaceDetectionInterface
    | LicensePlateDetectionInterface
    | ClassifierDetectionInterface
    | ClipDetectionInterface
    | DiscoveryProvider
)
