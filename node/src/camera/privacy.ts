/** Privacy mode of a camera. */
export interface CameraPrivacy {
  /** Whether privacy mode is on. Nobody sees the camera live, its snapshots or its shares. */
  enabled: boolean;
  /** Whether recording and detection pause too while privacy mode is on. */
  pauseRecording: boolean;
  /** When privacy mode began (Unix ms), set by the server. */
  since?: number;
  /** When privacy mode ends by itself (Unix ms), none while it has no end. */
  until?: number;
}
