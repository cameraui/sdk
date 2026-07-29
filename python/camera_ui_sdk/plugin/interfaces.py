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
    from ..sensor.base import SensorLike
    from ..storage import DeviceStorage, JsonSchemaWithoutCallbacks
    from ..types import LoggerService

from ..storage import JsonSchema

# bound is Mapping, not dict: TypedDict is compatible with Mapping only
StorageT = ExtTypeVar("StorageT", bound=Mapping[str, Any], default=dict[str, Any])
"""Type of the plugin's storage values. Defaults to dict[str, Any]."""


class ImageMetadata(TypedDict):
    """Image metadata passed to detector test methods."""

    width: int
    """Image width in pixels."""

    height: int
    """Image height in pixels."""


class AudioMetadata(TypedDict):
    """Audio metadata passed to audio detector test methods."""

    mimeType: Literal["audio/mpeg", "audio/wav", "audio/ogg"]
    """Container format of the audio buffer."""


class MotionDetectionPluginResponse(TypedDict):
    """Result of a motion detection run."""

    detected: bool
    """True when the run produced at least one detection."""

    detections: list[Detection]
    """Motion regions found in the input."""

    videoData: NotRequired[bytes]
    """Annotated re-encoded clip for the UI test panel, when the plugin renders one."""


class ObjectDetectionPluginResponse(TypedDict):
    """Result of an object detection run."""

    detected: bool
    """True when the run produced at least one detection."""

    detections: list[Detection]
    """Detected objects with label, score and bounding box."""


class AudioDetectionPluginResponse(TypedDict):
    """Result of an audio detection run."""

    detected: bool
    """True when the run produced at least one detection."""

    detections: list[Detection]
    """Detected audio events."""

    decibels: NotRequired[float]
    """Loudness of the analysed buffer in dBFS."""


class FaceDetectionPluginResponse(TypedDict):
    """Result of a face detection run."""

    detected: bool
    """True when the run produced at least one detection."""

    detections: list[FaceDetection]
    """Detected faces, each with its embedding."""

    embeddingModel: NotRequired[str]
    """Model that produced the embeddings; consumers must not mix models."""


class LicensePlateDetectionPluginResponse(TypedDict):
    """Result of a license plate detection run."""

    detected: bool
    """True when the run produced at least one detection."""

    detections: list[LicensePlateDetection]
    """Detected plates with their OCR text."""


class ClassifierDetectionPluginResponse(TypedDict):
    """Result of a classifier detection run."""

    detected: bool
    """True when the run produced at least one classification."""

    detections: list[ClassifierDetection]
    """Attribute/label pairs the classifier emitted."""


class ClipDetectionPluginResponse(TypedDict):
    """Result of a CLIP image embedding run."""

    embeddings: list[ClipEmbedding]
    """Embedding vectors generated for the input."""

    embeddingModel: str
    """Model that produced the embeddings; consumers must not mix models."""


class ClipTextEmbeddingResult(TypedDict):
    """Result of a CLIP text embedding request."""

    embedding: list[float]
    """Embedding vector for the query text."""

    embeddingModel: str
    """Model that produced the embedding; consumers must not mix models."""


