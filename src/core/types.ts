export type CropState = {
  /** Pan offset as fraction of overflow (0.5 = centered) */
  offsetX: number;
  offsetY: number;
  /** Zoom: 1 = cover fit, >1 zooms in */
  zoom: number;
};

export const DEFAULT_CROP: CropState = {
  offsetX: 0.5,
  offsetY: 0.5,
  zoom: 1,
};

export type Adjustments = {
  brightness: number; // 1 = normal, range ~0.5–1.5
  contrast: number; // 1 = normal
};

export const DEFAULT_ADJUST: Adjustments = {
  brightness: 1,
  contrast: 1,
};

/** One person / source photo on the sheet. */
export type Subject = {
  id: string;
  label: string;
  url: string;
  /** Original upload/camera file stem or name (for export naming). */
  sourceName?: string;
  /** Previous URI for undo (e.g. before BG removal). */
  previousUrl?: string;
  widthMm: number;
  heightMm: number;
  /** How many copies to place (auto-fill can raise this). */
  copies: number;
  crop: CropState;
  adjust: Adjustments;
};

/** A placed cell on the printable canvas. */
export type PlacedCell = {
  id: string;
  subjectId: string;
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  /** Per-cell crop (independent drag/pan). */
  crop: CropState;
};

export type SheetLayout = {
  paperWidthMm: number;
  paperHeightMm: number;
  gapMm: number;
  marginMm: number;
  rotated: boolean;
  cells: PlacedCell[];
};

export function uid(prefix = 'id'): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}
