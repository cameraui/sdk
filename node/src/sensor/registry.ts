import { audioMeta } from './audio.js';
import { batteryMeta } from './battery.js';
import { classifierMeta } from './classifier.js';
import { clipMeta } from './clip.js';
import { contactMeta } from './contact.js';
import { doorbellMeta } from './doorbell.js';
import { faceMeta } from './face.js';
import { garageMeta } from './garage.js';
import { humidityMeta } from './humidity.js';
import { leakMeta } from './leak.js';
import { licensePlateMeta } from './licensePlate.js';
import { lightMeta } from './light.js';
import { lockMeta } from './lock.js';
import { motionMeta } from './motion.js';
import { objectMeta } from './object.js';
import { occupancyMeta } from './occupancy.js';
import { ptzMeta } from './ptz.js';
import { securitySystemMeta } from './securitySystem.js';
import { sirenMeta } from './siren.js';
import { smokeMeta } from './smoke.js';
import { switchMeta } from './switch.js';
import { temperatureMeta } from './temperature.js';

import type { SensorType } from './base.js';
import type { SensorMeta } from './meta.js';

/** Every sensor's metadata. A new sensor type adds its meta here. */
export const SENSOR_META = [
  audioMeta,
  batteryMeta,
  classifierMeta,
  clipMeta,
  contactMeta,
  doorbellMeta,
  faceMeta,
  garageMeta,
  humidityMeta,
  leakMeta,
  licensePlateMeta,
  lightMeta,
  lockMeta,
  motionMeta,
  objectMeta,
  occupancyMeta,
  ptzMeta,
  securitySystemMeta,
  sirenMeta,
  smokeMeta,
  switchMeta,
  temperatureMeta,
] as const satisfies readonly SensorMeta[];

/** Union of every declared assignment key, derived from the registry. */
export type SensorAssignmentKey = (typeof SENSOR_META)[number]['assignmentKey'];

// Every SensorType must declare a meta. A new enum member without one is a
// compile error here, so consumers can build exhaustive per-type tables safely.
type MissingMeta = Exclude<SensorType, (typeof SENSOR_META)[number]['type']>;
const _everySensorHasMeta: MissingMeta extends never ? true : ['missing SENSOR_META entry for', MissingMeta] = true;
void _everySensorHasMeta;

/**
 * Looks up a sensor's metadata by its type.
 *
 * @param type - The sensor type value.
 *
 * @returns The metadata, or `undefined` if no sensor declares that type.
 *
 * @example
 * ```ts
 * const meta = sensorMeta(SensorType.Light);
 * ```
 */
export function sensorMeta(type: string): SensorMeta | undefined {
  return SENSOR_META.find((meta) => (meta.type as string) === type);
}
