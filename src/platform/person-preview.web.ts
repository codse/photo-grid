import type { Subject } from '@/core/types';
import { cssFilter, hasAdjustments } from '@/core/adjust-filter';
import { coverDisplayLayout } from '@/core/crop-math';
import { loadImageSource } from '@/platform/render-sheet';
import { previewOutputSize } from '@/platform/person-preview-shared';

/**
 * Bake crop + adjustments into a small JPEG (blob URL) for sheet cells / strip.
 */
export async function bakePersonPreview(
  subject: Subject,
  imgW?: number,
  imgH?: number,
): Promise<string> {
  if (!subject.url) throw new Error('No photo to bake');
  if (typeof document === 'undefined') {
    throw new Error('Preview bake requires a document');
  }

  const src = await loadImageSource(subject.url);
  const width = imgW && imgW > 0 ? imgW : src.width;
  const height = imgH && imgH > 0 ? imgH : src.height;
  const element = src.element;
  if (!element) throw new Error('No image element for preview bake');

  const { width: outW, height: outH } = previewOutputSize(subject);
  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create canvas context');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, outW, outH);

  const layout = coverDisplayLayout(
    width,
    height,
    outW,
    outH,
    subject.crop,
  );
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, outW, outH);
  ctx.clip();
  if (hasAdjustments(subject.adjust)) {
    ctx.filter = cssFilter(subject.adjust);
  }
  const cx = layout.translateX + layout.displayW / 2;
  const cy = layout.translateY + layout.displayH / 2;
  ctx.translate(cx, cy);
  ctx.rotate((layout.rotation * Math.PI) / 180);
  if (layout.flipH) ctx.scale(-1, 1);
  ctx.drawImage(
    element,
    -layout.preRotateW / 2,
    -layout.preRotateH / 2,
    layout.preRotateW,
    layout.preRotateH,
  );
  ctx.restore();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('JPEG encode failed'))),
      'image/jpeg',
      0.85,
    );
  });
  return URL.createObjectURL(blob);
}
