import { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Stack, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { PeopleStrip } from '@/features/people/people-strip';
import { usePersonPreviews } from '@/features/people/use-person-previews';
import { CroppedImagePreview } from '@/features/sheet/cropped-image-preview';
import {
  CustomizeHeaderButton,
  CustomizeSheet,
  CustomizeSummaryBar,
  SheetOptionsSidebar,
} from '@/features/sheet/sheet-options';
import { packSubjects } from '@/core/layout';
import { formatSize } from '@/core/units';
import { getPaperSize, useSession } from '@/state/session';
import { loadImageSource, type ImageSource } from '@/platform/render-sheet';
import { Button } from '@/ui/primitives';
import { colors, radii, space, type } from '@/ui/tokens';
import { AdBanner } from '@/monetization/ads';
import { RequirePhoto } from '@/features/session/require-photo';

const WIDE_MIN = 900;

export default function SheetScreen() {
  return (
    <RequirePhoto>
      <SheetBody />
    </RequirePhoto>
  );
}

function SheetBody() {
  const { t } = useTranslation();
  const { width: winW } = useWindowDimensions();
  const wide = winW >= WIDE_MIN;
  const subjects = useSession((s) => s.subjects);
  const paperId = useSession((s) => s.paperId);
  const packMode = useSession((s) => s.packMode);
  const orientation = useSession((s) => s.orientation);
  const gapMm = useSession((s) => s.gapMm);
  const marginMm = useSession((s) => s.marginMm);
  const cutGuides = useSession((s) => s.cutGuides);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  usePersonPreviews();

  const paper = getPaperSize(paperId);
  const [images, setImages] = useState<Map<string, ImageSource>>(new Map());

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

  // Full sources only for cells still waiting on a baked preview.
  const fallbackKey = useMemo(
    () =>
      subjects
        .filter((s) => s.url && !s.previewUri)
        .map((s) => `${s.id}\0${s.url}`)
        .join('|'),
    [subjects],
  );

  useEffect(() => {
    let cancelled = false;
    const needed = subjects
      .filter((s) => s.url && !s.previewUri)
      .map((s) => ({ id: s.id, url: s.url }));

    void (async () => {
      const results = await Promise.all(
        needed.map(async (s) => {
          try {
            return [s.id, await loadImageSource(s.url)] as const;
          } catch {
            return null;
          }
        }),
      );
      if (cancelled) return;
      setImages((prev) => {
        const next = new Map<string, ImageSource>();
        for (const row of results) {
          if (!row) continue;
          const [id, src] = row;
          // Reuse prior entry if same uri — avoid churn when sibling bakes finish.
          const old = prev.get(id);
          next.set(id, old?.uri === src.uri ? old : src);
        }
        return next;
      });
    })();
    return () => {
      cancelled = true;
    };
    // fallbackKey is the intentional dep; subjects read for current urls.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by fallbackKey
  }, [fallbackKey]);

  const mainMax = wide
    ? Math.min(winW - 320 - 48 - 24, 480)
    : Math.min(winW - 48, 420);
  const previewW = Math.min(mainMax, 480);
  const previewH =
    previewW * (layout.paperHeightMm / Math.max(layout.paperWidthMm, 1));

  const openCustomize = () => setCustomizeOpen(true);

  const primary = (
    <View style={{ gap: space.lg, flex: 1, minWidth: 0 }}>
      <View
        style={{
          alignSelf: wide ? 'flex-start' : 'center',
          width: previewW,
          height: previewH,
          backgroundColor: colors.paper,
          borderRadius: radii.sm,
          borderCurve: 'continuous',
          borderWidth: 1,
          borderColor: colors.line,
          overflow: 'hidden',
          boxShadow: '0 8px 24px rgba(28,27,25,0.08)',
        }}
      >
        {layout.cells.map((cell) => {
          const img = images.get(cell.subjectId);
          const subject = subjects.find((s) => s.id === cell.subjectId);
          const left = (cell.xMm / layout.paperWidthMm) * previewW;
          const top = (cell.yMm / layout.paperHeightMm) * previewH;
          const w = (cell.widthMm / layout.paperWidthMm) * previewW;
          const h = (cell.heightMm / layout.paperHeightMm) * previewH;
          const previewUri = subject?.previewUri;
          return (
            <View
              key={cell.id}
              style={{
                position: 'absolute',
                left,
                top,
                width: w,
                height: h,
                borderWidth: cutGuides ? 1 : 0,
                borderColor: 'rgba(0,0,0,0.2)',
                overflow: 'hidden',
                backgroundColor: colors.line,
              }}
            >
              {previewUri ? (
                <Image
                  source={{ uri: previewUri }}
                  style={{ width: w, height: h }}
                  contentFit="cover"
                  recyclingKey={previewUri}
                />
              ) : img ? (
                <CroppedImagePreview
                  uri={img.uri}
                  imgW={img.width}
                  imgH={img.height}
                  width={w}
                  height={h}
                  crop={cell.crop}
                  adjust={subject?.adjust}
                />
              ) : null}
            </View>
          );
        })}
      </View>

      <Text
        selectable
        style={{
          ...type.caption,
          color: colors.inkMuted,
          textAlign: wide ? 'left' : 'center',
        }}
      >
        {t('sheet.meta', {
          count: layout.cells.length,
          size: formatSize(layout.paperWidthMm, layout.paperHeightMm),
        })}
        {layout.rotated ? ` · ${t('sheet.rotated')}` : ''}
        {packMode === 'fill'
          ? ` · ${t('sheet.autoFill')}`
          : ` · ${t('sheet.customCount')}`}
      </Text>

      {!wide ? <CustomizeSummaryBar onPress={openCustomize} /> : null}

      <Button
        label={t('sheet.shareExport')}
        disabled={layout.cells.length === 0}
        onPress={() => router.push('/export')}
      />
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          title: t('sheet.title'),
          headerRight: () =>
            wide ? null : <CustomizeHeaderButton onPress={openCustomize} />,
        }}
      />
      <PeopleStrip captureMode="sheet" />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          padding: space.xl,
          paddingBottom: 56,
          gap: space.lg,
          ...(wide
            ? {
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: space.xl,
              }
            : null),
        }}
      >
        {primary}
        {wide ? <SheetOptionsSidebar /> : null}
        <AdBanner size="anchored" style={{ marginTop: space.sm }} />
      </ScrollView>

      {!wide ? (
        <CustomizeSheet
          visible={customizeOpen}
          onClose={() => setCustomizeOpen(false)}
        />
      ) : null}
    </View>
  );
}
