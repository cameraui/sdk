import { PluginCapability, PluginInterface, PluginRole } from './contract.js';

import type { PluginContract } from './contract.js';

/**
 * Check the structural validity of an unknown contract object — required
 * fields present, enum values inside the accepted sets — and return one
 * human-readable error per problem found. Returns an empty array when the
 * contract is valid.
 *
 * @param contract - Untrusted candidate contract (e.g. from manifest JSON).
 *
 * @returns Error messages, empty if the contract is valid.
 *
 * @example
 * ```ts
 * import { getContractValidationErrors } from '@camera.ui/sdk';
 *
 * const errors = getContractValidationErrors(rawManifest);
 * if (errors.length) throw new Error(errors.join('\n'));
 * ```
 */
export function getContractValidationErrors(contract: unknown): string[] {
  const errors: string[] = [];

  if (!contract || typeof contract !== 'object') {
    errors.push('Contract must be an object. Got: ' + (contract === null ? 'null' : typeof contract));
    return errors;
  }

  const c = contract as Record<string, unknown>;
  const validRoles = Object.values(PluginRole);
  // Import SensorType values dynamically to avoid circular dependency
  const validSensorTypes = [
    'motion',
    'object',
    'audio',
    'face',
    'licensePlate',
    'classifier',
    'contact',
    'temperature',
    'humidity',
    'occupancy',
    'smoke',
    'leak',
    'light',
    'siren',
    'switch',
    'lock',
    'garage',
    'ptz',
    'securitySystem',
    'doorbell',
    'battery',
    'clip',
  ];

  // Check role
  if (c.role === undefined) {
    errors.push('Missing required field: "role"');
  } else if (typeof c.role !== 'string') {
    errors.push(`Field "role" must be a string. Got: ${typeof c.role}`);
  } else if (!validRoles.includes(c.role as PluginRole)) {
    errors.push(`Invalid role "${c.role}". Valid roles: ${validRoles.join(', ')}`);
  }

  // Check name
  if (c.name === undefined) {
    errors.push('Missing required field: "name"');
  } else if (typeof c.name !== 'string') {
    errors.push(`Field "name" must be a string. Got: ${typeof c.name}`);
  } else if (c.name.length === 0) {
    errors.push('Field "name" cannot be empty');
  }

  // Check provides
  if (c.provides === undefined) {
    errors.push('Missing required field: "provides"');
  } else if (!Array.isArray(c.provides)) {
    errors.push(`Field "provides" must be an array. Got: ${typeof c.provides}`);
  } else {
    for (const type of c.provides as string[]) {
      if (!validSensorTypes.includes(type)) {
        errors.push(`Invalid sensor type in "provides": "${type}". Valid types: ${validSensorTypes.join(', ')}`);
      }
    }
  }

  // Check consumes
  if (c.consumes === undefined) {
    errors.push('Missing required field: "consumes"');
  } else if (!Array.isArray(c.consumes)) {
    errors.push(`Field "consumes" must be an array. Got: ${typeof c.consumes}`);
  } else {
    for (const type of c.consumes as string[]) {
      if (!validSensorTypes.includes(type)) {
        errors.push(`Invalid sensor type in "consumes": "${type}". Valid types: ${validSensorTypes.join(', ')}`);
      }
    }
  }

  // Check interfaces
  const validInterfaces = Object.values(PluginInterface);
  if (c.interfaces === undefined) {
    errors.push('Missing required field: "interfaces"');
  } else if (!Array.isArray(c.interfaces)) {
    errors.push(`Field "interfaces" must be an array. Got: ${typeof c.interfaces}`);
  } else {
    for (const iface of c.interfaces as string[]) {
      if (!validInterfaces.includes(iface as PluginInterface)) {
        errors.push(`Invalid interface in "interfaces": "${iface}". Valid interfaces: ${validInterfaces.join(', ')}`);
      }
    }
  }

  // Check optional capabilities
  const validCapabilities = Object.values(PluginCapability);
  if (c.capabilities !== undefined) {
    if (!Array.isArray(c.capabilities)) {
      errors.push(`Field "capabilities" must be an array. Got: ${typeof c.capabilities}`);
    } else {
      for (const cap of c.capabilities as string[]) {
        if (!validCapabilities.includes(cap as PluginCapability)) {
          errors.push(`Invalid capability in "capabilities": "${cap}". Valid capabilities: ${validCapabilities.join(', ')}`);
        }
      }
    }
  }

  // Check optional pythonVersion
  if (c.pythonVersion !== undefined) {
    if (!['3.11', '3.12'].includes(c.pythonVersion as string)) {
      errors.push(`Invalid pythonVersion "${c.pythonVersion as string}". Valid versions: 3.11, 3.12`);
    }
  }

  // Check optional dependencies
  if (c.dependencies !== undefined && !Array.isArray(c.dependencies)) {
    errors.push(`Field "dependencies" must be an array. Got: ${typeof c.dependencies}`);
  }

  return errors;
}

