/** All internal units are millimeters. */

export const IN_TO_MM = 25.4;
export const MM_TO_IN = 1 / 25.4;
/** Print DPI for raster export */
export const PRINT_DPI = 300;

export function inToMm(inches: number): number {
  return inches * IN_TO_MM;
}

export function mmToIn(mm: number): number {
  return mm * MM_TO_IN;
}

export function mmToPx(mm: number, dpi = PRINT_DPI): number {
  return Math.round((mm / IN_TO_MM) * dpi);
}

export function formatSize(widthMm: number, heightMm: number): string {
  const wIn = mmToIn(widthMm);
  const hIn = mmToIn(heightMm);
  const metric = `${round1(widthMm)}×${round1(heightMm)} mm`;
  const imperial = `${round2(wIn)}×${round2(hIn)} in`;
  return `${metric} · ${imperial}`;
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
