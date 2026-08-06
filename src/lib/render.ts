import { jsPDF } from 'jspdf';
import { saveAs } from 'file-saver';
import type { SheetLayout, Subject } from './types.ts';
import { DEFAULT_CROP, type CropState, type Adjustments } from './types.ts';
import { mmToPx, PRINT_DPI } from './units.ts';

export { DEFAULT_CROP };
export type { CropState };

/**
 * Draw a cover-fit image into a destination rect with pan/zoom + adjust.
 */
export function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | ImageBitmap,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  crop: CropState,
  adjust?: Adjustments,
) {
  const iw = img.width;
  const ih = img.height;
  const scale = Math.max(dw / iw, dh / ih) * crop.zoom;
  const sw = dw / scale;
  const sh = dh / scale;
  const maxOx = Math.max(0, iw - sw);
  const maxOy = Math.max(0, ih - sh);
  const sx = maxOx * crop.offsetX;
  const sy = maxOy * crop.offsetY;

  ctx.save();
  ctx.beginPath();
  ctx.rect(dx, dy, dw, dh);
  ctx.clip();

  if (adjust && (adjust.brightness !== 1 || adjust.contrast !== 1)) {
    ctx.filter = `brightness(${adjust.brightness}) contrast(${adjust.contrast})`;
  }
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
  ctx.filter = 'none';
  ctx.restore();
}

export type RenderOptions = {
  dpi?: number;
  showGuides?: boolean;
  selectedCellId?: string | null;
  images: Map<string, HTMLImageElement | ImageBitmap>;
  subjects: Subject[];
};

export function renderSheet(
  canvas: HTMLCanvasElement,
  layout: SheetLayout,
  options: RenderOptions,
) {
  const dpi = options.dpi ?? PRINT_DPI;
  const showGuides = options.showGuides ?? false;
  const w = mmToPx(layout.paperWidthMm, dpi);
  const h = mmToPx(layout.paperHeightMm, dpi);
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);

  const px = (mm: number) => mmToPx(mm, dpi);
  const subjectById = new Map(options.subjects.map((s) => [s.id, s]));

  for (const cell of layout.cells) {
    const img = options.images.get(cell.subjectId);
    const subject = subjectById.get(cell.subjectId);
    const dx = px(cell.xMm);
    const dy = px(cell.yMm);
    const dw = px(cell.widthMm);
    const dh = px(cell.heightMm);

    if (img) {
      drawCoverImage(ctx, img, dx, dy, dw, dh, cell.crop, subject?.adjust);
    } else {
      ctx.fillStyle = '#eee9dc';
      ctx.fillRect(dx, dy, dw, dh);
    }

    if (showGuides) {
      const selected = cell.id === options.selectedCellId;
      ctx.strokeStyle = selected
        ? 'rgba(196, 92, 38, 0.95)'
        : 'rgba(0,0,0,0.18)';
      ctx.lineWidth = selected ? Math.max(2, dpi / 96) : 1;
      ctx.strokeRect(dx + 0.5, dy + 0.5, dw - 1, dh - 1);
    }
  }
}

/** Single ID photo frame for crop / adjust steps. */
export function renderPortrait(
  canvas: HTMLCanvasElement,
  img: HTMLImageElement | ImageBitmap,
  widthMm: number,
  heightMm: number,
  crop: CropState,
  adjust?: Adjustments,
  options?: { dpi?: number; showGuide?: boolean },
) {
  const dpi = options?.dpi ?? 160;
  const showGuide = options?.showGuide ?? true;
  const w = mmToPx(widthMm, dpi);
  const h = mmToPx(heightMm, dpi);
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  drawCoverImage(ctx, img, 0, 0, w, h, crop, adjust);

  if (showGuide) {
    ctx.strokeStyle = 'rgba(196, 92, 38, 0.4)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.42, w * 0.28, h * 0.32, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

async function exportCanvas(
  layout: SheetLayout,
  images: Map<string, HTMLImageElement | ImageBitmap>,
  subjects: Subject[],
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  renderSheet(canvas, layout, {
    dpi: PRINT_DPI,
    showGuides: false,
    images,
    subjects,
  });
  return canvas;
}

export async function downloadPng(
  layout: SheetLayout,
  images: Map<string, HTMLImageElement | ImageBitmap>,
  subjects: Subject[],
  filename = 'photo-grid.png',
) {
  const canvas = await exportCanvas(layout, images, subjects);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('PNG export failed'))),
      'image/png',
    );
  });
  saveAs(blob, filename);
}

export async function downloadPdf(
  layout: SheetLayout,
  images: Map<string, HTMLImageElement | ImageBitmap>,
  subjects: Subject[],
  filename = 'photo-grid.pdf',
) {
  const canvas = await exportCanvas(layout, images, subjects);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.95);

  const pdf = new jsPDF({
    orientation:
      layout.paperWidthMm > layout.paperHeightMm ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [layout.paperWidthMm, layout.paperHeightMm],
  });
  pdf.addImage(
    dataUrl,
    'JPEG',
    0,
    0,
    layout.paperWidthMm,
    layout.paperHeightMm,
  );
  pdf.save(filename);
}

export function printSheet(
  layout: SheetLayout,
  images: Map<string, HTMLImageElement | ImageBitmap>,
  subjects: Subject[],
) {
  const canvas = document.createElement('canvas');
  renderSheet(canvas, layout, {
    dpi: PRINT_DPI,
    showGuides: false,
    images,
    subjects,
  });
  const dataUrl = canvas.toDataURL('image/png');

  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(`<!doctype html>
<html><head><title>Print photo grid</title>
<style>
  @page { size: ${layout.paperWidthMm}mm ${layout.paperHeightMm}mm; margin: 0; }
  html, body { margin: 0; padding: 0; }
  img { width: 100%; height: auto; display: block; }
</style></head>
<body><img src="${dataUrl}" onload="window.focus();window.print();" /></body></html>`);
  win.document.close();
}

export function pointerToMm(
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number,
  paperWidthMm: number,
  paperHeightMm: number,
): { xMm: number; yMm: number } {
  const rect = canvas.getBoundingClientRect();
  const x = ((clientX - rect.left) / rect.width) * paperWidthMm;
  const y = ((clientY - rect.top) / rect.height) * paperHeightMm;
  return { xMm: x, yMm: y };
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
    maxOx === 0 ? crop.offsetX : clamp((crop.offsetX * maxOx + dSx) / maxOx, 0, 1);
  const nextY =
    maxOy === 0 ? crop.offsetY : clamp((crop.offsetY * maxOy + dSy) / maxOy, 0, 1);
  return { ...crop, offsetX: nextX, offsetY: nextY };
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}
