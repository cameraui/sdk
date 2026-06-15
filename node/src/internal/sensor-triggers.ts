/** Sensor trigger types — the subset of trigger types that originate from configurable sensors (excludes motion/audio). */
export const SENSOR_TRIGGER_TYPES = ['contact', 'doorbell', 'switch', 'light', 'siren', 'security_system'] as const;
export type SensorTriggerType = (typeof SENSOR_TRIGGER_TYPES)[number];
