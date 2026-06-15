# API Reference

Module-by-module reference, auto-generated from the docstrings in `camera_ui_sdk`.

| Module | What's in it |
| --- | --- |
| [Plugin API](plugin.md) | `BasePlugin`, the manifest contract, optional interfaces (discovery, notifier, detection). |
| [Camera](camera.md) | Camera config, frames, streaming sessions, detection events, runtime device API. |
| [Sensors](sensor.md) | Detection sensors (motion, object, face, license-plate, audio, classifier, clip) and smart-home sensors (contact, doorbell, lock, garage, light, switch, ptz, security system, environmental). |
| [Storage & Schema](storage.md) | Schema-driven per-device config rendered as UI forms by the host. |
| [Manager](manager.md) | `CoreManager` / `DeviceManager` / `DownloadManager` for system-level services. |
| [Observable](observable.md) | Reactive primitives — `Observable`, `Subject`, `BehaviorSubject`, `ReplaySubject` — and operators. |
| [Types](types.md) | Shared types (`LoggerService`, `PluginAPI`, …). |

If you're new to the SDK, start with the [Plugin Guide](../plugin-guide.md) instead — it walks through these modules in the order you'll actually use them.
