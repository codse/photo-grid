import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { hitTestCell, packSubjects } from './lib/layout.ts';
import {
  DEFAULT_PAPER_ID,
  DEFAULT_PHOTO_ID,
  PAPER_PRESETS,
  PHOTO_PRESETS,
} from './lib/presets.ts';
import {
  downloadPdf,
  downloadPng,
  panCropByPixels,
  pointerToMm,
  printSheet,
  renderPortrait,
  renderSheet,
} from './lib/render.ts';
import {
  DEFAULT_ADJUST,
  DEFAULT_CROP,
  type PlacedCell,
  type Subject,
  uid,
} from './lib/types.ts';
import { formatSize, mmToPx } from './lib/units.ts';
import './app.css';

type Step = 'upload' | 'crop' | 'adjust' | 'sheet';

const STEPS: { id: Step; label: string }[] = [
  { id: 'upload', label: 'Upload' },
  { id: 'crop', label: 'Crop' },
  { id: 'adjust', label: 'Adjust' },
  { id: 'sheet', label: 'Sheet' },
];

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function defaultSize() {
  const p = PHOTO_PRESETS.find((x) => x.id === DEFAULT_PHOTO_ID)!;
  return { widthMm: p.widthMm, heightMm: p.heightMm };
}

function newSubject(partial?: Partial<Subject>): Subject {
  const size = defaultSize();
  return {
    id: uid('person'),
    label: 'Person 1',
    url: '',
    widthMm: size.widthMm,
    heightMm: size.heightMm,
    copies: 1,
    crop: { ...DEFAULT_CROP },
    adjust: { ...DEFAULT_ADJUST },
    ...partial,
  };
}

