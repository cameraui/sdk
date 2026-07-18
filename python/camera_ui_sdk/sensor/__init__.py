from typing import TYPE_CHECKING

from .audio import (
    BASE_AUDIO_LABELS,
    AudioDetectorSensor,
    AudioFrameData,
    AudioLabel,
    AudioResult,
    AudioSensor,
    BaseAudioLabel,
)
from .base import (
    Sensor,
    SensorCategory,
    SensorLike,
    SensorPropertyChangeData,
    SensorType,
)

if TYPE_CHECKING:
    from ..internal.sensor_rpc import SensorCapability, SensorPropertyType  # noqa: F401

from .battery import (
    BatteryCapability,
    BatteryInfo,
    ChargingState,
)
from .classifier import (
    ClassifierDetection,
    ClassifierDetectorSensor,
    ClassifierResult,
    ClassifierSensor,
)
from .clip import (
    ClipDetectorSensor,
    ClipEmbedding,
    ClipResult,
)
from .contact import (
    ContactSensor,
)
from .detection import (
    DETECTION_ATTRIBUTES,
    DETECTION_LABELS,
    OBJECT_DETECTION_LABELS,
    BoundingBox,
    Detection,
    DetectionAttribute,
    DetectionLabel,
    ObjectDetectionLabel,
    VideoFrameData,
)
from .doorbell import (
    DoorbellTrigger,
)
from .face import (
    FaceDetection,
    FaceDetectorSensor,
    FaceResult,
    FaceSensor,
)
from .garage import (
    GarageControl,
    GarageState,
)
from .humidity import (
    HumidityInfo,
)
from .leak import (
    LeakSensor,
)
from .license_plate import (
    LicensePlateDetection,
    LicensePlateDetectorSensor,
    LicensePlateResult,
    LicensePlateSensor,
)
from .light import (
    LightCapability,
    LightControl,
)
from .lock import (
    LockControl,
    LockState,
)
from .motion import (
    MotionDetectorSensor,
    MotionResult,
    MotionSensor,
)
from .object import (
    ObjectDetectorSensor,
    ObjectResult,
    ObjectSensor,
    TrackedDetection,
)
from .occupancy import (
    OccupancySensor,
)
from .ptz import (
    PTZCapability,
    PTZControl,
    PTZDirection,
    PTZPosition,
    PTZRelativeMove,
)
from .security_system import (
    SecuritySystem,
    SecuritySystemState,
)
from .siren import (
    SirenCapability,
    SirenControl,
)
from .smoke import (
    SmokeSensor,
)
from .spec import (
    AudioInputSpec,
    AudioModelSpec,
    ModelSpec,
    ObjectModelSpec,
    VideoInputSpec,
)
from .switch import (
    SwitchControl,
)
from .temperature import (
    TemperatureInfo,
)

__all__ = [
    "Sensor",
    "SensorLike",
    "SensorType",
    "SensorCategory",
    "SensorPropertyChangeData",
    "VideoInputSpec",
    "ObjectModelSpec",
    "ModelSpec",
    "AudioInputSpec",
    "AudioModelSpec",
    "BASE_AUDIO_LABELS",
    "DETECTION_LABELS",
    "DETECTION_ATTRIBUTES",
    "OBJECT_DETECTION_LABELS",
    "ObjectDetectionLabel",
    "AudioLabel",
    "BaseAudioLabel",
    "DetectionLabel",
    "DetectionAttribute",
    "BoundingBox",
    "Detection",
    "VideoFrameData",
    "MotionResult",
    "AudioFrameData",
    "AudioResult",
    "FaceDetection",
    "FaceResult",
    "LicensePlateDetection",
    "LicensePlateResult",
    "ClassifierDetection",
    "ClassifierResult",
    "ObjectResult",
    "ChargingState",
    "PTZPosition",
    "PTZDirection",
    "PTZRelativeMove",
    "TrackedDetection",
    "ClipEmbedding",
    "ClipResult",
    # Public sensor classes
    "MotionSensor",
    "MotionDetectorSensor",
    "ObjectSensor",
    "ObjectDetectorSensor",
    "AudioSensor",
    "AudioDetectorSensor",
    "FaceSensor",
    "FaceDetectorSensor",
    "LicensePlateSensor",
    "LicensePlateDetectorSensor",
    "ClassifierSensor",
    "ClassifierDetectorSensor",
    "ClipDetectorSensor",
    "ContactSensor",
    "TemperatureInfo",
    "HumidityInfo",
    "OccupancySensor",
    "SmokeSensor",
    "LeakSensor",
    "LightControl",
    "SecuritySystem",
    "SirenControl",
    "SwitchControl",
    "LockControl",
    "GarageControl",
    "PTZControl",
    "DoorbellTrigger",
    "BatteryInfo",
    # Public capability/state enums
    "LightCapability",
    "SirenCapability",
    "PTZCapability",
    "BatteryCapability",
    "LockState",
    "GarageState",
    "SecuritySystemState",
]
