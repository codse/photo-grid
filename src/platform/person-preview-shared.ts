import type { Subject } from '@/core/types';

/** Long edge for on-screen sheet cells + strip thumbs. */
export const PREVIEW_LONG_EDGE = 640;

export function previewOutputSize(subject: Subject): {
  width: number;
  height: number;
} {
  const aspect =
    subject.widthMm / Math.max(subject.heightMm, 0.0001);
  if (aspect >= 1) {
    return {
      width: PREVIEW_LONG_EDGE,
      height: Math.max(1, Math.round(PREVIEW_LONG_EDGE / aspect)),
    };
  }
  return {
    width: Math.max(1, Math.round(PREVIEW_LONG_EDGE * aspect)),
    height: PREVIEW_LONG_EDGE,
  };
}

export type { Subject };
