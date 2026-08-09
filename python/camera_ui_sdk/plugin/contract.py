from __future__ import annotations

from enum import StrEnum
from typing import Literal, NotRequired, TypedDict

from ..sensor import SensorType

PROTOCOL_LEVEL = 2
"""Compatibility level of the plugin surface: the plugin-facing API and the
plugin wire protocol. Bumped only on breaking changes, never for additive
features. The CLI stamps the level a plugin was built against into its
bundle (``cameraui.protocolLevel`` in the bundle package.json); the server
compares that stamp with its own level and refuses to start plugins outside
its supported range."""

PythonVersion = Literal["3.11", "3.12"]
"""Python interpreter major.minor version a Python plugin requires. The host
ensures a matching interpreter exists in its venv pool before launching the
plugin; Node and Go plugins ignore this field."""


class PluginRole(StrEnum):
    """Role a plugin plays in the system. The role decides which lifecycle
    hooks the host invokes and which contract validations apply."""

    Hub = "hub"
    """Cross-camera aggregator (smart-home bridge, recorder). Owns no cameras and provides no sensors."""

    SensorProvider = "sensorProvider"
    """Adds sensors to cameras owned by other plugins, for example a detector running on foreign video frames."""

    CameraController = "cameraController"
    """Manages cameras and their media streams: stream URLs, PTZ, snapshots. Provides no sensors for foreign cameras."""

    CameraAndSensorProvider = "cameraAndSensorProvider"
    """Manages cameras and exposes sensors, on its own cameras and, with ``consumes`` set, on foreign ones."""


class PluginInterface(StrEnum):
    """Capability flags a plugin advertises in its contract.

    The host uses these to decide which RPC handlers to wire up and which
    UI affordances to show.
    """

    MotionDetection = "MotionDetection"
    """Implements MotionDetectionInterface (video-based motion detection)."""

    ObjectDetection = "ObjectDetection"
    """Implements ObjectDetectionInterface (e.g. person, vehicle, animal)."""

    AudioDetection = "AudioDetection"
    """Implements AudioDetectionInterface (event/keyword audio detection)."""

    FaceDetection = "FaceDetection"
    """Implements FaceDetectionInterface (face localisation + embeddings). Matching against enrolled faces happens in the NVR."""

    LicensePlateDetection = "LicensePlateDetection"
    """Implements LicensePlateDetectionInterface (plate localisation + OCR)."""

    ClassifierDetection = "ClassifierDetection"
    """Implements ClassifierDetectionInterface (generic image classification emitting attribute/label pairs)."""

    ClipDetection = "ClipDetection"
    """Implements ClipDetectionInterface (CLIP image and text embeddings used for semantic search)."""

    DiscoveryProvider = "DiscoveryProvider"
    """Implements DiscoveryProvider (network scan + adoption). Only valid for camera-controlling roles."""

    NVR = "NVR"
    """Implements NVRInterface (events and recordings). Exactly one plugin per host fills this role at runtime."""

    Notifier = "Notifier"
    """Implements NotifierInterface, so the NotificationManager can dispatch notifications to this plugin."""

    OAuthCapable = "OAuthCapable"
    """Implements the OAuthCapable base interface plus at least one of the flow sub-interfaces below."""

    OAuthDeviceFlow = "OAuthDeviceFlow"
    """Implements OAuthDeviceFlowCapable (RFC 8628 Device Authorization Grant)."""

    OAuthAuthCodeFlow = "OAuthAuthCodeFlow"
    """Implements OAuthAuthCodeFlowCapable (Authorization Code Flow + PKCE)."""

    OAuthClientCredentials = "OAuthClientCredentials"
    """Implements OAuthClientCredentialsCapable (user-supplied client_id + client_secret)."""


class PluginCapability(StrEnum):
    """Permission a plugin requests so it can call a host-provided system
    feature. Each capability gates one outgoing SDK call. Calls without the
    matching capability are rejected by the host."""

    PublishNotifications = "publishNotifications"
    """Allows ``api.notificationManager.publish``. Without it the host drops published notifications and logs an error."""


class PluginContract(TypedDict):
    """Manifest contract a plugin declares so the host knows what it does and
    what it needs at load time. Validated before the plugin is started."""

    name: str
    """Stable, unique identifier: registry key, log prefix and storage namespace."""

    role: PluginRole
    """Role of the plugin (see :class:`PluginRole`)."""

    provides: list[SensorType]
    """Sensor types the plugin produces. Empty for hubs and pure camera-controllers, required for sensor providers."""

    consumes: list[SensorType]
    """Sensor types the plugin reads from other plugins (e.g. a face plugin consuming camera video frames)."""

    interfaces: list[PluginInterface]
    """Capability flags the plugin implements (see :class:`PluginInterface`)."""

    capabilities: NotRequired[list[PluginCapability]]
    """Permissions the plugin requests to call host system features (see :class:`PluginCapability`)."""

    pythonVersion: NotRequired[PythonVersion]
    """Required Python interpreter version for Python plugins. Ignored by Node and Go plugins."""

    dependencies: NotRequired[list[str]]
    """Extra dependencies installed into the plugin's runtime (Go module paths, PyPI or npm names)."""


class PluginInfo(TypedDict):
    """Lightweight handle identifying an installed plugin, used in RPC
    payloads and managers to refer to the plugin without shipping its full
    state."""

    id: str
    """Unique runtime ID assigned by the host (stable across restarts)."""

    name: str
    """Plugin package name (matches PluginContract.name)."""

    contract: PluginContract
    """Full contract the plugin was loaded with."""
