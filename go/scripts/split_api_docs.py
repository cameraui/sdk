#!/usr/bin/env python3

from __future__ import annotations

import re
import sys
from pathlib import Path

BUCKETS: dict[str, str] = {
    "Plugin": "plugin",
    "BasePlugin": "plugin",
    "NoCameras": "plugin",
    "PluginAPI": "plugin",
    "PluginContract": "plugin",
    "PluginInfo": "plugin",
    "PythonVersion": "plugin",
    "PluginRole": "plugin",
    "PluginInterface": "plugin",
    "PluginStatus": "plugin",
    "PluginStorage": "plugin",
    "PluginAssignments": "plugin",
    "AssignedPlugin": "plugin",
    "APIEvent": "plugin",
    "StorageSchemaProvider": "plugin",
    "Run": "plugin",
    "GetContractValidationErrors": "plugin",
    "ValidateContractConsistency": "plugin",
    "IsHub": "plugin",
    "IsService": "plugin",
    "CanCreateCameras": "plugin",
    "CanProvideSensorsToAnyCameras": "plugin",
    "HasInterface": "plugin",
    "DiscoveryProvider": "plugin",
    "DiscoveredCamera": "plugin",
    "SensorDiscoveryProvider": "plugin",
    "DiscoveredSensor": "plugin",
    "AdoptedSensor": "plugin",
    "NotifierInterface": "plugin",
    "NotifierDevice": "plugin",
    "Notification": "plugin",
    "Severity": "plugin",
    "PluginCapability": "plugin",
    "HasCapability": "plugin",
    "MotionDetectionInterface": "plugin",
    "MotionDetectionResponse": "plugin",
    "MotionDetectionSettings": "plugin",
    "ObjectDetectionInterface": "plugin",
    "ObjectDetectionResponse": "plugin",
    "ObjectDetectionSettings": "plugin",
    "AudioDetectionInterface": "plugin",
    "AudioDetectionResponse": "plugin",
    "AudioDetectionSettings": "plugin",
    "FaceDetectionInterface": "plugin",
    "FaceDetectionResponse": "plugin",
    "FaceEmbeddingInterface": "plugin",
    "FaceEmbeddingPluginResponse": "plugin",
    "LicensePlateDetectionInterface": "plugin",
    "LicensePlateDetectionResponse": "plugin",
    "ClassifierDetectionInterface": "plugin",
    "ClassifierDetectionResponse": "plugin",
    "ClipDetectionInterface": "plugin",
    "ClipDetectionPluginResponse": "plugin",
    "ClipTextEmbeddingResult": "plugin",
    "PersonEmbeddingInterface": "plugin",
    "PersonEmbeddingPluginResponse": "plugin",
    "SegmentationImage": "plugin",
    "SegmentationInterface": "plugin",
    "SegmentationPluginResponse": "plugin",
    "OAuthCapable": "plugin",
    "OAuthDeviceFlowCapable": "plugin",
    "OAuthAuthCodeFlowCapable": "plugin",
    "OAuthClientCredentialsCapable": "plugin",
    "OAuthState": "plugin",
    "OAuthStatus": "plugin",
    "OAuthMetadata": "plugin",
    "OAuthProviderConfig": "plugin",
    "OAuthProviderDeclaration": "plugin",
    "ImageMetadata": "plugin",
    "AudioMetadata": "plugin",
    "AssistantToolProvider": "plugin",
    "AssistantToolSpec": "plugin",
    "AssistantToolSchema": "plugin",
    "AssistantToolProperty": "plugin",
    "AssistantToolContext": "plugin",
    "AssistantToolImage": "plugin",
    "AssistantToolReference": "plugin",
    "AssistantToolResult": "plugin",
    "AssistantModelProvider": "plugin",
    "AssistantModelStatusReporter": "plugin",
    "AssistantModelSpec": "plugin",
    "AssistantModelStatus": "plugin",
    "AssistantModelRequest": "plugin",
    "AssistantModelContext": "plugin",
    "AssistantModelMessage": "plugin",
    "AssistantModelContent": "plugin",
    "AssistantModelTool": "plugin",
    "AssistantModelToolCall": "plugin",
    "AssistantModelChunk": "plugin",
    "Camera": "camera",
    "BaseCamera": "camera",
    "CameraConfig": "camera",
    "BaseCameraConfig": "camera",
    "CameraConfigInputSettings": "camera",
    "CameraDevice": "camera",
    "CameraDeviceSource": "camera",
    "CameraInput": "camera",
    "CameraInformation": "camera",
    "CameraPluginInfo": "camera",
    "CameraType": "camera",
    "CameraPower": "camera",
    "CameraRole": "camera",
    "CameraActivityMode": "camera",
    "CameraAspectRatio": "camera",
    "CameraDetectionSettings": "camera",
    "FaceDetectionSettings": "camera",
    "FaceMatchSensitivity": "camera",
    "LicensePlateDetectionSettings": "camera",
    "CameraZones": "camera",
    "MotionZone": "camera",
    "ObjectZone": "camera",
    "AlertZone": "camera",
    "AlertZoneMatch": "camera",
    "PrivacyZone": "camera",
    "PrivacyFallback": "camera",
    "ZoneLabel": "camera",
    "TimeWindow": "camera",
    "CameraExportSettings": "camera",
    "CameraNotificationSettings": "camera",
    "NotificationSpeed": "camera",
    "CameraRecordingSettings": "camera",
    "RecordingMode": "camera",
    "RecordingSource": "camera",
    "CameraFrameWorkerSettings": "camera",
    "FrameWorkerDecoderHardware": "camera",
    "FrameWorkerDecoderSettings": "camera",
    "CameraUiSettings": "camera",
    "DetectionLine": "camera",
    "LineDirection": "camera",
    "ZoneType": "camera",
    "Point": "camera",
    "MotionResolution": "camera",
    "PtzAutotrackSettings": "camera",
    "SnapshotRefreshMode": "camera",
    "SnapshotSettings": "camera",
    "SnapshotInterface": "camera",
    "StreamingInterface": "camera",
    "TalkbackInterface": "camera",
    "StreamingRole": "camera",
    "VideoStreamingMode": "camera",
    "PlaybackSource": "camera",
    "StreamUrls": "camera",
    "FMTPInfo": "camera",
    "AudioCodecProperties": "camera",
    "VideoCodecProperties": "camera",
    "ProbeConfig": "camera",
    "StreamDirection": "camera",
    "Go2RtcWSSource": "camera",
    "Go2RtcRTSPSource": "camera",
    "Go2RtcSnapshotSource": "camera",
    "RTSPAudioCodec": "camera",
    "ProbeAudioCodec": "camera",
    "AudioCodec": "camera",
    "AudioFFmpegCodec": "camera",
    "VideoCodec": "camera",
    "VideoFFmpegCodec": "camera",
    "RTSPUrlOptions": "camera",
    "SnapshotUrlOptions": "camera",
    "BuildTargetUrl": "camera",
    "BuildSnapshotUrl": "camera",
    "ProbeStream": "camera",
    "VideoStreamInfo": "camera",
    "AudioStreamInfo": "camera",
    "VideoFrameData": "camera",
    "FrameFormat": "camera",
    "DetectionEvent": "camera",
    "DetectionEventData": "camera",
    "DetectionEventType": "camera",
    "DetectionEventState": "camera",
    "DetectionPath": "camera",
    "PropertyChangeEvent": "camera",
    "PTZCapability": "camera",
    "PTZDirection": "camera",
    "PTZPosition": "camera",
    "PTZRelativeMove": "camera",
    "Sensor": "sensor",
    "BaseSensor": "sensor",
    "BinarySensor": "sensor",
    "MeasurementInfo": "sensor",
    "SensorSourceState": "sensor",
    "SensorPropertyChange": "sensor",
    "SensorOption": "sensor",
    "SensorType": "sensor",
    "SensorCategory": "sensor",
    "BoundingBox": "sensor",
    "Detection": "sensor",
    "DetectionLabel": "sensor",
    "DetectionAttribute": "sensor",
    "TrackedDetection": "sensor",
    "TrackVelocity": "sensor",
    "ModelSpec": "sensor",
    "ObjectModelSpec": "sensor",
    "AudioModelSpec": "sensor",
    "AudioInputSpec": "sensor",
    "VideoInputSpec": "sensor",
    "LoadedModel": "sensor",
    "ModelRuntime": "sensor",
    "UpdateModelSpec": "sensor",
    "AudioFormat": "sensor",
    "AudioFrameData": "sensor",
    "AudioLabel": "sensor",
    "AudioResult": "sensor",
    "AudioDetector": "sensor",
    "AudioSensor": "sensor",
    "AudioDetectorSensor": "sensor",
    "MotionDetector": "sensor",
    "MotionResult": "sensor",
    "MotionSensor": "sensor",
    "MotionDetectorSensor": "sensor",
    "ObjectDetector": "sensor",
    "ObjectResult": "sensor",
    "ObjectSensor": "sensor",
    "ObjectDetectorSensor": "sensor",
    "FaceDetection": "sensor",
    "FaceResult": "sensor",
    "FaceDetector": "sensor",
    "FaceSensor": "sensor",
    "FaceDetectorSensor": "sensor",
    "FaceEmbedder": "sensor",
    "FaceEmbedderSensor": "sensor",
    "FaceEmbeddingResult": "sensor",
    "LicensePlateDetection": "sensor",
    "LicensePlateResult": "sensor",
    "LicensePlateDetector": "sensor",
    "LicensePlateSensor": "sensor",
    "LicensePlateDetectorSensor": "sensor",
    "ClassifierDetection": "sensor",
    "ClassifierResult": "sensor",
    "ClassifierDetector": "sensor",
    "ClassifierSensor": "sensor",
    "ClassifierDetectorSensor": "sensor",
    "ClipEmbedding": "sensor",
    "ClipResult": "sensor",
    "ClipDetector": "sensor",
    "ClipDetectorSensor": "sensor",
    "PersonEmbeddingResult": "sensor",
    "PersonEmbedder": "sensor",
    "PersonEmbedderSensor": "sensor",
    "ObjectMask": "sensor",
    "SegmentationFrame": "sensor",
    "SegmentationResult": "sensor",
    "Segmenter": "sensor",
    "SegmenterSensor": "sensor",
    "BatteryInfo": "sensor",
    "ChargingState": "sensor",
    "AudioProperty": "sensor",
    "BatteryProperty": "sensor",
    "CarbonDioxideProperty": "sensor",
    "CarbonMonoxideProperty": "sensor",
    "ClassifierProperty": "sensor",
    "ColdProperty": "sensor",
    "ContactProperty": "sensor",
    "DoorbellProperty": "sensor",
    "FaceProperty": "sensor",
    "GarageProperty": "sensor",
    "GasProperty": "sensor",
    "HeatProperty": "sensor",
    "HumidityProperty": "sensor",
    "IlluminanceProperty": "sensor",
    "LeakProperty": "sensor",
    "LicensePlateProperty": "sensor",
    "LightProperty": "sensor",
    "LockProperty": "sensor",
    "MotionProperty": "sensor",
    "ObjectProperty": "sensor",
    "OccupancyProperty": "sensor",
    "PTZProperty": "sensor",
    "PowerProperty": "sensor",
    "ProblemProperty": "sensor",
    "SecuritySystemProperty": "sensor",
    "SirenProperty": "sensor",
    "SmokeProperty": "sensor",
    "SwitchProperty": "sensor",
    "TamperProperty": "sensor",
    "TemperatureProperty": "sensor",
    "VibrationProperty": "sensor",
    "ContactSensor": "sensor",
    "DoorbellTrigger": "sensor",
    "GarageControl": "sensor",
    "GarageState": "sensor",
    "HumidityInfo": "sensor",
    "LeakSensor": "sensor",
    "LightControl": "sensor",
    "LockControl": "sensor",
    "LockState": "sensor",
    "OccupancySensor": "sensor",
    "PTZControl": "sensor",
    "SecuritySystem": "sensor",
    "SecuritySystemState": "sensor",
    "SirenControl": "sensor",
    "SmokeSensor": "sensor",
    "SwitchControl": "sensor",
    "TemperatureInfo": "sensor",
    "CarbonDioxideInfo": "sensor",
    "IlluminanceInfo": "sensor",
    "CarbonMonoxideSensor": "sensor",
    "ColdSensor": "sensor",
    "GasSensor": "sensor",
    "HeatSensor": "sensor",
    "PowerSensor": "sensor",
    "ProblemSensor": "sensor",
    "TamperSensor": "sensor",
    "VibrationSensor": "sensor",
    "SensorTriggerSettings": "sensor",
    "DeviceStorage": "storage",
    "JsonSchema": "storage",
    "JsonSchemaType": "storage",
    "StringFormat": "storage",
    "SchemaCondition": "storage",
    "SchemaConditionOperator": "storage",
    "ButtonColor": "storage",
    "FormSubmitResponse": "storage",
    "ToastMessage": "storage",
    "ToastType": "storage",
    "StorageController": "storage",
    "CoreManager": "manager",
    "CoreManagerEvent": "manager",
    "AssistantAccess": "manager",
    "AssistantAskRequest": "manager",
    "AssistantAskImage": "manager",
    "AssistantAskResult": "manager",
    "AssistantAskUsage": "manager",
    "PluginCallOptions": "manager",
    "SensorHistoryEntry": "manager",
    "SensorManager": "manager",
    "SensorConsumer": "manager",
    "DeviceManager": "manager",
    "DownloadManager": "manager",
    "DownloadToken": "manager",
    "DownloadCleanup": "manager",
    "CreateDownloadOptions": "manager",
    "NotificationManager": "manager",
    "CreateStreamDownloadOptions": "manager",
    "CreatePipeDownloadOptions": "manager",
    "PipeDownloadSource": "manager",
    "Observable": "observable",
    "Subject": "observable",
    "BehaviorSubject": "observable",
    "ReplaySubject": "observable",
    "Disposable": "observable",
    "Subscribable": "observable",
    "FirstValueFrom": "observable",
    "Logger": "types",
    "Bool": "types",
    "Int": "types",
    "Float64": "types",
}

