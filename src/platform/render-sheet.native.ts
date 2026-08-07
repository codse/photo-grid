import {
  Skia,
  ImageFormat,
  PaintStyle,
  type SkImage,
} from '@shopify/react-native-skia';
import { Image as RNImage } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import type { CropState, SheetLayout, Subject } from '@/core/types';
import { adjustColorMatrix, hasAdjustments } from '@/core/adjust-filter';
import { coverDisplayLayout } from '@/core/crop-math';
import {
  exportSheetFileName,
  type ExportImageExt,
} from '@/core/export-name';
import { mmToPx, PRINT_DPI } from '@/core/units';

export type ImageSource = {
  uri: string;
  width: number;
  height: number;
  /** JPEG/PNG file:// path Skia can decode (HEIC / ph:// normalized). */
  skiaUri?: string;
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

const skiaUriCache = new Map<string, string>();

/**
 * Skia can't decode HEIC / many Photos picker URIs. Re-encode to JPEG in cache.
 */
export async function materializeSkiaUri(uri: string): Promise<string> {
  const cached = skiaUriCache.get(uri);
  if (cached) {
    const info = await FileSystem.getInfoAsync(cached);
    if (info.exists) return cached;
    skiaUriCache.delete(uri);
  }

  try {
    const data = await Skia.Data.fromURI(uri);
    const probe = Skia.Image.MakeImageFromEncoded(data);
    if (probe) {
      probe.dispose();
      skiaUriCache.set(uri, uri);
      return uri;
    }
  } catch {
    // fall through — convert
  }

  const flat = await manipulateAsync(uri, [], {
    compress: 0.95,
    format: SaveFormat.JPEG,
  });
  skiaUriCache.set(uri, flat.uri);
  return flat.uri;
}

async function decodeSkiaImage(uri: string): Promise<SkImage> {
  const local = await materializeSkiaUri(uri);
  const data = await Skia.Data.fromURI(local);
  const image = Skia.Image.MakeImageFromEncoded(data);
  if (!image) {
    throw new Error(
      'Could not decode photo for export. Try picking the image again (HEIC photos are converted automatically).',
    );
  }
  return image;
}

export async function loadImageSource(uri: string): Promise<ImageSource> {
  // Normalize for Skia early so export doesn't surprise-fail on HEIC.
  const skiaUri = await materializeSkiaUri(uri);

  try {
    const size = await new Promise<{ width: number; height: number }>(
      (resolve, reject) => {
        RNImage.getSize(
          skiaUri,
          (width, height) => resolve({ width, height }),
          reject,
        );
      },
    );
    if (size.width > 0 && size.height > 0) {
      return { uri, width: size.width, height: size.height, skiaUri };
    }
  } catch {
    // fall through to Skia dims
  }

  const image = await decodeSkiaImage(uri);
  const width = image.width();
  const height = image.height();
  image.dispose();
  return { uri, width, height, skiaUri };
}

function toBase64(bytes: Uint8Array): string {
  if (typeof btoa === 'function') {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]!);
    }
    return btoa(binary);
  }
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i]!;
    const b = bytes[i + 1] ?? 0;
    const c = bytes[i + 2] ?? 0;
    const n = (a << 16) | (b << 8) | c;
    out += chars[(n >> 18) & 63];
    out += chars[(n >> 12) & 63];
    out += i + 1 < bytes.length ? chars[(n >> 6) & 63] : '=';
    out += i + 2 < bytes.length ? chars[n & 63] : '=';
  }
  return out;
}

export async function renderSheetToFile(
  layout: SheetLayout,
  options: RenderSheetOptions,
): Promise<string> {
  const dpi = options.dpi ?? PRINT_DPI;
  const w = mmToPx(layout.paperWidthMm, dpi);
  const h = mmToPx(layout.paperHeightMm, dpi);
  const surface = Skia.Surface.MakeOffscreen(w, h);
  if (!surface) throw new Error('Could not create Skia surface');

  const canvas = surface.getCanvas();
  canvas.clear(Skia.Color('white'));

  const px = (mm: number) => mmToPx(mm, dpi);
  const decoded = new Map<string, SkImage>();

  try {
    for (const [id, src] of options.images) {
      decoded.set(id, await decodeSkiaImage(src.skiaUri ?? src.uri));
    }

    const subjectById = new Map(options.subjects.map((s) => [s.id, s]));

    for (const cell of layout.cells) {
      const img = decoded.get(cell.subjectId);
      const srcMeta = options.images.get(cell.subjectId);
      const subject = subjectById.get(cell.subjectId);
      const dx = px(cell.xMm);
      const dy = px(cell.yMm);
      const dw = px(cell.widthMm);
      const dh = px(cell.heightMm);

      canvas.save();
      canvas.clipRect(Skia.XYWHRect(dx, dy, dw, dh), 1, true);

      if (img && srcMeta) {
        const crop: CropState = cell.crop;
        const layout = coverDisplayLayout(
          srcMeta.width,
          srcMeta.height,
          dw,
          dh,
          crop,
        );
        const paint = Skia.Paint();
        paint.setAntiAlias(true);
        if (subject?.adjust && hasAdjustments(subject.adjust)) {
          paint.setColorFilter(
            Skia.ColorFilter.MakeMatrix(adjustColorMatrix(subject.adjust)),
          );
        }
        const cx = dx + layout.translateX + layout.displayW / 2;
        const cy = dy + layout.translateY + layout.displayH / 2;
        canvas.save();
        canvas.translate(cx, cy);
        canvas.rotate(layout.rotation, 0, 0);
        if (layout.flipH) canvas.scale(-1, 1);
        canvas.drawImageRect(
          img,
          Skia.XYWHRect(0, 0, img.width(), img.height()),
          Skia.XYWHRect(
            -layout.preRotateW / 2,
            -layout.preRotateH / 2,
            layout.preRotateW,
            layout.preRotateH,
          ),
          paint,
        );
        canvas.restore();
      } else {
        const fill = Skia.Paint();
        fill.setColor(Skia.Color('#E8ECF0'));
        canvas.drawRect(Skia.XYWHRect(dx, dy, dw, dh), fill);
      }
      canvas.restore();

      if (options.cutGuides || options.showGuides) {
        const stroke = Skia.Paint();
        stroke.setStyle(PaintStyle.Stroke);
        stroke.setStrokeWidth(
          cell.id === options.selectedCellId
            ? Math.max(2, dpi / 96)
            : Math.max(1, dpi / 150),
        );
        stroke.setColor(
          Skia.Color(
            cell.id === options.selectedCellId
              ? 'rgba(255,107,53,0.95)'
              : 'rgba(0,0,0,0.22)',
          ),
        );
        canvas.drawRect(
          Skia.XYWHRect(dx + 0.5, dy + 0.5, dw - 1, dh - 1),
          stroke,
        );
      }
    }

    const format: ExportImageExt = options.format ?? 'png';
    const snapshot = surface.makeImageSnapshot();
    const bytes = snapshot.encodeToBytes(
      format === 'jpg' ? ImageFormat.JPEG : ImageFormat.PNG,
      format === 'jpg' ? 92 : 100,
    );
    snapshot.dispose();
    if (!bytes) throw new Error(`${format.toUpperCase()} encode failed`);

    const path = `${FileSystem.cacheDirectory}${exportSheetFileName(options.subjects, format)}`;
    await FileSystem.writeAsStringAsync(path, toBase64(bytes), {
      encoding: FileSystem.EncodingType.Base64,
    });
    return path;
  } finally {
    for (const img of decoded.values()) img.dispose();
    surface.dispose();
  }
}