/**
 * Enforce role-specific consistency rules on top of the structural check
 * (e.g. SensorProvider plugins must declare at least one provided sensor;
 * Hub plugins cannot expose sensors). Throws on the first violation.
 *
 * @param contract - Already-structurally-valid contract.
 *
 * @param pluginName - Optional plugin name; used to prefix error messages.
 *
 * @throws {Error} When the contract violates a role-specific rule.
 *
 * @example
 * ```ts
 * import { validateContractConsistency } from '@camera.ui/sdk';
 *
 * validateContractConsistency(contract, 'my-plugin');
 * ```
 */
export function validateContractConsistency(contract: PluginContract, pluginName?: string): void {
  const prefix = pluginName ? `Plugin "${pluginName}": ` : '';

  switch (contract.role) {
    case PluginRole.Hub:
      if (contract.provides.length > 0) {
        throw new Error(`${prefix}Hub plugins cannot provide sensors.`);
      }
      break;

    case PluginRole.SensorProvider:
      if (contract.provides.length === 0) {
        throw new Error(`${prefix}SensorProvider plugins must provide at least one sensor type.`);
      }
      break;

    case PluginRole.CameraAndSensorProvider:
      if (contract.provides.length === 0) {
        throw new Error(`${prefix}CameraAndSensorProvider plugins must provide at least one sensor type.`);
      }
      break;

    case PluginRole.CameraController:
      // CameraController can have empty or filled provides array
      // (sensors are only for its own cameras)
      break;
  }
}

/**
 * Reports whether the plugin's role is Hub (vendor cloud integration that
 * manages its own cameras end-to-end).
 *
 * @param contract - Plugin contract to inspect.
 *
 * @returns `true` if the role is {@link PluginRole.Hub}.
 *
 * @example
 * ```ts
 * import { isHub } from '@camera.ui/sdk';
 *
 * if (isHub(contract)) skipLocalDiscovery();
 * ```
 */
export function isHub(contract: PluginContract): boolean {
  return contract.role === PluginRole.Hub;
}

/**
 * Reports whether the plugin is allowed to add sensors to cameras owned by
 * other plugins (true for SensorProvider and CameraAndSensorProvider).
 * Hub and pure CameraController plugins only see their own cameras.
 *
 * @param contract - Plugin contract to inspect.
 *
 * @returns `true` if the plugin may attach sensors to any camera.
 *
 * @example
 * ```ts
 * import { canProvideSensorsToAnyCameras } from '@camera.ui/sdk';
 *
 * if (canProvideSensorsToAnyCameras(contract)) listAllCameras();
 * ```
 */
export function canProvideSensorsToAnyCameras(contract: PluginContract): boolean {
  return contract.role === PluginRole.SensorProvider || contract.role === PluginRole.CameraAndSensorProvider;
}

/**
 * Reports whether the plugin can create cameras (role is CameraController
 * or CameraAndSensorProvider). Used to gate camera-creating operations such
 * as DiscoveryProvider adoption.
 *
 * @param contract - Plugin contract to inspect.
 *
 * @returns `true` if the plugin may create cameras.
 *
 * @example
 * ```ts
 * import { canCreateCameras } from '@camera.ui/sdk';
 *
 * if (canCreateCameras(contract)) enableAdoption();
 * ```
 */
export function canCreateCameras(contract: PluginContract): boolean {
  return contract.role === PluginRole.CameraController || contract.role === PluginRole.CameraAndSensorProvider;
}

/**
 * Reports whether the plugin implements the given capability.
 *
 * @param contract - Plugin contract to inspect.
 *
 * @param iface - Interface to check (e.g. `PluginInterface.DiscoveryProvider`).
 *
 * @returns `true` if `iface` is listed in the contract's `interfaces`.
 *
 * @example
 * ```ts
 * import { hasInterface, PluginInterface } from '@camera.ui/sdk';
 *
 * if (hasInterface(contract, PluginInterface.DiscoveryProvider)) startScan();
 * ```
 */
export function hasInterface(contract: PluginContract, iface: PluginInterface): boolean {
  return contract.interfaces.includes(iface);
}

/**
 * Reports whether the plugin requested the given capability.
 *
 * @param contract - Plugin contract to inspect.
 *
 * @param cap - Capability to check (e.g. `PluginCapability.PublishNotifications`).
 *
 * @returns `true` if `cap` is listed in the contract's `capabilities`.
 *
 * @example
 * ```ts
 * import { hasCapability, PluginCapability } from '@camera.ui/sdk';
 *
 * if (hasCapability(contract, PluginCapability.PublishNotifications)) allowPublish();
 * ```
 */
export function hasCapability(contract: PluginContract, cap: PluginCapability): boolean {
  return contract.capabilities?.includes(cap) ?? false;
}
