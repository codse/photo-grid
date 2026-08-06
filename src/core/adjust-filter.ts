import type { Adjustments } from '@/core/types';

/** CSS filter string for web preview / canvas export. */
export function cssFilter(adjust: Adjustments): string {
  const parts: string[] = [];
  if (adjust.brightness !== 1) {
    parts.push(`brightness(${adjust.brightness})`);
  }
  if (adjust.contrast !== 1) {
    parts.push(`contrast(${adjust.contrast})`);
  }
  if (adjust.saturation !== 1) {
    parts.push(`saturate(${adjust.saturation})`);
  }
  return parts.length ? parts.join(' ') : 'none';
}

export function hasAdjustments(adjust: Adjustments): boolean {
  return (
    adjust.brightness !== 1 ||
    adjust.contrast !== 1 ||
    adjust.saturation !== 1
  );
}

export function clampAdjustValue(n: number, min = 0.4, max = 1.8): number {
  return Math.round(Math.max(min, Math.min(max, n)) * 100) / 100;
}

/** 4×5 row-major color matrix for Skia / Android-style filters. */
export function adjustColorMatrix(adjust: Adjustments): number[] {
  // Apply brightness → contrast → saturation (CSS filter order).
  const b = brightnessMatrix(adjust.brightness);
  const c = contrastMatrix(adjust.contrast);
  const s = saturateMatrix(adjust.saturation);
  return multiplyColorMatrices(s, multiplyColorMatrices(c, b));
}

function brightnessMatrix(b: number): number[] {
  return [b, 0, 0, 0, 0, 0, b, 0, 0, 0, 0, 0, b, 0, 0, 0, 0, 0, 1, 0];
}

function contrastMatrix(c: number): number[] {
  const t = 0.5 * (1 - c);
  return [c, 0, 0, 0, t, 0, c, 0, 0, t, 0, 0, c, 0, t, 0, 0, 0, 1, 0];
}

function saturateMatrix(s: number): number[] {
  const r = 0.2126;
  const g = 0.7152;
  const b = 0.0722;
  const rr = r * (1 - s);
  const gg = g * (1 - s);
  const bb = b * (1 - s);
  return [
    rr + s,
    gg,
    bb,
    0,
    0,
    rr,
    gg + s,
    bb,
    0,
    0,
    rr,
    gg,
    bb + s,
    0,
    0,
    0,
    0,
    0,
    1,
    0,
  ];
}

/** result = a × b — apply b first, then a. */
function multiplyColorMatrices(a: number[], b: number[]): number[] {
  const out = new Array<number>(20).fill(0);
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 5; col++) {
      out[row * 5 + col] =
        a[row * 5]! * b[col]! +
        a[row * 5 + 1]! * b[5 + col]! +
        a[row * 5 + 2]! * b[10 + col]! +
        a[row * 5 + 3]! * b[15 + col]! +
        (col === 4 ? a[row * 5 + 4]! : 0);
    }
  }
  return out;
}
