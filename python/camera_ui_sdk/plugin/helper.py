from __future__ import annotations

from typing import Any, cast

from ..sensor import (
    SensorType,
)
from .contract import PluginCapability, PluginContract, PluginInterface, PluginRole


def get_contract_validation_errors(contract: object) -> list[str]:
    """Check the structural validity of an unknown contract object —
    required fields present, enum values inside the accepted sets — and
    return one human-readable error per problem found. Returns an empty list
    when the contract is valid.

    Args:
        contract: Untrusted candidate contract (e.g. parsed manifest JSON).

    Returns:
        Error messages, empty if the contract is valid.

    Example:
        ```python
        errors = get_contract_validation_errors(my_contract)
        if errors:
            print(f"Invalid contract: {errors}")
        ```
    """
    errors: list[str] = []

    if not contract or not isinstance(contract, dict):
        errors.append(
            f"Contract must be an object. Got: {'null' if contract is None else type(contract).__name__}"
        )
        return errors

    c = cast(Any, contract)
    valid_roles = [r.value for r in PluginRole]
    valid_sensor_types = [s.value for s in SensorType]

    # Check role
    if "role" not in c:
        errors.append('Missing required field: "role"')
    elif not isinstance(c.get("role"), str):
        role_value = c.get("role")
        errors.append(f'Field "role" must be a string. Got: {type(role_value).__name__}')
    elif c["role"] not in valid_roles:
        errors.append(f'Invalid role "{c["role"]}". Valid roles: {", ".join(valid_roles)}')

    # Check name
    if "name" not in c:
        errors.append('Missing required field: "name"')
    elif not isinstance(c["name"], str):
        errors.append(f'Field "name" must be a string. Got: {type(c["name"]).__name__}')
    elif len(c["name"]) == 0:
        errors.append('Field "name" cannot be empty')

    # Check provides
    if "provides" not in c:
        errors.append('Missing required field: "provides"')
    elif not isinstance(c["provides"], list):
        errors.append(f'Field "provides" must be an array. Got: {type(c["provides"]).__name__}')
    else:
        for sensor_type in c["provides"]:
            if sensor_type not in valid_sensor_types:
                errors.append(
                    f'Invalid sensor type in "provides": "{sensor_type}". Valid types: {", ".join(valid_sensor_types)}'
                )

    # Check consumes
    if "consumes" not in c:
        errors.append('Missing required field: "consumes"')
    elif not isinstance(c["consumes"], list):
        errors.append(f'Field "consumes" must be an array. Got: {type(c["consumes"]).__name__}')
    else:
        for sensor_type in c["consumes"]:
            if sensor_type not in valid_sensor_types:
                errors.append(
                    f'Invalid sensor type in "consumes": "{sensor_type}". Valid types: {", ".join(valid_sensor_types)}'
                )

    # Check interfaces
    valid_interfaces = [i.value for i in PluginInterface]
    if "interfaces" not in c:
        errors.append('Missing required field: "interfaces"')
    elif not isinstance(c["interfaces"], list):
        errors.append(f'Field "interfaces" must be an array. Got: {type(c["interfaces"]).__name__}')
    else:
        for iface in c["interfaces"]:
            if iface not in valid_interfaces:
                errors.append(
                    f'Invalid interface in "interfaces": "{iface}". Valid interfaces: {", ".join(valid_interfaces)}'
                )

    # Check optional capabilities
    valid_capabilities = [cap.value for cap in PluginCapability]
    if "capabilities" in c:
        if not isinstance(c["capabilities"], list):
            errors.append(f'Field "capabilities" must be an array. Got: {type(c["capabilities"]).__name__}')
        else:
            for cap in c["capabilities"]:
                if cap not in valid_capabilities:
                    errors.append(
                        f'Invalid capability in "capabilities": "{cap}". Valid capabilities: {", ".join(valid_capabilities)}'
                    )

    # Check optional pythonVersion
    if "pythonVersion" in c and c["pythonVersion"] not in ["3.11", "3.12"]:
        errors.append(f'Invalid pythonVersion "{c["pythonVersion"]}". Valid versions: 3.11, 3.12')

    # Check optional dependencies
    if "dependencies" in c and not isinstance(c["dependencies"], list):
        errors.append(f'Field "dependencies" must be an array. Got: {type(c["dependencies"]).__name__}')

    return errors


