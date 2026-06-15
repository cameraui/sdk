import { canCreateCameras, hasInterface } from '../plugin/helper.js';
import { PluginInterface } from '../plugin/contract.js';

import type { PluginContract } from '../plugin/contract.js';

/**
 * Reports whether the plugin can be queried for camera discovery — it must
 * both implement the DiscoveryProvider interface and have a camera-owning
 * role.
 *
 * @param contract - Plugin contract to inspect.
 *
 * @returns `true` if the plugin is a usable discovery provider.
 *
 * @example
 * ```ts
 * import { isDiscoveryProvider } from '@camera.ui/sdk/internal';
 *
 * if (isDiscoveryProvider(contract)) await runDiscovery(contract);
 * ```
 */
export function isDiscoveryProvider(contract: PluginContract): boolean {
  return hasInterface(contract, PluginInterface.DiscoveryProvider) && canCreateCameras(contract);
}
