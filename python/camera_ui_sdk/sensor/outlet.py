from __future__ import annotations

from collections.abc import Mapping
from enum import StrEnum
from typing import Any, Generic, Literal, Protocol, overload, runtime_checkable

from typing_extensions import TypedDict, TypeVar

from ..observable import Observable
from .base import Sensor, SensorCategory, SensorLike, SensorType
from .device import DeviceInfo
from .property_spec import PropertySpecOverride


class OutletCapability(StrEnum):
    """Optional capabilities of an outlet."""

    InUse = "inUse"
    """Outlet reports whether the device plugged into it draws power."""


class OutletProperty(StrEnum):
    """Property names of an outlet."""

    On = "on"
    """Whether the outlet is on."""
    InUse = "inUse"
    """Whether the device plugged into the outlet draws power."""


class OutletControlProperties(TypedDict):
    """Property values of an outlet."""

    on: bool
    inUse: bool


class OutletPropertyChangeData(TypedDict):
    """Property change payload emitted on OutletControlLike.onPropertyChanged."""

    property: str
    """Name of the changed property, an OutletProperty value."""
    value: bool
    """New value of the property."""


TStorage = TypeVar("TStorage", bound=Mapping[str, Any], default=dict[str, Any])


@runtime_checkable
class OutletControlLike(SensorLike, Protocol):
    """Read-only proxy interface for an outlet."""

    @property
    def type(self) -> SensorType:
        return SensorType.Outlet

    @property
    def onPropertyChanged(self) -> Observable[OutletPropertyChangeData]: ...

    @property
    def onCapabilitiesChanged(self) -> Observable[list[OutletCapability]]: ...

    @overload
    def getValue(self, property: Literal[OutletProperty.On]) -> bool | None: ...
    @overload
    def getValue(self, property: Literal[OutletProperty.InUse]) -> bool | None: ...
    @overload
    def getValue(self, property: str) -> object | None: ...


class OutletControl(Sensor[OutletControlProperties, TStorage, OutletCapability], Generic[TStorage]):
    """A power outlet or smart plug. Override ``setOn()`` / ``setOff()`` to
    drive hardware and call ``await super().setOn()`` / ``await super().setOff()``
    after success to sync the SDK state. For hardware-pushed updates, call the
    super methods from your event handler.

    An outlet that measures its load adds ``OutletCapability.InUse`` and
    reports it with ``setInUse()``.
    """

    _requires_frames = False

    def __init__(
        self,
        name: str = "Outlet",
        *,
        native_id: str | None = None,
        origin: str | None = None,
        address: str | None = None,
        device: DeviceInfo | None = None,
        primary: bool = False,
        property_specs: Mapping[str, PropertySpecOverride] | None = None,
    ) -> None:
        super().__init__(
            name,
            native_id=native_id,
            origin=origin,
            address=address,
            device=device,
            primary=primary,
            property_specs=property_specs,
        )
        self._write_state({OutletProperty.On.value: False, OutletProperty.InUse.value: False})

    @property
    def type(self) -> SensorType:
        return SensorType.Outlet

    @property
    def category(self) -> SensorCategory:
        return SensorCategory.Control

    @property
    def on(self) -> bool:
        """Whether the outlet is on."""
        return bool(self.props.on)

    @property
    def inUse(self) -> bool:
        """Whether the device plugged into the outlet draws power."""
        return bool(self.props.inUse)

    async def setOn(self) -> None:
        """Turn the outlet on. Override to drive hardware and call
        ``await super().setOn()`` after success to sync the SDK state.

        Example:
            ```python
            await outlet.setOn()
            ```
        """
        self._write_state({OutletProperty.On.value: True})

    async def setOff(self) -> None:
        """Turn the outlet off. Override to drive hardware and call
        ``await super().setOff()`` after success to sync the SDK state.

        Example:
            ```python
            await outlet.setOff()
            ```
        """
        self._write_state({OutletProperty.On.value: False})

    def setInUse(self, in_use: bool) -> None:
        """Report whether the device plugged into the outlet draws power.

        Args:
            in_use: ``True`` while it draws power.

        Example:
            ```python
            outlet.setInUse(watts > 1)
            ```
        """
        self._write_state({OutletProperty.InUse.value: in_use})

    async def updateValue(self, property: str, value: Any) -> None:
        """Routes generic property writes to the semantic setters."""
        if property == OutletProperty.On.value:
            if value:
                await self.setOn()
            else:
                await self.setOff()
