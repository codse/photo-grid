import type { CropRotation, CropState } from '@/core/types';
import { normalizeCrop } from '@/core/types';

export type CoverSourceRect = {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
};

/** Bitmap size after applying crop.rotation (logical / display space). */
export function orientedSize(
  imgW: number,
  imgH: number,
  rotation: CropRotation | number,
): { w: number; h: number } {
  const swap = rotation === 90 || rotation === 270;
  return { w: swap ? imgH : imgW, h: swap ? imgW : imgH };
}

export function rotateCropCW(crop: CropState): CropState {
  const c = normalizeCrop(crop);
  return {
    ...c,
    rotation: ((c.rotation + 90) % 360) as CropRotation,
    offsetX: 0.5,
    offsetY: 0.5,
  };
}

export function flipCropHorizontal(crop: CropState): CropState {
  const c = normalizeCrop(crop);
  return {
    ...c,
    flipH: !c.flipH,
    offsetX: 1 - c.offsetX,
  };
}

/**
 * Cover-fit source rect in *oriented* image space (rotation already applied
 * conceptually). Prefer drawOrientedCover for export — this is for simple
 * unrotated sampling.
 */
export function coverSourceRect(
  imgW: number,
  imgH: number,
  destW: number,
  destH: number,
  crop: CropState,
): CoverSourceRect {
  const c = normalizeCrop(crop);
  const { w: lw, h: lh } = orientedSize(imgW, imgH, c.rotation);
  const scale = Math.max(destW / lw, destH / lh) * c.zoom;
  const sw = destW / scale;
  const sh = destH / scale;
  const maxOx = Math.max(0, lw - sw);
  const maxOy = Math.max(0, lh - sh);
  return {
    sx: maxOx * c.offsetX,
    sy: maxOy * c.offsetY,
    sw,
    sh,
  };
}

export type CoverDisplayLayout = {
  displayW: number;
  displayH: number;
  translateX: number;
  translateY: number;
  /** Pre-rotate image box (natural orientation) that fills display after rotate. */
  preRotateW: number;
  preRotateH: number;
  rotation: CropRotation;
  flipH: boolean;
};

/**
 * Display-side layout — size/offset in the crop frame after orientation.
 */
export function coverDisplayLayout(
  imgW: number,
  imgH: number,
  frameW: number,
  frameH: number,
  crop: CropState,
): CoverDisplayLayout {
  const c = normalizeCrop(crop);
  const { w: lw, h: lh } = orientedSize(imgW, imgH, c.rotation);
  const coverScale = Math.max(frameW / lw, frameH / lh) * c.zoom;
  const displayW = lw * coverScale;
  const displayH = lh * coverScale;
  const maxOx = Math.max(0, displayW - frameW);
  const maxOy = Math.max(0, displayH - frameH);
  const swapped = c.rotation === 90 || c.rotation === 270;
  return {
    displayW,
    displayH,
    translateX: -c.offsetX * maxOx,
    translateY: -c.offsetY * maxOy,
    preRotateW: swapped ? displayH : displayW,
    preRotateH: swapped ? displayW : displayH,
    rotation: c.rotation,
    flipH: c.flipH,
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
  const c = normalizeCrop(crop);
  const { w: lw, h: lh } = orientedSize(imgW, imgH, c.rotation);
  const scale = Math.max(cellWpx / lw, cellHpx / lh) * c.zoom;
  const sw = cellWpx / scale;
  const sh = cellHpx / scale;
  const maxOx = Math.max(0, lw - sw);
  const maxOy = Math.max(0, lh - sh);
  if (maxOx === 0 && maxOy === 0) return c;

  const dSx = -dxPx / scale;
  const dSy = -dyPx / scale;
  const nextX =
    maxOx === 0 ? c.offsetX : clamp((c.offsetX * maxOx + dSx) / maxOx, 0, 1);
  const nextY =
    maxOy === 0 ? c.offsetY : clamp((c.offsetY * maxOy + dSy) / maxOy, 0, 1);
  return { ...c, offsetX: nextX, offsetY: nextY };
}

export function clampZoom(zoom: number): number {
  return clamp(zoom, 1, 4);
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}
