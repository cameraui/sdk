from __future__ import annotations

from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from .camera_config_internal import CameraConfigPartial, CameraInputSettings
    from .camera_enums import CameraFrameWorkerDecoder, FrameType
    from .camera_wire import DetectionEventMessage
    from .event_emitter import AsyncEventEmitter
    from .manager_rpc import ConnectionStatus, DiscoveredCameraWithState
    from .property_check import check_property_write
    from .sensor_rpc import (
        CapabilityUpdateFn,
        PropertyChangedEvent,
        PropertyUpdateFn,
        SensorDeviceState,
        SensorJSON,
        SensorMembership,
        SensorSourcePatch,
        SourceUpdateFn,
        is_source_reachable,
    )
    from .shared_utils import is_equal
    from .streaming_internal import IceServer
    from .write_lane import WRITE_CALL_TIMEOUT_MS, WRITE_CONCURRENCY

__all__ = [
    "AsyncEventEmitter",
    "ConnectionStatus",
    "DiscoveredCameraWithState",
    "SensorJSON",
    "PropertyChangedEvent",
    "PropertyUpdateFn",
    "CapabilityUpdateFn",
    "SensorDeviceState",
    "SensorMembership",
    "SensorSourcePatch",
    "SourceUpdateFn",
    "DetectionEventMessage",
    "IceServer",
    "FrameType",
    "CameraFrameWorkerDecoder",
    "CameraInputSettings",
    "CameraConfigPartial",
    "is_equal",
    "check_property_write",
    "is_source_reachable",
    "WRITE_CONCURRENCY",
    "WRITE_CALL_TIMEOUT_MS",
]

# resolved lazily to avoid circular imports during SDK bootstrap
_LAZY: dict[str, tuple[str, str]] = {
    "AsyncEventEmitter": (".event_emitter", "AsyncEventEmitter"),
    "ConnectionStatus": (".manager_rpc", "ConnectionStatus"),
    "DiscoveredCameraWithState": (".manager_rpc", "DiscoveredCameraWithState"),
    "SensorJSON": (".sensor_rpc", "SensorJSON"),
    "PropertyChangedEvent": (".sensor_rpc", "PropertyChangedEvent"),
    "PropertyUpdateFn": (".sensor_rpc", "PropertyUpdateFn"),
    "CapabilityUpdateFn": (".sensor_rpc", "CapabilityUpdateFn"),
    "SensorDeviceState": (".sensor_rpc", "SensorDeviceState"),
    "SensorMembership": (".sensor_rpc", "SensorMembership"),
    "SensorSourcePatch": (".sensor_rpc", "SensorSourcePatch"),
    "SourceUpdateFn": (".sensor_rpc", "SourceUpdateFn"),
    "is_source_reachable": (".sensor_rpc", "is_source_reachable"),
    "DetectionEventMessage": (".camera_wire", "DetectionEventMessage"),
    "IceServer": (".streaming_internal", "IceServer"),
    "FrameType": (".camera_enums", "FrameType"),
    "CameraFrameWorkerDecoder": (".camera_enums", "CameraFrameWorkerDecoder"),
    "CameraInputSettings": (".camera_config_internal", "CameraInputSettings"),
    "CameraConfigPartial": (".camera_config_internal", "CameraConfigPartial"),
    "is_equal": (".shared_utils", "is_equal"),
    "check_property_write": (".property_check", "check_property_write"),
    "WRITE_CONCURRENCY": (".write_lane", "WRITE_CONCURRENCY"),
    "WRITE_CALL_TIMEOUT_MS": (".write_lane", "WRITE_CALL_TIMEOUT_MS"),
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
