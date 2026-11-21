/**
 * The physical device a sensor belongs to, as the plugin reports it. Sensors
 * of one plugin that report the same `id` form one device: one row on the
 * sensors page, one HomeKit accessory, one Home Assistant device. A sensor
 * without a device is its own device, and a sensor added with
 * `camera.addSensor()` belongs to its camera.
 */
export interface DeviceInfo {
  /** The source's stable id for the device, never an address: a vendor device id, a Home Assistant device id, a serial number. */
  id: string;
  /** Name of the device at the source. */
  name: string;
  /** Manufacturer label. */
  manufacturer?: string;
  /** Model label. */
  model?: string;
  /** Firmware version. */
  firmware?: string;
  /** Serial number. */
  serialNumber?: string;
}

/** The device a sensor belongs to, as consumers see it. */
export interface SensorDevice {
  /** Id of the device in camera.ui, not the plugin's `DeviceInfo.id`. */
  id: string;
  /** Name shown to the user, the source's name until the user renames the device. */
  name: string;
  /** Manufacturer label. */
  manufacturer?: string;
  /** Model label. */
  model?: string;
  /** Firmware version. */
  firmware?: string;
  /** Serial number. */
  serialNumber?: string;
}

/** Options of `setDeviceInfo()`. */
export interface SetDeviceInfoOptions {
  /** Whether this sensor is the device's main sensor, called like the device when it stands alone. */
  primary?: boolean;
}
