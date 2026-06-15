/**
 * Frame type identifier for frame workers.
 */
export type FrameType = 'stream' | 'motion';

/**
 * Frame worker decoder implementation.
 */
export type CameraFrameWorkerDecoder = 'wasm' | 'rust';
