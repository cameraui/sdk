import { canCreateCameras, hasInterface } from '../plugin/helper.js';
import { PluginInterface } from '../plugin/contract.js';

import type { PluginContract } from '../plugin/contract.js';

/** @internal */
export function isDiscoveryProvider(contract: PluginContract): boolean {
  return hasInterface(contract, PluginInterface.DiscoveryProvider) && canCreateCameras(contract);
}