export default function App() {
  const [step, setStep] = useState<Step>('upload');
  const [subjects, setSubjects] = useState<Subject[]>(() => [
    newSubject({ label: 'Person 1' }),
  ]);
  const [images, setImages] = useState<Map<string, HTMLImageElement>>(
    () => new Map(),
  );
  const [paperId, setPaperId] = useState(DEFAULT_PAPER_ID);
  const [gapMm, setGapMm] = useState(2);
  const [marginMm, setMarginMm] = useState(3);
  const [orientation, setOrientation] = useState<
    'auto' | 'portrait' | 'landscape'
  >('auto');
  const [packMode, setPackMode] = useState<'fill' | 'exact'>('fill');
  const [cells, setCells] = useState<PlacedCell[]>([]);
  const [paperW, setPaperW] = useState(PAPER_PRESETS[1].widthMm);
  const [paperH, setPaperH] = useState(PAPER_PRESETS[1].heightMm);
  const [rotated, setRotated] = useState(false);
  const [selectedCellId, setSelectedCellId] = useState<string | null>(null);
  const [activePersonId, setActivePersonId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const portraitRef = useRef<HTMLCanvasElement>(null);
  const sheetRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedIndexRef = useRef(0);
  const cropMemory = useRef<Map<string, PlacedCell['crop']>>(new Map());
  const dragRef = useRef<{
    mode: 'portrait' | 'sheet';
    cellId?: string;
    subjectId: string;
    lastX: number;
    lastY: number;
    crop: PlacedCell['crop'];
    imgW: number;
    imgH: number;
    cellW: number;
    cellH: number;
  } | null>(null);

  const paper = PAPER_PRESETS.find((p) => p.id === paperId)!;
  const photoGroups = useMemo(
    () => [...new Set(PHOTO_PRESETS.map((p) => p.group))] as string[],
    [],
  );

  const primary = subjects[0];
  const activeId = activePersonId ?? primary?.id;
  const active = subjects.find((s) => s.id === activeId) ?? primary;
  const activeImg = active ? images.get(active.id) : undefined;
  const hasPhotos = subjects.some((s) => s.url);
  const stepIndex = STEPS.findIndex((s) => s.id === step);

  const packKey = useMemo(
    () =>
      JSON.stringify({
        paperId,
        gapMm,
        marginMm,
        orientation,
        packMode,
        people: subjects.map((s) => ({
          id: s.id,
          url: s.url,
          w: s.widthMm,
          h: s.heightMm,
          copies: s.copies,
          crop: s.crop,
        })),
      }),
    [subjects, paperId, gapMm, marginMm, orientation, packMode],
  );

  useEffect(() => {
    let pw = paper.widthMm;
    let ph = paper.heightMm;
    if (paperId === 'single') {
      const s = subjects.find((x) => x.url) ?? subjects[0];
      pw = s.widthMm;
      ph = s.heightMm;
    }

    const packed = packSubjects(subjects, {
      paperWidthMm: pw,
      paperHeightMm: ph,
      gapMm,
      marginMm,
      orientation,
      mode: packMode,
    });

    const counters = new Map<string, number>();
    const nextCells = packed.cells.map((c) => {
      const n = counters.get(c.subjectId) ?? 0;
      counters.set(c.subjectId, n + 1);
      const key = `${c.subjectId}#${n}`;
      const remembered = cropMemory.current.get(key);
      return remembered ? { ...c, crop: { ...remembered } } : c;
    });

    cropMemory.current.clear();
    counters.clear();
    for (const c of nextCells) {
      const n = counters.get(c.subjectId) ?? 0;
      counters.set(c.subjectId, n + 1);
      cropMemory.current.set(`${c.subjectId}#${n}`, { ...c.crop });
    }

    setCells(nextCells);
    setPaperW(packed.paperWidthMm);
    setPaperH(packed.paperHeightMm);
    setRotated(packed.rotated);
    if (!nextCells.length) {
      setSelectedCellId(null);
    } else {
      const safe = Math.min(
        Math.max(0, selectedIndexRef.current),
        nextCells.length - 1,
      );
      selectedIndexRef.current = safe;
      setSelectedCellId(nextCells[safe].id);
    }
  }, [packKey]);

  useEffect(() => {
    if (!selectedCellId) return;
    const idx = cells.findIndex((c) => c.id === selectedCellId);
    if (idx >= 0) selectedIndexRef.current = idx;
  }, [selectedCellId, cells]);

  const layout = useMemo(
    () => ({
      paperWidthMm: paperW,
      paperHeightMm: paperH,
      gapMm,
      marginMm,
      rotated,
      cells,
    }),
    [paperW, paperH, gapMm, marginMm, rotated, cells],
  );

  // Portrait preview (crop + adjust steps)
  useEffect(() => {
    const canvas = portraitRef.current;
    if (!canvas || !active || !activeImg) return;
    if (step !== 'crop' && step !== 'adjust') return;
    renderPortrait(
      canvas,
      activeImg,
      active.widthMm,
      active.heightMm,
      active.crop,
      active.adjust,
      { dpi: 160, showGuide: step === 'crop' },
    );
  }, [active, activeImg, step]);

  // Sheet preview
  useEffect(() => {
    const canvas = sheetRef.current;
    if (!canvas || !hasPhotos || step !== 'sheet') return;
    renderSheet(canvas, layout, {
      dpi: 120,
      showGuides: true,
      selectedCellId,
      images,
      subjects,
    });
  }, [layout, images, subjects, selectedCellId, hasPhotos, step]);

  const updateSubject = (id: string, patch: Partial<Subject>) => {
    setSubjects((list) =>
      list.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    );
  };

  const setSubjectFile = async (id: string, file: File | undefined) => {
    if (!file || !file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    setSubjects((list) =>
      list.map((s) => {
        if (s.id !== id) return s;
        if (s.url) URL.revokeObjectURL(s.url);
        return { ...s, url, crop: { ...DEFAULT_CROP } };
      }),
    );
    const img = await loadImage(url);
    setImages((prev) => {
      const next = new Map(prev);
      next.set(id, img);
      return next;
    });
    setActivePersonId(id);
  };

  const onPrimaryUpload = async (file: File | undefined) => {
    const targetId = activeId ?? primary.id;
    await setSubjectFile(targetId, file);
    if (file?.type.startsWith('image/')) setStep('crop');
  };

  const addPerson = () => {
    const n = subjects.length + 1;
    const s = newSubject({ label: `Person ${n}` });
    setSubjects((list) => [...list, s]);
    setActivePersonId(s.id);
    setStep('upload');
  };

  const removePerson = (id: string) => {
    if (subjects.length <= 1) return;
    setSubjects((list) => {
      const s = list.find((x) => x.id === id);
      if (s?.url) URL.revokeObjectURL(s.url);
      return list.filter((x) => x.id !== id);
    });
    setImages((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
    setActivePersonId((cur) => (cur === id ? subjects[0]?.id : cur));
  };

  const syncCropToCells = useCallback((subjectId: string, crop: PlacedCell['crop']) => {
    setSubjects((list) =>
      list.map((s) => (s.id === subjectId ? { ...s, crop: { ...crop } } : s)),
    );
    setCells((prev) => {
      const next = prev.map((c) =>
        c.subjectId === subjectId ? { ...c, crop: { ...crop } } : c,
      );
      const counters = new Map<string, number>();
      cropMemory.current.clear();
      for (const c of next) {
        const n = counters.get(c.subjectId) ?? 0;
        counters.set(c.subjectId, n + 1);
        cropMemory.current.set(`${c.subjectId}#${n}`, { ...c.crop });
      }
      return next;
    });
  }, []);

  const updateCellCrop = useCallback((cellId: string, crop: PlacedCell['crop']) => {
    setCells((prev) => {
      const next = prev.map((c) => (c.id === cellId ? { ...c, crop } : c));
      const counters = new Map<string, number>();
      cropMemory.current.clear();
      for (const c of next) {
        const n = counters.get(c.subjectId) ?? 0;
        counters.set(c.subjectId, n + 1);
        cropMemory.current.set(`${c.subjectId}#${n}`, { ...c.crop });
      }
      return next;
    });
  }, []);

  const startPortraitDrag = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!active || !activeImg) return;
    const canvas = portraitRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    const dpi = 160;
    dragRef.current = {
      mode: 'portrait',
      subjectId: active.id,
      lastX: e.clientX,
      lastY: e.clientY,
      crop: { ...active.crop },
      imgW: activeImg.width,
      imgH: activeImg.height,
      cellW: mmToPx(active.widthMm, dpi),
      cellH: mmToPx(active.heightMm, dpi),
    };
  };

  const startSheetDrag = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = sheetRef.current;
    if (!canvas) return;
    const { xMm, yMm } = pointerToMm(
      canvas,
      e.clientX,
      e.clientY,
      layout.paperWidthMm,
      layout.paperHeightMm,
    );
    const hit = hitTestCell(layout, xMm, yMm);
    if (!hit) {
      setSelectedCellId(null);
      return;
    }
    setSelectedCellId(hit.id);
    setActivePersonId(hit.subjectId);
    const img = images.get(hit.subjectId);
    if (!img) return;
    canvas.setPointerCapture(e.pointerId);
    const dpi = 120;
    dragRef.current = {
      mode: 'sheet',
      cellId: hit.id,
      subjectId: hit.subjectId,
      lastX: e.clientX,
      lastY: e.clientY,
      crop: { ...hit.crop },
      imgW: img.width,
      imgH: img.height,
      cellW: mmToPx(hit.widthMm, dpi),
      cellH: mmToPx(hit.heightMm, dpi),
    };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    const canvas =
      drag?.mode === 'portrait' ? portraitRef.current : sheetRef.current;
    if (!drag || !canvas) return;

    const dx = e.clientX - drag.lastX;
    const dy = e.clientY - drag.lastY;
    drag.lastX = e.clientX;
    drag.lastY = e.clientY;

    const rect = canvas.getBoundingClientRect();
    const dCanvasX = dx * (canvas.width / rect.width);
    const dCanvasY = dy * (canvas.height / rect.height);
    const next = panCropByPixels(
      drag.crop,
      drag.imgW,
      drag.imgH,
      drag.cellW,
      drag.cellH,
      dCanvasX,
      dCanvasY,
    );
    drag.crop = next;

    if (drag.mode === 'portrait') {
      syncCropToCells(drag.subjectId, next);
    } else if (drag.cellId) {
      updateCellCrop(drag.cellId, next);
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    dragRef.current = null;
    try {
      (e.target as HTMLCanvasElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  // Wheel zoom on active canvas
  useEffect(() => {
    const canvas =
      step === 'sheet' ? sheetRef.current : portraitRef.current;
    if (!canvas) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      if (step === 'sheet') {
        if (!selectedCellId) return;
        setCells((prev) => {
          const cell = prev.find((c) => c.id === selectedCellId);
          if (!cell) return prev;
          const delta = e.deltaY > 0 ? -0.05 : 0.05;
          const zoom = Math.max(1, Math.min(3, cell.crop.zoom + delta));
          const crop = { ...cell.crop, zoom };
          const next = prev.map((c) =>
            c.id === selectedCellId ? { ...c, crop } : c,
          );
          const counters = new Map<string, number>();
          cropMemory.current.clear();
          for (const c of next) {
            const n = counters.get(c.subjectId) ?? 0;
            counters.set(c.subjectId, n + 1);
            cropMemory.current.set(`${c.subjectId}#${n}`, { ...c.crop });
          }
          return next;
        });
      } else if (active) {
        const delta = e.deltaY > 0 ? -0.05 : 0.05;
        const zoom = Math.max(1, Math.min(3, active.crop.zoom + delta));
        syncCropToCells(active.id, { ...active.crop, zoom });
      }
    };
    canvas.addEventListener('wheel', handler, { passive: false });
    return () => canvas.removeEventListener('wheel', handler);
  }, [step, selectedCellId, active, syncCropToCells]);

  const runExport = async (fn: () => Promise<void> | void) => {
    if (!hasPhotos) return;
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  const canGo = (target: Step) => {
    const ti = STEPS.findIndex((s) => s.id === target);
    if (ti <= stepIndex) return true;
    if (!primary.url) return false;
    if (ti >= 1 && !primary.url) return false;
    return hasPhotos;
  };

  const goNext = () => {
    const next = STEPS[stepIndex + 1];
    if (next && canGo(next.id)) setStep(next.id);
  };

  const goBack = () => {
    const prev = STEPS[stepIndex - 1];
    if (prev) setStep(prev.id);
  };

  const sizeSelectValue =
    PHOTO_PRESETS.find(
      (p) =>
        active &&
        Math.abs(p.widthMm - active.widthMm) < 0.05 &&
        Math.abs(p.heightMm - active.heightMm) < 0.05,
    )?.id ?? 'custom';

  const selectedCell = cells.find((c) => c.id === selectedCellId) ?? null;
  const countsBySubject = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of cells) m.set(c.subjectId, (m.get(c.subjectId) ?? 0) + 1);
    return m;
  }, [cells]);

  return (
    <div className="app wizard">
      <header className="top">
        <div className="brand">
          <span className="mark" aria-hidden />
          <div>
            <h1>SheetFit</h1>
            <p className="tag">Passport photo sheets · offline</p>
          </div>
        </div>

        <nav className="stepper" aria-label="Steps">
          {STEPS.map((s, i) => {
            const unlocked = canGo(s.id) || i <= stepIndex;
            const done = i < stepIndex;
            return (
              <button
                key={s.id}
                type="button"
                className={`step ${step === s.id ? 'current' : ''} ${done ? 'done' : ''}`}
                disabled={!unlocked}
                onClick={() => unlocked && setStep(s.id)}
              >
                <span className="step-num">{i + 1}</span>
                <span className="step-label">{s.label}</span>
              </button>
            );
          })}
        </nav>
      </header>

      <main className="wizard-main">
        <div className="people-bar" aria-label="People on this sheet">
          <div className="people-bar-head">
            <span className="people-bar-title">People on sheet</span>
            <span className="meta">
              {subjects.filter((s) => s.url).length}/{subjects.length} ready
            </span>
          </div>
          <div className="people-bar-row">
            {subjects.map((s, i) => (
              <button
                key={s.id}
                type="button"
                className={`person-pill ${active?.id === s.id ? 'on' : ''} ${s.url ? 'ready' : 'needs'}`}
                onClick={() => {
                  setActivePersonId(s.id);
                  if (!s.url) setStep('upload');
                }}
              >
                {s.url ? (
                  <img src={s.url} alt="" className="pill-thumb" />
                ) : (
                  <span className="pill-placeholder" aria-hidden>
                    {i + 1}
                  </span>
                )}
                <span className="pill-label">{s.label}</span>
                {!s.url && <span className="pill-badge">needs photo</span>}
              </button>
            ))}
            <button
              type="button"
              className="btn person-add"
              onClick={addPerson}
            >
              + Add person
            </button>
            {subjects.length > 1 && active && (
              <button
                type="button"
                className="btn link danger"
                onClick={() => removePerson(active.id)}
              >
                Remove {active.label}
              </button>
            )}
          </div>
        </div>

        {/* ─── UPLOAD ─── */}
        {step === 'upload' && (
          <section className="stage stage-upload">
            <div className="stage-copy">
              <h2>
                Upload
                {subjects.length > 1 && active ? ` · ${active.label}` : ''}
              </h2>
              <p>
                Pick the ID size for this person, then drop their photo. Add more
                people anytime from the bar above.
              </p>

              <label className="field">
                Photo size
                <select
                  value={sizeSelectValue}
                  onChange={(e) => {
                    const p = PHOTO_PRESETS.find((x) => x.id === e.target.value);
                    if (!p || !active) return;
                    updateSubject(active.id, {
                      widthMm: p.widthMm,
                      heightMm: p.heightMm,
                    });
                  }}
                >
                  {photoGroups.map((g) => (
                    <optgroup key={g} label={g}>
                      {PHOTO_PRESETS.filter((p) => p.group === g).map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>
              <p className="meta">
                {active
                  ? formatSize(active.widthMm, active.heightMm)
                  : ''}
              </p>

              <div
                className={`dropzone hero ${dragOver ? 'over' : ''} ${(active?.url || primary.url) ? 'has' : ''}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  void onPrimaryUpload(e.dataTransfer.files[0]);
                }}
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => void onPrimaryUpload(e.target.files?.[0])}
                />
                {active?.url || primary.url ? (
                  <img src={active?.url || primary.url} alt="Uploaded" className="thumb" />
                ) : (
                  <div className="drop-copy">
                    <strong>Drop photo here</strong>
                    <span>or click to browse · JPG / PNG</span>
                  </div>
                )}
              </div>

              {(active?.url || primary.url) && (
                <div className="stage-actions">
                  <button type="button" className="btn primary" onClick={goNext}>
                    Continue to crop
                  </button>
                </div>
              )}
            </div>

            <aside className="stage-aside">
              <ol className="howto">
                <li>
                  <strong>Upload</strong> a clear photo
                </li>
                <li>
                  <strong>Crop</strong> to frame the face
                </li>
                <li>
                  <strong>Adjust</strong> lighting
                </li>
                <li>
                  <strong>Sheet</strong> — pack &amp; download for print
                </li>
              </ol>
              <p className="aside-note">No uploads. Works offline after first visit.</p>
            </aside>
          </section>
        )}

        {/* ─── CROP ─── */}
        {step === 'crop' && active && (
          <section className="stage stage-split">
            <div className="stage-tools">
              <h2>Crop</h2>
              <p className="hint-line">
                Drag to position · scroll to zoom. Guide oval ≈ head area.
              </p>

              {subjects.length > 1 && (
                <div className="person-tabs">
                  {subjects.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className={`chip ${active.id === s.id ? 'on' : ''}`}
                      onClick={() => setActivePersonId(s.id)}
                      disabled={!s.url}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              )}

              <label>
                Zoom {active.crop.zoom.toFixed(2)}×
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.01}
                  value={active.crop.zoom}
                  onChange={(e) =>
                    syncCropToCells(active.id, {
                      ...active.crop,
                      zoom: Number(e.target.value),
                    })
                  }
                />
              </label>
              <button
                type="button"
                className="btn link"
                onClick={() => syncCropToCells(active.id, { ...DEFAULT_CROP })}
              >
                Reset crop
              </button>

              <div className="stage-actions dual">
                <button type="button" className="btn ghost" onClick={goBack}>
                  Back
                </button>
                <button type="button" className="btn primary" onClick={goNext}>
                  Continue
                </button>
              </div>
            </div>

            <div className="stage-preview">
              {activeImg ? (
                <canvas
                  ref={portraitRef}
                  className="portrait interactive"
                  onPointerDown={startPortraitDrag}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={onPointerUp}
                />
              ) : (
                <p className="hint">Upload a photo for this person first</p>
              )}
              <p className="preview-meta center">
                {formatSize(active.widthMm, active.heightMm)}
              </p>
            </div>
          </section>
        )}

        {/* ─── ADJUST ─── */}
        {step === 'adjust' && active && (
          <section className="stage stage-split">
            <div className="stage-tools">
              <h2>Adjust</h2>
              <p className="hint-line">
                Tweak lighting. Add another person if you need mixed photos on one
                sheet.
              </p>

              {subjects.length > 1 && (
                <div className="person-tabs">
                  {subjects.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className={`chip ${active.id === s.id ? 'on' : ''}`}
                      onClick={() => setActivePersonId(s.id)}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              )}

              <label>
                Brightness {active.adjust.brightness.toFixed(2)}
                <input
                  type="range"
                  min={0.5}
                  max={1.5}
                  step={0.01}
                  value={active.adjust.brightness}
                  onChange={(e) =>
                    updateSubject(active.id, {
                      adjust: {
                        ...active.adjust,
                        brightness: Number(e.target.value),
                      },
                    })
                  }
                />
              </label>
              <label>
                Contrast {active.adjust.contrast.toFixed(2)}
                <input
                  type="range"
                  min={0.5}
                  max={1.5}
                  step={0.01}
                  value={active.adjust.contrast}
                  onChange={(e) =>
                    updateSubject(active.id, {
                      adjust: {
                        ...active.adjust,
                        contrast: Number(e.target.value),
                      },
                    })
                  }
                />
              </label>

              <p className="hint-line">
                Need a family / multi-size sheet? Use <strong>+ Add person</strong>{' '}
                in the bar above — each person can have a different size.
              </p>

              <div className="stage-actions dual">
                <button type="button" className="btn ghost" onClick={goBack}>
                  Back
                </button>
                <button type="button" className="btn primary" onClick={goNext}>
                  Build print sheet
                </button>
              </div>
            </div>

            <div className="stage-preview">
              {activeImg ? (
                <canvas
                  ref={portraitRef}
                  className="portrait"
                  onPointerDown={startPortraitDrag}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={onPointerUp}
                />
              ) : (
                <p className="hint">No photo yet</p>
              )}
            </div>
          </section>
        )}

        {/* ─── SHEET ─── */}
        {step === 'sheet' && (
          <section className="stage stage-split sheet-stage">
            <div className="stage-tools">
              <h2>Print sheet</h2>
              <p className="hint-line">
                Choose paper. Drag any cell to fine-tune. Then download.
              </p>

              <div className="chips">
                {PAPER_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`chip ${paperId === p.id ? 'on' : ''}`}
                    onClick={() => setPaperId(p.id)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <p className="meta">
                {cells.length} photos · {formatSize(paperW, paperH)}
                {rotated ? ' · rotated' : ''}
              </p>

              <div className="stat">
                <strong>{cells.length}</strong>
                <span>
                  on sheet · {subjects.filter((s) => s.url).length} people
                </span>
              </div>

              {subjects.map((s) => (
                <p key={s.id} className="meta">
                  {s.label}: {countsBySubject.get(s.id) ?? 0}×{' '}
                  {formatSize(s.widthMm, s.heightMm)}
                </p>
              ))}

              <button
                type="button"
                className="btn link"
                onClick={() => setShowAdvanced((v) => !v)}
              >
                {showAdvanced ? 'Hide' : 'Show'} advanced layout
              </button>

              {showAdvanced && (
                <div className="advanced">
                  <label>
                    Pack mode
                    <select
                      value={packMode}
                      onChange={(e) =>
                        setPackMode(e.target.value as 'fill' | 'exact')
                      }
                    >
                      <option value="fill">Fill sheet</option>
                      <option value="exact">Exact copies</option>
                    </select>
                  </label>
                  {packMode === 'exact' &&
                    subjects.map((s) => (
                      <label key={s.id}>
                        Copies · {s.label}
                        <input
                          type="number"
                          min={0}
                          max={40}
                          value={s.copies}
                          onChange={(e) =>
                            updateSubject(s.id, {
                              copies: Math.max(0, Number(e.target.value)),
                            })
                          }
                        />
                      </label>
                    ))}
                  <label>
                    Orientation
                    <select
                      value={orientation}
                      onChange={(e) =>
                        setOrientation(e.target.value as typeof orientation)
                      }
                    >
                      <option value="auto">Auto</option>
                      <option value="portrait">Portrait</option>
                      <option value="landscape">Landscape</option>
                    </select>
                  </label>
                  <label>
                    Gap {gapMm.toFixed(1)} mm
                    <input
                      type="range"
                      min={0}
                      max={8}
                      step={0.5}
                      value={gapMm}
                      onChange={(e) => setGapMm(Number(e.target.value))}
                    />
                  </label>
                  <label>
                    Margin {marginMm.toFixed(1)} mm
                    <input
                      type="range"
                      min={0}
                      max={15}
                      step={0.5}
                      value={marginMm}
                      onChange={(e) => setMarginMm(Number(e.target.value))}
                    />
                  </label>
                </div>
              )}

              {selectedCell && (
                <div className="cell-tools">
                  <p className="meta">
                    Selected cell · zoom {selectedCell.crop.zoom.toFixed(2)}×
                  </p>
                  <label>
                    Zoom
                    <input
                      type="range"
                      min={1}
                      max={3}
                      step={0.01}
                      value={selectedCell.crop.zoom}
                      onChange={(e) =>
                        updateCellCrop(selectedCell.id, {
                          ...selectedCell.crop,
                          zoom: Number(e.target.value),
                        })
                      }
                    />
                  </label>
                  <button
                    type="button"
                    className="btn link"
                    onClick={() => {
                      const sub = subjects.find(
                        (s) => s.id === selectedCell.subjectId,
                      );
                      if (!sub) return;
                      syncCropToCells(sub.id, selectedCell.crop);
                    }}
                  >
                    Apply this crop to all of person
                  </button>
                </div>
              )}

              <div className="export-row">
                <button
                  type="button"
                  className="btn ghost"
                  disabled={busy || !hasPhotos}
                  onClick={() =>
                    runExport(() => printSheet(layout, images, subjects))
                  }
                >
                  Print
                </button>
                <button
                  type="button"
                  className="btn ghost"
                  disabled={busy || !hasPhotos}
                  onClick={() =>
                    runExport(() =>
                      downloadPng(
                        layout,
                        images,
                        subjects,
                        `sheetfit-${paper.id}.png`,
                      ),
                    )
                  }
                >
                  PNG
                </button>
                <button
                  type="button"
                  className="btn primary"
                  disabled={busy || !hasPhotos}
                  onClick={() =>
                    runExport(() =>
                      downloadPdf(
                        layout,
                        images,
                        subjects,
                        `sheetfit-${paper.id}.pdf`,
                      ),
                    )
                  }
                >
                  Download PDF
                </button>
              </div>

              <div className="stage-actions">
                <button type="button" className="btn ghost" onClick={goBack}>
                  Back
                </button>
              </div>
            </div>

            <div className="stage-preview sheet-preview">
              {hasPhotos ? (
                <canvas
                  ref={sheetRef}
                  className="sheet interactive"
                  onPointerDown={startSheetDrag}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={onPointerUp}
                />
              ) : (
                <p className="hint">No photos yet</p>
              )}
              <p className="preview-meta center">
                Drag cells to pan · scroll to zoom · 300 DPI export
              </p>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
