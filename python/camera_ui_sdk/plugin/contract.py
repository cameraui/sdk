from __future__ import annotations

from enum import StrEnum
from typing import Literal, NotRequired, TypedDict

from ..sensor import SensorType

PythonVersion = Literal["3.11", "3.12"]
"""Python interpreter major.minor version a Python plugin requires. The host
ensures a matching interpreter exists in its venv pool before launching the
plugin; Node and Go plugins ignore this field."""


class PluginRole(StrEnum):
    """Role a plugin plays in the system. The role decides which lifecycle
    hooks the host invokes and which contract validations apply."""

    Hub = "hub"
    """System-wide aggregator that attaches to cameras owned by *other* plugins
    to provide a cross-camera service (e.g. bridging cameras and sensors into a
    smart-home platform, or recording and notifications). A hub creates no
    cameras of its own and provides no sensors (`provides` must be empty); it
    attaches to cameras via the `hub` assignment and typically reads camera and
    sensor state through `consumes`."""

    SensorProvider = "sensorProvider"
    """Adds sensors to existing cameras without owning the camera itself.
    Typical use: a detection plugin that consumes another plugin's video
    frames and emits motion / object / face detections back into the
    system."""

    CameraController = "cameraController"
    """Manages cameras and their media streams (ONVIF, RTSP, generic IP, ...).
    The plugin is responsible for stream URLs, PTZ, snapshots, and the
    lifecycle hooks in BasePlugin. It does not produce sensors for foreign
    cameras."""

    CameraAndSensorProvider = "cameraAndSensorProvider"
    """Combined role: plugin both manages cameras and exposes sensors (its
    own cameras and, when ``consumes`` is set, also foreign cameras). Used
    by integrations that ship a complete camera + detection stack."""


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
    """Implements FaceDetectionInterface (face localisation + embeddings).
    The NVR owns matching against enrolled faces; the plugin only emits
    detections + embeddings."""

    LicensePlateDetection = "LicensePlateDetection"
    """Implements LicensePlateDetectionInterface (plate localisation + OCR)."""

    ClassifierDetection = "ClassifierDetection"
    """Implements ClassifierDetectionInterface (generic image classification
    emitting attribute/label pairs)."""

    ClipDetection = "ClipDetection"
    """Implements ClipDetectionInterface (CLIP image and text embeddings used
    for semantic search)."""

    DiscoveryProvider = "DiscoveryProvider"
    """Implements DiscoveryProvider — plugin can scan the network for new
    cameras and adopt them. Only valid for camera-controlling roles."""

    NVR = "NVR"
    """Implements NVRInterface — persists events and recordings, and serves
    them back to the UI / mobile clients. Exactly one plugin per host fills
    this role at runtime."""

    Notifier = "Notifier"
    """Implements NotifierInterface (get_devices, send_notification, ...).
    Lets the central NotificationManager dispatch notifications to this
    plugin regardless of role — see camera_ui_sdk/plugin/notifier.py."""

    OAuthCapable = "OAuthCapable"
    """Implements the OAuthCapable base interface (getOAuthMetadata,
    getOAuthState, disconnect) plus at least one flow sub-interface —
    see camera_ui_sdk/plugin/oauth.py."""

    OAuthDeviceFlow = "OAuthDeviceFlow"
    """Implements OAuthDeviceFlowCapable (RFC 8628 Device Authorization Grant)."""

    OAuthAuthCodeFlow = "OAuthAuthCodeFlow"
    """Implements OAuthAuthCodeFlowCapable (Authorization Code Flow + PKCE)."""

    OAuthClientCredentials = "OAuthClientCredentials"
    """Implements OAuthClientCredentialsCapable (user-supplied client_id + client_secret)."""


class PluginCapability(StrEnum):
    """Permission a plugin requests so it can call a host-provided system
    feature. Each capability gates one outgoing SDK call — calls without
    the matching capability are rejected by the host."""

    PublishNotifications = "publishNotifications"
    """Grants the plugin permission to call
    ``api.notificationManager.publish``. Without this capability the host
    silently drops published notifications and logs an error."""


class PluginContract(TypedDict):
    """Manifest contract a plugin declares so the host knows what it does
    and what it needs at load time. Validated by ``helper.py`` before the
    plugin is started."""

    name: str
    """Stable, unique identifier for the plugin instance — used as the
    registry key, log prefix and the storage namespace."""

    role: PluginRole
    """Role of the plugin (see :class:`PluginRole`)."""

    provides: list[SensorType]
    """Sensor types the plugin produces. Empty for hubs and pure
    camera-controllers; required for sensor providers."""

    consumes: list[SensorType]
    """Sensor types the plugin reads from other plugins (e.g. a face plugin
    consumes camera video frames)."""

    interfaces: list[PluginInterface]
    """Capability flags the plugin implements (see :class:`PluginInterface`)."""

    capabilities: NotRequired[list[PluginCapability]]
    """Permissions the plugin requests to call host system features (see
    :class:`PluginCapability`). The host enforces these — calls without a
    matching capability are rejected."""

    pythonVersion: NotRequired[PythonVersion]
    """Required Python interpreter version for Python plugins. Ignored by
    Node / Go plugins."""

    dependencies: NotRequired[list[str]]
    """Extra package dependencies installed into the plugin's runtime (Go
    module paths for Go plugins; PyPI / npm names for Python and Node
    plugins)."""


class PluginInfo(TypedDict):
    """Lightweight handle identifying an installed plugin — used in RPC
    payloads and managers to refer to the plugin without shipping its full
    state."""

    id: str
    """Unique runtime ID assigned by the host (stable across restarts)."""

    name: str
    """Plugin package name (matches PluginContract.name)."""

    contract: PluginContract
    """Full contract the plugin was loaded with."""