DROP: set[str] = {
    "EventAttribute",
    "EventDetection",
    "EventSegment",
    "EventTrigger",
    "EventTriggerType",
}

PAGE_TITLES: dict[str, str] = {
    "plugin": "Plugin API",
    "camera": "Camera",
    "sensor": "Sensors",
    "storage": "Storage & Schema",
    "manager": "Manager",
    "observable": "Observable",
    "types": "Types",
}

PAGE_INTROS: dict[str, str] = {
    "plugin": (
        "Core plugin lifecycle and capability surface: the `Plugin` interface every "
        "plugin implements, the `BasePlugin` boilerplate-saver, the `PluginContract` "
        "manifest, lifecycle event names (`APIEvent*`), and every optional interface: "
        "`DiscoveryProvider`, `NotifierInterface`, the detection interfaces and the "
        "assistant model provider."
    ),
    "camera": (
        "Camera entities and runtime device API: `CameraDevice` (the per-camera handle "
        "your plugin receives in `ConfigureCameras`), camera sources, snapshots, "
        "streaming URL helpers, video frame data, detection events, and the property-"
        "change observables."
    ),
    "sensor": (
        "Detection sensors (motion, object, face, license-plate, audio, classifier, "
        "clip) and smart-home sensors (contact, doorbell, lock, garage, light, switch, "
        "PTZ, security system, environmental). Plus the sensor-level model specs and "
        "shared detection types (`Detection`, `BoundingBox`, `TrackedDetection`)."
    ),
    "storage": (
        "Schema-driven configuration store rendered as UI forms by the host. "
        "`DeviceStorage` exposes the schema definition / read / write API; `JsonSchema` "
        "and friends describe individual fields, conditional visibility, and submit-"
        "form responses."
    ),
    "manager": (
        "System-level services injected onto `PluginAPI`: `CoreManager` for the FFmpeg "
        "path, instance details, inter-plugin calls and assistant requests, "
        "`DeviceManager` for camera lookup "
        "and async discovery, `DownloadManager` for token-protected downloads, and "
        "`NotificationManager` for publishing notifications into the host."
    ),
    "observable": (
        "Lightweight reactive primitives: `Observable`, `Subject`, `BehaviorSubject`, "
        "`ReplaySubject`, the `Disposable` subscription handle, and a small set of "
        "composable operators (`Map`, `Filter`, `DistinctUntilChanged`, `Pairwise`, …)."
    ),
    "types": (
        "Shared utility types: the `Logger` interface every plugin and camera exposes, "
        "and pointer-helper functions (`Bool`, `Int`, `Float64`) used by JSON schemas "
        "with optional numeric / boolean fields."
    ),
}