class BasePlugin(ABC, Generic[StorageT]):
    """Base class every plugin extends.

    It wires up the three dependencies the host injects (logger, PluginAPI,
    DeviceStorage) and declares the lifecycle methods the host calls on the
    plugin.

    The host calls :meth:`configureCameras` once at startup with every camera
    already assigned to this plugin, then :meth:`onCameraAdded` /
    :meth:`onCameraReleased` as the user adds or removes cameras at runtime.
    ``StorageT`` types ``storage.values`` so plugin code gets autocompletion
    for its own settings shape.

    Example:
        ```python
        class MyPlugin(BasePlugin[MyStorageValues]):
            async def configureCameras(self, cameras: list[CameraDevice]) -> None:
                self.model_path = self.storage.values.get("model_path")
                for camera in cameras:
                    await self.onCameraAdded(camera)

            async def onCameraAdded(self, camera: CameraDevice) -> None:
                self.state[camera.id] = await self.attach(camera)

            async def onCameraReleased(self, camera_id: str) -> None:
                self.state.pop(camera_id, None)
        ```
    """

    def __init__(self, logger: LoggerService, api: PluginAPI, storage: DeviceStorage[StorageT]) -> None:
        self.logger = logger
        self.api = api
        self.storage: DeviceStorage[StorageT] = storage

    @property
    def storage_schema(self) -> list[JsonSchema]:
        """Override to register a JSON schema for the plugin-level settings form rendered in the UI. Default: no schema."""
        return []

    @abstractmethod
    async def configureCameras(self, cameras: list[CameraDevice]) -> None:
        """Called once on startup with every camera already assigned to this
        plugin. Attach handlers, open vendor sessions, warm up models here.
        Raising aborts plugin startup.

        Args:
            cameras: Cameras already assigned to this plugin.
        """
        ...

    @abstractmethod
    async def onCameraAdded(self, camera: CameraDevice) -> None:
        """Called whenever a camera is assigned to this plugin at runtime,
        after a discovery adoption (:meth:`DiscoveryProvider.onAdoptCamera`)
        or after the user re-assigns an existing camera. Set up the same
        per-camera state as in :meth:`configureCameras`.

        Args:
            camera: The camera device that was added.
        """
        ...

    @abstractmethod
    async def onCameraReleased(self, cameraId: str) -> None:
        """Called when a camera is unassigned from this plugin or deleted
        from the system. Release per-camera resources (sessions, timers,
        decoders) before returning.

        Args:
            cameraId: ID of the camera that was released.
        """
        ...

    async def configureSensors(self, sensors: list[SensorLike]) -> None:
        """Called once on startup with every sensor this plugin may consume:
        sensors whose type is listed in ``contract.consumes`` and that are
        exposed. Each sensor carries ``type``, ``assignedCameraIds``,
        ``exposed`` and ``connected``, so consumers decide rendering purely
        from that data. Optional, only bridge plugins override it.

        Args:
            sensors: Consumable sensors known at startup.
        """
        return None

    async def onSensorAdded(self, sensor: SensorLike) -> None:
        """Called when a sensor enters this plugin's consumable view at
        runtime: it was created, became exposed, or its type became
        consumable.

        Args:
            sensor: The sensor that appeared.
        """
        return None

    async def onSensorReleased(self, sensorId: str) -> None:
        """Called when a sensor permanently leaves the consumable view: it
        was deleted or unexposed. Plugin connectivity does NOT fire this,
        watch ``sensor.onConnectedChanged`` for that.

        Args:
            sensorId: Persistent id of the sensor that left.
        """
        return None


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
        transport options, ...) the user must fill in to adopt this
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
        the camera and invokes :meth:`BasePlugin.onCameraAdded` on the plugin.

        Args:
            camera: The discovered camera being adopted.
            cameraSettings: Values entered into the adoption form.

        Returns:
            Final camera configuration for the host to persist.
        """
        ...


@runtime_checkable
class MotionDetectionInterface(Protocol):
    """Implemented by plugins that perform video-based motion detection. The
    host invokes :meth:`testMotionDetection` from the UI test panel and
    :meth:`detectMotion` from automation / benchmark pipelines."""

    async def testMotionDetection(
        self, video_data: bytes, config: dict[str, Any]
    ) -> MotionDetectionPluginResponse | None:
        """Run detection on a raw video buffer captured by the UI test panel and return the result for preview rendering."""
        ...

    async def detectMotion(
        self, frames: list[VideoFrameData], config: dict[str, Any] | None = None
    ) -> MotionDetectionPluginResponse | None:
        """Run detection on already-decoded frames, supplied by automation / benchmark pipelines to avoid re-encoding."""
        ...

    async def motionDetectionSettings(self) -> list[JsonSchema] | None:
        """Return the JSON schema used to render the motion-detection settings form in the UI, or None for no schema."""
        ...


@runtime_checkable
class ObjectDetectionInterface(Protocol):
    """Implemented by plugins that perform object detection (person, vehicle,
    animal, ...)."""

    async def testObjectDetection(
        self, image_data: bytes, metadata: ImageMetadata, config: dict[str, Any]
    ) -> ObjectDetectionPluginResponse | None:
        """Run detection on a single image captured by the UI test panel; ``metadata`` carries the image dimensions."""
        ...

    async def detectObjects(
        self, frame: VideoFrameData, config: dict[str, Any] | None = None
    ) -> ObjectDetectionPluginResponse | None:
        """Run detection on a pre-decoded video frame. Called from automation / benchmark pipelines."""
        ...

    async def objectDetectionSettings(self) -> list[JsonSchema] | None:
        """Return the JSON schema used to render the object-detection settings form in the UI, or None for no schema."""
        ...


@runtime_checkable
class AudioDetectionInterface(Protocol):
    """Implemented by plugins that perform audio event or keyword detection."""

    async def testAudioDetection(
        self, audio_data: bytes, metadata: AudioMetadata, config: dict[str, Any]
    ) -> AudioDetectionPluginResponse | None:
        """Run detection on an audio buffer captured by the UI test panel; ``metadata`` carries the input MIME type."""
        ...

    async def audioDetectionSettings(self) -> list[JsonSchema] | None:
        """Return the JSON schema used to render the audio-detection settings form in the UI, or None for no schema."""
        ...


@runtime_checkable
class FaceDetectionInterface(Protocol):
    """Implemented by plugins that locate faces and emit per-face embeddings.
    The NVR owns matching against enrolled faces, the plugin only emits raw
    detections and embeddings."""

    async def testFaceDetection(
        self, image_data: bytes, metadata: ImageMetadata, config: dict[str, Any]
    ) -> FaceDetectionPluginResponse | None:
        """Run face detection on a single image captured by the UI test panel and return the result for preview rendering."""
        ...

    async def detectFaces(
        self, frame: VideoFrameData, config: dict[str, Any] | None = None
    ) -> FaceDetectionPluginResponse | None:
        """Run face detection on a pre-decoded video frame."""
        ...

    async def faceDetectionSettings(self) -> list[JsonSchema] | None:
        """Return the JSON schema for the face-detection settings form in the UI, or None for no schema."""
        ...


@runtime_checkable
class LicensePlateDetectionInterface(Protocol):
    """Implemented by plugins that locate license plates and run OCR on
    them."""

    async def testLicensePlateDetection(
        self, image_data: bytes, metadata: ImageMetadata, config: dict[str, Any]
    ) -> LicensePlateDetectionPluginResponse | None:
        """Run detection on a single image captured by the UI test panel and return the result for preview rendering."""
        ...

    async def detectLicensePlates(
        self, frame: VideoFrameData, config: dict[str, Any] | None = None
    ) -> LicensePlateDetectionPluginResponse | None:
        """Run detection on a pre-decoded video frame."""
        ...

    async def licensePlateDetectionSettings(self) -> list[JsonSchema] | None:
        """Return the JSON schema for the license-plate-detection settings form in the UI, or None for no schema."""
        ...


@runtime_checkable
class ClassifierDetectionInterface(Protocol):
    """Implemented by plugins that run a generic image classifier and emit
    attribute/label pairs (e.g. weather, scene, activity)."""

    async def testClassifierDetection(
        self, image_data: bytes, metadata: ImageMetadata, config: dict[str, Any]
    ) -> ClassifierDetectionPluginResponse | None:
        """Run classification on a single image captured by the UI test panel and return the result for preview rendering."""
        ...

    async def detectClassifications(
        self, frame: VideoFrameData, config: dict[str, Any] | None = None
    ) -> ClassifierDetectionPluginResponse | None:
        """Run classification on a pre-decoded video frame."""
        ...

    async def classifierDetectionSettings(self) -> list[JsonSchema] | None:
        """Return the JSON schema for the classifier-detection settings form in the UI, or None for no schema."""
        ...


@runtime_checkable
class ClipDetectionInterface(Protocol):
    """Implemented by plugins that generate CLIP image and text embeddings
    used for semantic search over recorded events."""

    async def testClipEmbedding(
        self, image_data: bytes, metadata: ImageMetadata, config: dict[str, Any]
    ) -> ClipDetectionPluginResponse | None:
        """Run the CLIP image branch on a single image captured by the UI test panel."""
        ...

    async def detectClipEmbedding(
        self, frame: VideoFrameData, config: dict[str, Any] | None = None
    ) -> ClipDetectionPluginResponse | None:
        """Run the CLIP image branch on a pre-decoded video frame."""
        ...

    async def getTextEmbedding(self, text: str) -> ClipTextEmbeddingResult:
        """Run the CLIP text branch and return a vector usable for semantic-search queries against stored image embeddings."""
        ...

    async def clipSettings(self) -> list[JsonSchema] | None:
        """Return the JSON schema for the CLIP settings form in the UI, or None for no schema."""
        ...


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
"""Union of all optional plugin interfaces."""
