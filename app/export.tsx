import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { PeopleStrip } from '@/features/people/people-strip';
import { packSubjects } from '@/core/layout';
import { formatSize } from '@/core/units';
import { PAPER_PRESETS, PHOTO_PRESETS } from '@/core/presets';
import { getPaperSize, useSession } from '@/state/session';
import {
  exportAndSharePdf,
  exportAndSharePng,
  exportSheetPngBase64,
  loadImageSource,
  savePngToLibrary,
  type ImageSource,
} from '@/platform/render-sheet';
import { saveSheet, SAVED_SHEETS_AVAILABLE } from '@/platform/saved-sheets';
import { Button, ScreenIntro } from '@/ui/primitives';
import { colors, radii, space, type } from '@/ui/tokens';
import { RequirePhoto } from '@/features/session/require-photo';

export default function ExportScreen() {
  return (
    <RequirePhoto>
      <ExportBody />
    </RequirePhoto>
  );
}

function ExportBody() {
  const subjects = useSession((s) => s.subjects);
  const paperId = useSession((s) => s.paperId);
  const photoId = useSession((s) => s.photoId);
  const packMode = useSession((s) => s.packMode);
  const orientation = useSession((s) => s.orientation);
  const gapMm = useSession((s) => s.gapMm);
  const marginMm = useSession((s) => s.marginMm);
  const cutGuides = useSession((s) => s.cutGuides);
  const recordExportedConfig = useSession((s) => s.recordExportedConfig);

  const paper = getPaperSize(paperId);
  const [images, setImages] = useState<Map<string, ImageSource>>(new Map());
  const [busy, setBusy] = useState<string | null>(null);
  const [showPrintTip, setShowPrintTip] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  const layout = useMemo(
    () =>
      packSubjects(subjects, {
        paperWidthMm: paper.widthMm,
        paperHeightMm: paper.heightMm,
        gapMm,
        marginMm,
        orientation,
        mode: packMode,
      }),
    [subjects, paper, gapMm, marginMm, orientation, packMode],
  );

  const photoSummary = useMemo(() => {
    const named = subjects
      .filter((s) => s.url)
      .map((s) => s.label)
      .join(', ');
    const size =
      PHOTO_PRESETS.find((p) => p.id === photoId)?.label ??
      formatSize(
        subjects[0]?.widthMm ?? 35,
        subjects[0]?.heightMm ?? 45,
      );
    return named ? `${named} · ${size}` : size;
  }, [subjects, photoId]);

  const paperLabel =
    PAPER_PRESETS.find((p) => p.id === paperId)?.label ?? paperId;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const next = new Map<string, ImageSource>();
      for (const s of subjects) {
        if (!s.url) continue;
        try {
          next.set(s.id, await loadImageSource(s.url));
        } catch {
          // skip
        }
      }
      if (!cancelled) setImages(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [subjects]);

  const archive = useCallback(async () => {
    if (!SAVED_SHEETS_AVAILABLE) return null;
    const pngBase64 = await exportSheetPngBase64(
      layout,
      images,
      subjects,
      cutGuides,
    );
    const meta = await saveSheet({
      paperLabel,
      photoSummary,
      cellCount: layout.cells.length,
      pngBase64,
      title: `Sheet · ${new Date().toLocaleString()}`,
    });
    setSavedId(meta.id);
    return meta;
  }, [layout, images, subjects, cutGuides, paperLabel, photoSummary]);

  const run = async (label: string, fn: () => Promise<unknown>) => {
    setBusy(label);
    try {
      await fn();
      recordExportedConfig();
      if (SAVED_SHEETS_AVAILABLE && !savedId) {
        try {
          await archive();
        } catch {
          // archive failure shouldn't block share
        }
      }
      setShowPrintTip(true);
    } catch (e) {
      Alert.alert('Export failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <PeopleStrip />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          padding: space.xl,
          gap: space.lg,
          paddingBottom: 56,
        }}
      >
        <ScreenIntro
          title="Share"
          body={
            SAVED_SHEETS_AVAILABLE
              ? `${layout.cells.length} photos on ${formatSize(layout.paperWidthMm, layout.paperHeightMm)}. Exports are archived in Saved sheets.`
              : `${layout.cells.length} photos on ${formatSize(layout.paperWidthMm, layout.paperHeightMm)}. Download stays on this device.`
          }
        />

        <Button
          label={busy === 'png' ? 'Exporting PNG…' : 'Share / download PNG @ 300 DPI'}
          disabled={!!busy || layout.cells.length === 0}
          onPress={() =>
            run('png', () =>
              exportAndSharePng(layout, images, subjects, cutGuides),
            )
          }
        />
        <Button
          label={busy === 'pdf' ? 'Exporting PDF…' : 'Share / download PDF'}
          variant="secondary"
          disabled={!!busy || layout.cells.length === 0}
          onPress={() =>
            run('pdf', () =>
              exportAndSharePdf(layout, images, subjects, cutGuides),
            )
          }
        />
        <Button
          label={busy === 'save' ? 'Saving…' : 'Save PNG to Photos'}
          variant="secondary"
          disabled={!!busy || layout.cells.length === 0}
          onPress={() =>
            run('save', () =>
              savePngToLibrary(layout, images, subjects, cutGuides),
            )
          }
        />
        {SAVED_SHEETS_AVAILABLE ? (
          <Button
            label={
              busy === 'folder'
                ? 'Saving to folder…'
                : savedId
                  ? 'Saved to folder'
                  : 'Save to folder only'
            }
            variant="ghost"
            disabled={!!busy || layout.cells.length === 0 || !!savedId}
            onPress={() =>
              run('folder', async () => {
                await archive();
              })
            }
          />
        ) : null}

        {busy ? <ActivityIndicator color={colors.accent} /> : null}

        {SAVED_SHEETS_AVAILABLE && savedId ? (
          <Pressable onPress={() => router.push('/saved')}>
            <Text style={{ ...type.caption, color: colors.accent }}>
              View Saved sheets →
            </Text>
          </Pressable>
        ) : null}

        {showPrintTip ? (
          <View
            style={{
              padding: space.lg,
              backgroundColor: colors.accentSoft,
              borderRadius: radii.md,
              borderCurve: 'continuous',
              gap: space.sm,
            }}
          >
            <Text style={{ ...type.title, color: colors.ink, fontSize: 18 }}>
              Print tip
            </Text>
            <Text style={{ ...type.body, color: colors.ink }}>
              At CVS / Walgreens / home printers: choose matching paper size,
              turn off Fit / Crop / Borderless, print at Actual size (100%).
              Measure one photo before cutting the sheet.
            </Text>
          </View>
        ) : null}

        <Button
          label="Back to sheet"
          variant="ghost"
          onPress={() => router.back()}
        />
      </ScrollView>
    </View>
  );
}