ANCHOR_RE = re.compile(r'^<a name="[^"]+"></a>$')


def parse_index(text: str) -> int:
    lines = text.splitlines()
    for i, line in enumerate(lines):
        if line.startswith(("## Constants", "## func ", "## type ")):
            return i - 1 if i > 0 and ANCHOR_RE.match(lines[i - 1]) else i
    return 0


def split_into_blocks(text: str) -> list[tuple[str, str]]:
    body_start = parse_index(text)
    body_lines = text.splitlines()[body_start:]

    blocks: list[tuple[str, str]] = []
    current_key: str | None = None
    current_buf: list[str] = []

    heading_re = re.compile(
        r"^## (Constants|Variables|func ([A-Za-z0-9_]+)|type ([A-Za-z0-9_]+))"
    )

    anchor: str | None = None

    for line in body_lines:
        if ANCHOR_RE.match(line):
            if anchor is not None:
                current_buf.append(anchor)
            anchor = line
            continue
        m = heading_re.match(line)
        if m:
            if current_key is not None:
                blocks.append((current_key, "\n".join(current_buf).rstrip() + "\n"))
            kind = m.group(1)
            if kind == "Constants" or kind == "Variables":
                current_key = kind
            elif kind.startswith("func "):
                current_key = f"func:{m.group(2)}"
            else:
                current_key = f"type:{m.group(3)}"
            current_buf = [anchor, line] if anchor is not None else [line]
        elif current_key is not None:
            if anchor is not None:
                current_buf.append(anchor)
            current_buf.append(line)
        anchor = None
    if anchor is not None:
        current_buf.append(anchor)
    if current_key is not None:
        blocks.append((current_key, "\n".join(current_buf).rstrip() + "\n"))

    return blocks


