import { useEffect, useMemo, useState } from 'react';
import {
  Platform,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { PeopleStrip } from '@/features/people/people-strip';
import {
  SheetOptionsAccordion,
  SheetOptionsSidebar,
} from '@/features/sheet/sheet-options';
import { cssFilter, hasAdjustments } from '@/core/adjust-filter';
import { packSubjects } from '@/core/layout';
import { formatSize } from '@/core/units';
import { getPaperSize, useSession } from '@/state/session';
import { loadImageSource, type ImageSource } from '@/platform/render-sheet';
import { Button, ScreenIntro } from '@/ui/primitives';
import { colors, radii, space, type } from '@/ui/tokens';
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
  const { width: winW } = useWindowDimensions();
  const wide = winW >= WIDE_MIN;
  const subjects = useSession((s) => s.subjects);
  const paperId = useSession((s) => s.paperId);
  const packMode = useSession((s) => s.packMode);
  const orientation = useSession((s) => s.orientation);
  const gapMm = useSession((s) => s.gapMm);
  const marginMm = useSession((s) => s.marginMm);
  const cutGuides = useSession((s) => s.cutGuides);

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

  const mainMax = wide
    ? Math.min(winW - 320 - 48 - 24, 480)
    : Math.min(winW - 48, 420);
  const previewW = Math.min(mainMax, 480);
  const previewH =
    previewW * (layout.paperHeightMm / Math.max(layout.paperWidthMm, 1));

  const primary = (
    <View style={{ gap: space.lg, flex: 1, minWidth: 0 }}>
      <ScreenIntro
        title="Print sheet"
        body="Preview updates live. Packing (auto fill or Need N) lives with size & paper in Customize."
      />

      {!wide ? <SheetOptionsAccordion defaultOpen /> : null}

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
          const filter =
            Platform.OS === 'web' &&
            subject?.adjust &&
            hasAdjustments(subject.adjust)
              ? cssFilter(subject.adjust)
              : undefined;
          return (
            <View
              key={cell.id}
              style={{
                position: 'absolute',
                left,
                top,
                width: w,
                height: h,
                overflow: 'hidden',
                borderWidth: cutGuides ? 1 : 0,
                borderColor: 'rgba(0,0,0,0.2)',
                backgroundColor: colors.line,
              }}
            >
              {img ? (
                <Image
                  source={{ uri: img.uri }}
                  style={
                    {
                      width: '100%',
                      height: '100%',
                      ...(filter ? { filter } : {}),
                    } as never
                  }
                  contentFit="cover"
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
        {layout.cells.length} photos ·{' '}
        {formatSize(layout.paperWidthMm, layout.paperHeightMm)}
        {layout.rotated ? ' · rotated' : ''}
        {packMode === 'fill' ? ' · auto fill' : ' · custom count'}
      </Text>

      <Button
        label="Share & export"
        disabled={layout.cells.length === 0}
        onPress={() => router.push('/export')}
      />
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <PeopleStrip />
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
      </ScrollView>
    </View>
  );
}
