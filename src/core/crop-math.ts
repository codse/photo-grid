import type { CropState } from '@/core/types';

export type CoverSourceRect = {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
};

/** Cover-fit source rect for pan/zoom crop into a destination size. */
export function coverSourceRect(
  imgW: number,
  imgH: number,
  destW: number,
  destH: number,
  crop: CropState,
): CoverSourceRect {
  const scale = Math.max(destW / imgW, destH / imgH) * crop.zoom;
  const sw = destW / scale;
  const sh = destH / scale;
  const maxOx = Math.max(0, imgW - sw);
  const maxOy = Math.max(0, imgH - sh);
  return {
    sx: maxOx * crop.offsetX,
    sy: maxOy * crop.offsetY,
    sw,
    sh,
  };
}

export function panCropByPixels(
  crop: CropState,
  imgW: number,
  imgH: number,
  cellWpx: number,
  cellHpx: number,
  dxPx: number,
  dyPx: number,
): CropState {
  const scale = Math.max(cellWpx / imgW, cellHpx / imgH) * crop.zoom;
  const sw = cellWpx / scale;
  const sh = cellHpx / scale;
  const maxOx = Math.max(0, imgW - sw);
  const maxOy = Math.max(0, imgH - sh);
  if (maxOx === 0 && maxOy === 0) return crop;

  const dSx = -dxPx / scale;
  const dSy = -dyPx / scale;
  const nextX =
    maxOx === 0
      ? crop.offsetX
      : clamp((crop.offsetX * maxOx + dSx) / maxOx, 0, 1);
  const nextY =
    maxOy === 0
      ? crop.offsetY
      : clamp((crop.offsetY * maxOy + dSy) / maxOy, 0, 1);
  return { ...crop, offsetX: nextX, offsetY: nextY };
}

export function clampZoom(zoom: number): number {
  return clamp(zoom, 1, 4);
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}
