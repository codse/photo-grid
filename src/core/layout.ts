import { DEFAULT_CROP, type PlacedCell, type SheetLayout, type Subject, uid } from './types';

export type PackOptions = {
  paperWidthMm: number;
  paperHeightMm: number;
  gapMm?: number;
  marginMm?: number;
  orientation?: 'auto' | 'portrait' | 'landscape';
  /** fill = pack as many as fit; exact = only subject.copies each */
  mode?: 'fill' | 'exact';
};

type Item = {
  subjectId: string;
  widthMm: number;
  heightMm: number;
  crop: typeof DEFAULT_CROP;
};

/**
 * Pack subjects onto paper. Mixed sizes use shelf packing.
 * Tries paper rotation when orientation === 'auto'.
 */
export function packSubjects(
  subjects: Subject[],
  opts: PackOptions,
): SheetLayout {
  const gapMm = opts.gapMm ?? 2;
  const marginMm = opts.marginMm ?? 3;
  const orientation = opts.orientation ?? 'auto';
  const mode = opts.mode ?? 'fill';

  const candidates: Array<{ w: number; h: number; rotated: boolean }> = [];
  if (orientation === 'portrait' || orientation === 'auto') {
    candidates.push({
      w: opts.paperWidthMm,
      h: opts.paperHeightMm,
      rotated: false,
    });
  }
  if (orientation === 'landscape' || orientation === 'auto') {
    if (
      opts.paperWidthMm !== opts.paperHeightMm ||
      orientation === 'landscape'
    ) {
      candidates.push({
        w: opts.paperHeightMm,
        h: opts.paperWidthMm,
        rotated: true,
      });
    }
  }

  let best: SheetLayout | null = null;

  for (const c of candidates) {
    const items = buildItems(subjects, c.w, c.h, gapMm, marginMm, mode);
    const cells = shelfPack(items, c.w, c.h, gapMm, marginMm);
    const layout: SheetLayout = {
      paperWidthMm: c.w,
      paperHeightMm: c.h,
      gapMm,
      marginMm,
      rotated: c.rotated,
      cells,
    };
    if (!best || cells.length > best.cells.length) {
      best = layout;
    } else if (cells.length === best.cells.length) {
      if (usedArea(cells) > usedArea(best.cells)) best = layout;
    }
  }

  return best!;
}

function usedArea(cells: PlacedCell[]): number {
  return cells.reduce((s, c) => s + c.widthMm * c.heightMm, 0);
}

function buildItems(
  subjects: Subject[],
  paperW: number,
  paperH: number,
  gapMm: number,
  marginMm: number,
  mode: 'fill' | 'exact',
): Item[] {
  const ready = subjects.filter((s) => s.url);
  if (ready.length === 0) return [];

  if (mode === 'exact') {
    const items: Item[] = [];
    for (const s of ready) {
      const n = Math.max(1, Math.floor(s.copies));
      for (let i = 0; i < n; i++) {
        items.push(itemFrom(s));
      }
    }
    return items;
  }

  // Auto / fill — pack as many as fit (ignores Need N). Recomputes when paper/size changes.
  const items: Item[] = ready.map((s) => itemFrom(s));
  let packed = shelfPack(items, paperW, paperH, gapMm, marginMm);
  while (items.length > packed.length) items.pop();

  let idx = 0;
  for (let guard = 0; guard < 200; guard++) {
    const s = ready[idx % ready.length]!;
    idx += 1;
    const trial = [...items, itemFrom(s)];
    const next = shelfPack(trial, paperW, paperH, gapMm, marginMm);
    if (next.length <= packed.length) {
      if (idx % ready.length === 0) break;
      continue;
    }
    items.push(trial[trial.length - 1]!);
    packed = next;
  }

  return items;
}

function itemFrom(s: Subject): Item {
  return {
    subjectId: s.id,
    widthMm: s.widthMm,
    heightMm: s.heightMm,
    crop: { ...s.crop },
  };
}