def check_buckets(blocks: list[tuple[str, str]]) -> list[str]:
    names = {key.split(":", 1)[1] for key, _ in blocks if ":" in key}
    problems = [
        f"no page for {name}, add it to BUCKETS or DROP"
        for name in sorted(names - BUCKETS.keys() - DROP)
    ]
    problems += [
        f"{name} is not a top-level entry of the docs, remove it"
        for name in sorted((BUCKETS.keys() | DROP) - names)
    ]
    return problems


def bucket_for(key: str) -> str | None:
    if key in ("Constants", "Variables"):
        return "types"
    if not key.startswith(("func:", "type:")):
        return None
    name = key.split(":", 1)[1]
    if name in DROP:
        return None
    return BUCKETS.get(name)


def render_page(bucket: str, blocks: list[tuple[str, str]]) -> str:
    title = PAGE_TITLES[bucket]
    intro = PAGE_INTROS[bucket]
    parts: list[str] = [
        f"# {title}",
        "",
        intro,
        "",
        "!!! note",
        (
            "    The reference below is auto-generated from Go doc comments via "
            "[`gomarkdoc`](https://github.com/princjef/gomarkdoc). Re-run "
            "`scripts/gen-api-docs.sh` to refresh it."
        ),
        "",
    ]
    for _, body in blocks:
        parts.append(body.rstrip())
        parts.append("")
    return "\n".join(parts).rstrip() + "\n"


def main() -> None:
    if len(sys.argv) != 3:
        print("usage: split_api_docs.py <full_md> <out_dir>", file=sys.stderr)
        sys.exit(2)

    full_md_path = Path(sys.argv[1])
    out_dir = Path(sys.argv[2])
    out_dir.mkdir(parents=True, exist_ok=True)

    text = full_md_path.read_text(encoding="utf-8")
    blocks = split_into_blocks(text)

    problems = check_buckets(blocks)
    if problems:
        print("\n".join(problems), file=sys.stderr)
        sys.exit(1)

    by_bucket: dict[str, list[tuple[str, str]]] = {b: [] for b in PAGE_TITLES}
    for key, body in blocks:
        bucket = bucket_for(key)
        if bucket is None:
            continue
        by_bucket[bucket].append((key, body))

    for bucket, blist in by_bucket.items():
        out_file = out_dir / f"{bucket}.md"
        out_file.write_text(render_page(bucket, blist), encoding="utf-8")
        print(
            f"  wrote {out_file.relative_to(out_dir.parent.parent)}  ({len(blist)} blocks)"
        )


if __name__ == "__main__":
    main()