def validate_contract_consistency(contract: PluginContract, plugin_name: str | None = None) -> None:
    """Enforce role-specific consistency rules on top of the structural check
    (e.g. SensorProvider plugins must declare at least one provided sensor;
    Hub plugins cannot expose sensors). Raises on the first violation.

    Args:
        contract: Already-structurally-valid contract.
        plugin_name: Optional plugin name; used to prefix error messages.

    Raises:
        ValueError: When the contract violates a role-specific rule.

    Example:
        ```python
        validate_contract_consistency(contract, "my-plugin")
        ```
    """
    prefix = f'Plugin "{plugin_name}": ' if plugin_name else ""
    role = contract["role"]
    provides = contract["provides"]

    if role == PluginRole.Hub and len(provides) > 0:
        raise ValueError(f"{prefix}Hub plugins cannot provide sensors.")
    if role == PluginRole.SensorProvider and len(provides) == 0:
        raise ValueError(f"{prefix}SensorProvider plugins must provide at least one sensor type.")
    if role == PluginRole.CameraAndSensorProvider and len(provides) == 0:
        raise ValueError(f"{prefix}CameraAndSensorProvider plugins must provide at least one sensor type.")


def is_hub(contract: PluginContract) -> bool:
    """Report whether the plugin's role is Hub (a cross-camera aggregator such as
    a smart-home bridge or recorder, which owns no cameras of its own).

    Args:
        contract: Plugin contract to inspect.

    Returns:
        True if the role is :attr:`PluginRole.Hub`.

    Example:
        ```python
        if is_hub(contract):
            skip_local_discovery()
        ```
    """
    return contract["role"] == PluginRole.Hub


def can_create_cameras(contract: PluginContract) -> bool:
    """Report whether the plugin can create cameras (role is CameraController
    or CameraAndSensorProvider). Used to gate camera-creating operations such
    as DiscoveryProvider adoption.

    Args:
        contract: Plugin contract to inspect.

    Returns:
        True if the plugin may create cameras.

    Example:
        ```python
        if can_create_cameras(contract):
            enable_adoption()
        ```
    """
    return contract["role"] in (PluginRole.CameraController, PluginRole.CameraAndSensorProvider)


def can_provide_sensors_to_any_cameras(contract: PluginContract) -> bool:
    """Report whether the plugin is allowed to add sensors to cameras owned
    by other plugins (true for SensorProvider and CameraAndSensorProvider).
    Hub and pure CameraController plugins only see their own cameras.

    Args:
        contract: Plugin contract to inspect.

    Returns:
        True if the plugin may attach sensors to any camera.

    Example:
        ```python
        if can_provide_sensors_to_any_cameras(contract):
            list_all_cameras()
        ```
    """
    return contract["role"] in (PluginRole.SensorProvider, PluginRole.CameraAndSensorProvider)


def has_interface(contract: PluginContract, iface: PluginInterface) -> bool:
    """Report whether the plugin implements the given capability.

    Args:
        contract: Plugin contract to inspect.
        iface: Interface to check (e.g. :attr:`PluginInterface.DiscoveryProvider`).

    Returns:
        True if ``iface`` is listed in the contract's ``interfaces``.

    Example:
        ```python
        if has_interface(contract, PluginInterface.DiscoveryProvider):
            start_scan()
        ```
    """
    return iface in contract["interfaces"]


def has_capability(contract: PluginContract, cap: PluginCapability) -> bool:
    """Report whether the plugin requested the given capability.

    Args:
        contract: Plugin contract to inspect.
        cap: Capability to check (e.g. :attr:`PluginCapability.PublishNotifications`).

    Returns:
        True if ``cap`` is listed in the contract's ``capabilities``.

    Example:
        ```python
        if has_capability(contract, PluginCapability.PublishNotifications):
            allow_publish()
        ```
    """
    return cap in contract.get("capabilities", [])