function shelfPack(
  items: Item[],
  paperW: number,
  paperH: number,
  gapMm: number,
  marginMm: number,
): PlacedCell[] {
  const availW = paperW - marginMm * 2;
  const availH = paperH - marginMm * 2;
  if (availW <= 0 || availH <= 0) return [];

  const ordered = items
    .map((it, i) => ({ it, i }))
    .sort((a, b) => {
      const ah = Math.max(a.it.heightMm, a.it.widthMm);
      const bh = Math.max(b.it.heightMm, b.it.widthMm);
      if (bh !== ah) return bh - ah;
      return a.i - b.i;
    })
    .map((x) => x.it);

  const cells: PlacedCell[] = [];
  let cursorX = 0;
  let cursorY = 0;
  let shelfH = 0;

  for (const it of ordered) {
    const orients = [
      { w: it.widthMm, h: it.heightMm },
      { w: it.heightMm, h: it.widthMm },
    ];

    let placed = false;

    // Try current shelf first
    for (const o of orients) {
      if (o.w > availW + 0.01 || o.h > availH + 0.01) continue;

      let x = cursorX;
      let y = cursorY;
      let nextShelfH = Math.max(shelfH, o.h);

      if (cells.length > 0 && x + o.w > availW + 0.01) {
        y = cursorY + shelfH + gapMm;
        x = 0;
        nextShelfH = o.h;
      }

      if (y + o.h > availH + 0.01) continue;

      cells.push({
        id: uid('cell'),
        subjectId: it.subjectId,
        xMm: marginMm + x,
        yMm: marginMm + y,
        widthMm: o.w,
        heightMm: o.h,
        crop: { ...it.crop },
      });
      cursorX = x + o.w + gapMm;
      cursorY = y;
      shelfH = nextShelfH;
      placed = true;
      break;
    }

    if (placed) continue;

    // Fresh shelf from left
    for (const o of orients) {
      if (o.w > availW + 0.01 || o.h > availH + 0.01) continue;
      const y = cells.length === 0 ? 0 : cursorY + shelfH + gapMm;
      if (y + o.h > availH + 0.01) continue;
      cells.push({
        id: uid('cell'),
        subjectId: it.subjectId,
        xMm: marginMm,
        yMm: marginMm + y,
        widthMm: o.w,
        heightMm: o.h,
        crop: { ...it.crop },
      });
      cursorX = o.w + gapMm;
      cursorY = y;
      shelfH = o.h;
      placed = true;
      break;
    }
  }

  return centerPack(cells, paperW, paperH, marginMm);
}

function centerPack(
  cells: PlacedCell[],
  paperW: number,
  paperH: number,
  marginMm: number,
): PlacedCell[] {
  if (cells.length === 0) return cells;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const c of cells) {
    minX = Math.min(minX, c.xMm);
    minY = Math.min(minY, c.yMm);
    maxX = Math.max(maxX, c.xMm + c.widthMm);
    maxY = Math.max(maxY, c.yMm + c.heightMm);
  }
  const packW = maxX - minX;
  const packH = maxY - minY;
  const availW = paperW - marginMm * 2;
  const availH = paperH - marginMm * 2;
  const dx = marginMm + (availW - packW) / 2 - minX;
  const dy = marginMm + (availH - packH) / 2 - minY;
  return cells.map((c) => ({
    ...c,
    xMm: c.xMm + dx,
    yMm: c.yMm + dy,
  }));
}

export function hitTestCell(
  layout: SheetLayout,
  xMm: number,
  yMm: number,
): PlacedCell | null {
  for (let i = layout.cells.length - 1; i >= 0; i--) {
    const c = layout.cells[i];
    if (
      xMm >= c.xMm &&
      xMm <= c.xMm + c.widthMm &&
      yMm >= c.yMm &&
      yMm <= c.yMm + c.heightMm
    ) {
      return c;
    }
  }
  return null;
}
