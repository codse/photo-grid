export type CropRotation = 0 | 90 | 180 | 270;

export type CropState = {
  /** Pan offset as fraction of overflow (0.5 = centered) */
  offsetX: number;
  offsetY: number;
  /** Zoom: 1 = cover fit, >1 zooms in */
  zoom: number;
  /** Display/export orientation — not baked into the file. */
  rotation: CropRotation;
  /** Horizontal mirror after rotation. */
  flipH: boolean;
};

export const DEFAULT_CROP: CropState = {
  offsetX: 0.5,
  offsetY: 0.5,
  zoom: 1,
  rotation: 0,
  flipH: false,
};

export function normalizeCrop(crop: Partial<CropState> | CropState): CropState {
  const rotation = crop.rotation;
  return {
    offsetX: crop.offsetX ?? 0.5,
    offsetY: crop.offsetY ?? 0.5,
    zoom: crop.zoom ?? 1,
    rotation:
      rotation === 90 || rotation === 180 || rotation === 270 ? rotation : 0,
    flipH: !!crop.flipH,
  };
}

export type Adjustments = {
  brightness: number; // 1 = normal, range ~0.4–1.8
  contrast: number; // 1 = normal
  saturation: number; // 1 = normal (“color”)
};

export const DEFAULT_ADJUST: Adjustments = {
  brightness: 1,
  contrast: 1,
  saturation: 1,
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
