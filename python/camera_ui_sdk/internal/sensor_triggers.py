from __future__ import annotations

SENSOR_TRIGGER_TYPES: tuple[str, ...] = ("contact", "doorbell", "switch", "light", "siren", "security_system")
"""Sensor trigger types — the subset of trigger types that originate from configurable sensors (excludes motion/audio)."""