export async function exportAndShareImage(
  layout: SheetLayout,
  images: Map<string, ImageSource>,
  subjects: Subject[],
  cutGuides: boolean,
  format: ExportImageExt = 'png',
  dpi: number = PRINT_DPI,
): Promise<string> {
  const path = await renderSheetToFile(layout, {
    images,
    subjects,
    cutGuides,
    dpi,
    format,
  });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(path, {
      mimeType: format === 'jpg' ? 'image/jpeg' : 'image/png',
      UTI: format === 'jpg' ? 'public.jpeg' : 'public.png',
      dialogTitle: 'Share passport photo print sheet',
    });
  }
  return path;
}

/** @deprecated Prefer exportAndShareImage */
export async function exportAndSharePng(
  layout: SheetLayout,
  images: Map<string, ImageSource>,
  subjects: Subject[],
  cutGuides: boolean,
): Promise<string> {
  return exportAndShareImage(layout, images, subjects, cutGuides, 'png');
}

export async function exportSheetPngBase64(
  layout: SheetLayout,
  images: Map<string, ImageSource>,
  subjects: Subject[],
  cutGuides: boolean,
  dpi: number = PRINT_DPI,
): Promise<string> {
  const path = await renderSheetToFile(layout, {
    images,
    subjects,
    cutGuides,
    dpi,
  });
  return FileSystem.readAsStringAsync(path, {
    encoding: FileSystem.EncodingType.Base64,
  });
}

export async function exportAndSharePdf(
  layout: SheetLayout,
  images: Map<string, ImageSource>,
  subjects: Subject[],
  cutGuides: boolean,
): Promise<void> {
  const path = await renderSheetToFile(layout, {
    images,
    subjects,
    cutGuides,
    dpi: PRINT_DPI,
  });
  const Print = await import('expo-print');
  const SharingMod = await import('expo-sharing');
  const base64 = await FileSystem.readAsStringAsync(path, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const pdf = await Print.printToFileAsync({
    html: `<!doctype html><html><head><meta charset="utf-8"/><style>
      @page { size: ${layout.paperWidthMm}mm ${layout.paperHeightMm}mm; margin: 0; }
      html, body { margin: 0; padding: 0; }
      img { width: 100%; height: auto; display: block; }
    </style></head><body>
      <img src="data:image/png;base64,${base64}" />
    </body></html>`,
  });
  if (await SharingMod.isAvailableAsync()) {
    await SharingMod.shareAsync(pdf.uri, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle: 'Share passport photo PDF',
    });
  }
}

export async function saveImageToLibrary(
  layout: SheetLayout,
  images: Map<string, ImageSource>,
  subjects: Subject[],
  cutGuides: boolean,
  format: ExportImageExt = 'png',
  dpi: number = PRINT_DPI,
): Promise<void> {
  const { Asset, requestPermissionsAsync } = await import('expo-media-library');
  const perm = await requestPermissionsAsync(true);
  if (!perm.granted) {
    throw new Error('Photo library permission is required to save the sheet.');
  }
  const path = await renderSheetToFile(layout, {
    images,
    subjects,
    cutGuides,
    dpi,
    format,
  });
  // New MediaLibrary API — saveToLibraryAsync throws at runtime in SDK 57+.
  await Asset.create(path);
}

/** @deprecated Prefer saveImageToLibrary */
export async function savePngToLibrary(
  layout: SheetLayout,
  images: Map<string, ImageSource>,
  subjects: Subject[],
  cutGuides: boolean,
): Promise<void> {
  return saveImageToLibrary(layout, images, subjects, cutGuides, 'png');
}
