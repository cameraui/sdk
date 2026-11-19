/** How other apps reach a camera. */
export interface CameraExportSettings {
  /** Give the camera an ONVIF device of its own on `onvifPort`. */
  onvif: boolean;
  /** Port of the camera's own ONVIF device, set while `onvif` is on. */
  onvifPort?: number;
  /** Offer the camera's streams on the RTMP server. */
  rtmp: boolean;
}
