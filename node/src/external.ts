/**
 * Re-exports of third-party types that appear in the SDK's public surface.
 *
 * These types are re-exported so plugins can reference them in their own
 * type signatures without having to declare a direct dependency on the
 * underlying packages — the SDK already pulls them in transitively.
 */

import type sharp from 'sharp';

/**
 * The `sharp` namespace, re-exported for image processing types
 * (e.g. `sharp.Sharp`, `sharp.Metadata`, `sharp.OutputOptions`).
 */
export type { sharp };

/**
 * `RtpPacket` from `werift`, re-exported for RTP streaming integrations
 * (e.g. plugins that produce or consume RTP packets via the SDK).
 */
export type { RtpPacket } from 'werift';
