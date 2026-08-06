import type { Adjustments, CropState, SheetLayout, Subject } from '@/core/types';
import { cssFilter, hasAdjustments } from '@/core/adjust-filter';
import { coverDisplayLayout } from '@/core/crop-math';
import { exportSheetFileName, type ExportImageExt } from '@/core/export-name';
import { mmToPx, PRINT_DPI } from '@/core/units';

export type ImageSource = {
  uri: string;
  width: number;
  height: number;
  element?: CanvasImageSource;
};

export type RenderSheetOptions = {
  dpi?: number;
  format?: ExportImageExt;
  showGuides?: boolean;
  cutGuides?: boolean;
  selectedCellId?: string | null;
  images: Map<string, ImageSource>;
  subjects: Subject[];
};

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  imgW: number,
  imgH: number,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  crop: CropState,
  adjust?: Adjustments,
) {
  const layout = coverDisplayLayout(imgW, imgH, dw, dh, crop);
  ctx.save();
  ctx.beginPath();
  ctx.rect(dx, dy, dw, dh);
  ctx.clip();
  if (adjust && hasAdjustments(adjust)) {
    ctx.filter = cssFilter(adjust);
  }
  const cx = dx + layout.translateX + layout.displayW / 2;
  const cy = dy + layout.translateY + layout.displayH / 2;
  ctx.translate(cx, cy);
  ctx.rotate((layout.rotation * Math.PI) / 180);
  if (layout.flipH) ctx.scale(-1, 1);
  ctx.drawImage(
    img,
    -layout.preRotateW / 2,
    -layout.preRotateH / 2,
    layout.preRotateW,
    layout.preRotateH,
  );
  ctx.filter = 'none';
  ctx.restore();
}

export function paintSheet(
  ctx: CanvasRenderingContext2D,
  layout: SheetLayout,
  options: RenderSheetOptions,
) {
  const dpi = options.dpi ?? PRINT_DPI;
  const w = mmToPx(layout.paperWidthMm, dpi);
  const h = mmToPx(layout.paperHeightMm, dpi);
  const px = (mm: number) => mmToPx(mm, dpi);
  const subjectById = new Map(options.subjects.map((s) => [s.id, s]));

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);

  for (const cell of layout.cells) {
    const img = options.images.get(cell.subjectId);
    const subject = subjectById.get(cell.subjectId);
    const dx = px(cell.xMm);
    const dy = px(cell.yMm);
    const dw = px(cell.widthMm);
    const dh = px(cell.heightMm);

    if (img?.element) {
      drawCover(
        ctx,
        img.element,
        img.width,
        img.height,
        dx,
        dy,
        dw,
        dh,
        cell.crop,
        subject?.adjust,
      );
    } else {
      ctx.fillStyle = '#E8ECF0';
      ctx.fillRect(dx, dy, dw, dh);
    }

    if (options.showGuides || options.cutGuides) {
      const selected = cell.id === options.selectedCellId;
      ctx.strokeStyle = selected
        ? 'rgba(255, 107, 53, 0.95)'
        : 'rgba(0,0,0,0.22)';
      ctx.lineWidth = selected ? Math.max(2, dpi / 96) : Math.max(1, dpi / 150);
      ctx.strokeRect(dx + 0.5, dy + 0.5, dw - 1, dh - 1);
    }
  }

  return { width: w, height: h };
}

export async function loadImageSource(uri: string): Promise<ImageSource> {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = uri;
  });
  return {
    uri,
    width: img.naturalWidth || img.width,
    height: img.naturalHeight || img.height,
    element: img,
  };
}

async function exportSheetBlob(
  layout: SheetLayout,
  options: {
    images: Map<string, ImageSource>;
    subjects: Subject[];
    cutGuides?: boolean;
    format?: ExportImageExt;
  },
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  const dpi = PRINT_DPI;
  canvas.width = mmToPx(layout.paperWidthMm, dpi);
  canvas.height = mmToPx(layout.paperHeightMm, dpi);
  const ctx = canvas.getContext('2d')!;
  paintSheet(ctx, layout, {
    ...options,
    dpi,
    showGuides: false,
    cutGuides: options.cutGuides ?? false,
  });
  const format = options.format ?? 'png';
  const mime = format === 'jpg' ? 'image/jpeg' : 'image/png';
  const quality = format === 'jpg' ? 0.92 : undefined;
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) =>
        b
          ? resolve(b)
          : reject(new Error(`${format.toUpperCase()} export failed`)),
      mime,
      quality,
    );
  });
}

async function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportAndShareImage(
  layout: SheetLayout,
  images: Map<string, ImageSource>,
  subjects: Subject[],
  cutGuides: boolean,
  format: ExportImageExt = 'png',
): Promise<string> {
  const blob = await exportSheetBlob(layout, {
    images,
    subjects,
    cutGuides,
    format,
  });
  await downloadBlob(blob, exportSheetFileName(subjects, format));
  return URL.createObjectURL(blob);
}

export async function exportAndSharePng(
  layout: SheetLayout,
  images: Map<string, ImageSource>,
  subjects: Subject[],
  cutGuides: boolean,
): Promise<string> {
  return exportAndShareImage(layout, images, subjects, cutGuides, 'png');
}

/** PNG as base64 (no data-url prefix) for the saved-sheets library. */
export async function exportSheetPngBase64(
  layout: SheetLayout,
  images: Map<string, ImageSource>,
  subjects: Subject[],
  cutGuides: boolean,
): Promise<string> {
  const blob = await exportSheetBlob(layout, {
    images,
    subjects,
    cutGuides,
    format: 'png',
  });
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

export async function exportAndSharePdf(
  layout: SheetLayout,
  images: Map<string, ImageSource>,
  subjects: Subject[],
  cutGuides: boolean,
): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const blob = await exportSheetBlob(layout, {
    images,
    subjects,
    cutGuides,
    format: 'png',
  });
  const dataUrl = await blobToDataUrl(blob);
  const pdf = new jsPDF({
    orientation:
      layout.paperWidthMm > layout.paperHeightMm ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [layout.paperWidthMm, layout.paperHeightMm],
  });
  pdf.addImage(
    dataUrl,
    'PNG',
    0,
    0,
    layout.paperWidthMm,
    layout.paperHeightMm,
  );
  pdf.save(exportSheetFileName(subjects, 'pdf'));
}

export async function saveImageToLibrary(
  layout: SheetLayout,
  images: Map<string, ImageSource>,
  subjects: Subject[],
  cutGuides: boolean,
  format: ExportImageExt = 'png',
): Promise<void> {
  // Web: download is the equivalent of “save”
  await exportAndShareImage(layout, images, subjects, cutGuides, format);
}

export async function savePngToLibrary(
  layout: SheetLayout,
  images: Map<string, ImageSource>,
  subjects: Subject[],
  cutGuides: boolean,
): Promise<void> {
  return saveImageToLibrary(layout, images, subjects, cutGuides, 'png');
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Failed to read blob'));
    reader.readAsDataURL(blob);
  });
}
