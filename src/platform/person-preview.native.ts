import {
  Skia,
  ImageFormat,
  type SkImage,
} from '@shopify/react-native-skia';
import * as FileSystem from 'expo-file-system/legacy';
import type { Subject } from '@/core/types';
import { adjustColorMatrix, hasAdjustments } from '@/core/adjust-filter';
import { coverDisplayLayout } from '@/core/crop-math';
import { loadImageSource } from '@/platform/render-sheet';
import { previewOutputSize } from '@/platform/person-preview-shared';

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

async function decodeSkiaImage(uri: string): Promise<SkImage> {
  const data = await Skia.Data.fromURI(uri);
  const image = Skia.Image.MakeImageFromEncoded(data);
  if (!image) {
    throw new Error('Could not decode photo for preview bake');
  }
  return image;
}

/**
 * Bake crop + adjustments into a small JPEG for sheet cells / strip.
 * Export still uses the full `subject.url`.
 */
export async function bakePersonPreview(
  subject: Subject,
  imgW?: number,
  imgH?: number,
): Promise<string> {
  if (!subject.url) throw new Error('No photo to bake');

  const src = await loadImageSource(subject.url);
  const width = imgW && imgW > 0 ? imgW : src.width;
  const height = imgH && imgH > 0 ? imgH : src.height;
  const { width: outW, height: outH } = previewOutputSize(subject);

  const surface = Skia.Surface.MakeOffscreen(outW, outH);
  if (!surface) throw new Error('Could not create preview surface');

  const skUri = src.skiaUri ?? src.uri;
  const img = await decodeSkiaImage(skUri);
  try {
    const canvas = surface.getCanvas();
    canvas.clear(Skia.Color('white'));

    const layout = coverDisplayLayout(
      width,
      height,
      outW,
      outH,
      subject.crop,
    );
    const paint = Skia.Paint();
    paint.setAntiAlias(true);
    if (hasAdjustments(subject.adjust)) {
      paint.setColorFilter(
        Skia.ColorFilter.MakeMatrix(adjustColorMatrix(subject.adjust)),
      );
    }

    const cx = layout.translateX + layout.displayW / 2;
    const cy = layout.translateY + layout.displayH / 2;
    canvas.save();
    canvas.clipRect(Skia.XYWHRect(0, 0, outW, outH), 1, true);
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

    const snapshot = surface.makeImageSnapshot();
    const bytes = snapshot.encodeToBytes(ImageFormat.JPEG, 85);
    snapshot.dispose();
    if (!bytes) throw new Error('JPEG encode failed');

    const path = `${FileSystem.cacheDirectory}person-preview-${subject.id}-${Date.now()}.jpg`;
    await FileSystem.writeAsStringAsync(path, toBase64(bytes), {
      encoding: FileSystem.EncodingType.Base64,
    });
    return path;
  } finally {
    img.dispose();
    surface.dispose();
  }
}
