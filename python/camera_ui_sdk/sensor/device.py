from __future__ import annotations

from typing import NotRequired, TypedDict


class DeviceInfo(TypedDict):
    """The physical device a sensor belongs to, as the plugin reports it.

    Sensors of one plugin that report the same ``id`` form one device: one row
    on the sensors page, one HomeKit accessory, one Home Assistant device. A
    sensor without a device is its own device, and a sensor added with
    ``camera.addSensor()`` belongs to its camera.
    """

    id: str
    """The source's stable id for the device, never an address: a vendor device id, a Home Assistant device id, a serial number."""
    name: str
    """Name of the device at the source."""
    manufacturer: NotRequired[str]
    """Manufacturer label."""
    model: NotRequired[str]
    """Model label."""
    firmware: NotRequired[str]
    """Firmware version."""
    serialNumber: NotRequired[str]
    """Serial number."""


class SensorDevice(TypedDict):
    """The device a sensor belongs to, as consumers see it."""

    id: str
    """Id of the device in camera.ui, not the plugin's ``DeviceInfo.id``."""
    name: str
    """Name shown to the user, the source's name until the user renames the device."""
    manufacturer: NotRequired[str]
    """Manufacturer label."""
    model: NotRequired[str]
    """Model label."""
    firmware: NotRequired[str]
    """Firmware version."""
    serialNumber: NotRequired[str]
    """Serial number."""
