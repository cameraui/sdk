"""Internal SDK symbols.

This subpackage exposes symbols used by the camera.ui server runtime and
SDK internals but NOT part of the public plugin API. Plugin authors should
not import from ``camera_ui_sdk.internal``; the contents may change without
deprecation.

Symbols are re-exported lazily via ``__getattr__`` to avoid circular imports
during SDK bootstrap. Consumers can still ``from camera_ui_sdk.internal import X``.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from .camera_config_internal import CameraConfigPartial, CameraInputSettings
    from .camera_enums import CameraFrameWorkerDecoder, FrameType
    from .camera_wire import DetectionEventMessage
    from .event_emitter import AsyncEventEmitter
    from .manager_rpc import ConnectionStatus, DiscoveredCameraWithState
    from .sensor_rpc import (
        CapabilityUpdateFn,
        PropertyChangedEvent,
        PropertyChangeListener,
        PropertyUpdateFn,
        SensorJSON,
    )
    from .sensor_triggers import SENSOR_TRIGGER_TYPES
    from .shared_utils import is_equal
    from .streaming_internal import IceServer

__all__ = [
    # AsyncEventEmitter
    "AsyncEventEmitter",
    # Manager
    "ConnectionStatus",
    "DiscoveredCameraWithState",
    # Sensor wire-format / RPC
    "SensorJSON",
    "PropertyChangedEvent",
    "PropertyChangeListener",
    "PropertyUpdateFn",
    "CapabilityUpdateFn",
    # Camera wire-format
    "DetectionEventMessage",
    # Sensor triggers
    "SENSOR_TRIGGER_TYPES",
    # Streaming
    "IceServer",
    # Camera enums
    "FrameType",
    "CameraFrameWorkerDecoder",
    # Camera config
    "CameraInputSettings",
    "CameraConfigPartial",
    # Utils
    "is_equal",
]

# Map of public name -> (submodule, attribute_name) for lazy loading.
_LAZY: dict[str, tuple[str, str]] = {
    "AsyncEventEmitter": (".event_emitter", "AsyncEventEmitter"),
    "ConnectionStatus": (".manager_rpc", "ConnectionStatus"),
    "DiscoveredCameraWithState": (".manager_rpc", "DiscoveredCameraWithState"),
    "SensorJSON": (".sensor_rpc", "SensorJSON"),
    "PropertyChangedEvent": (".sensor_rpc", "PropertyChangedEvent"),
    "PropertyChangeListener": (".sensor_rpc", "PropertyChangeListener"),
    "PropertyUpdateFn": (".sensor_rpc", "PropertyUpdateFn"),
    "CapabilityUpdateFn": (".sensor_rpc", "CapabilityUpdateFn"),
    "DetectionEventMessage": (".camera_wire", "DetectionEventMessage"),
    "SENSOR_TRIGGER_TYPES": (".sensor_triggers", "SENSOR_TRIGGER_TYPES"),
    "IceServer": (".streaming_internal", "IceServer"),
    "FrameType": (".camera_enums", "FrameType"),
    "CameraFrameWorkerDecoder": (".camera_enums", "CameraFrameWorkerDecoder"),
    "CameraInputSettings": (".camera_config_internal", "CameraInputSettings"),
    "CameraConfigPartial": (".camera_config_internal", "CameraConfigPartial"),
    "is_equal": (".shared_utils", "is_equal"),
}


def __getattr__(name: str) -> Any:
    target = _LAZY.get(name)
    if target is None:
        raise AttributeError(f"module 'camera_ui_sdk.internal' has no attribute {name!r}")
    submodule_path, attr_name = target
    from importlib import import_module

    module = import_module(submodule_path, __name__)
    value = getattr(module, attr_name)
    globals()[name] = value
    return value
