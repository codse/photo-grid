import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookmarkSimpleIcon } from 'phosphor-react-native/src/icons/BookmarkSimple';
import { ExportIcon } from 'phosphor-react-native/src/icons/Export';
import { ShareNetworkIcon } from 'phosphor-react-native/src/icons/ShareNetwork';
import { usePersonPreviews } from '@/features/people/use-person-previews';
import { packSubjects } from '@/core/layout';
import type { ExportImageExt } from '@/core/export-name';
import { formatSize } from '@/core/units';
import { PAPER_PRESETS, PHOTO_PRESETS } from '@/core/presets';
import { getPaperSize, useSession } from '@/state/session';
import {
  exportAndShareImage,
  exportSheetPngBase64,
  loadImageSource,
  saveImageToLibrary,
  type ImageSource,
} from '@/platform/render-sheet';
import {
  saveSheet,
  deleteSavedSheet,
  SAVED_SHEETS_AVAILABLE,
} from '@/platform/saved-sheets';
import { Button } from '@/ui/primitives';
import { colors, fonts, radii, space, type } from '@/ui/tokens';
import { RequirePhoto } from '@/features/session/require-photo';
import { showInterstitialIfNeeded } from '@/monetization/ads';
import { onExportSuccessEngagement } from '@/monetization/engagement';
import { canExportNow } from '@/monetization/free-limits';
import { openProPaywall } from '@/monetization/pro-route';
import { useTranslation } from 'react-i18next';

type Busy = 'save' | 'share' | 'bookmark' | null;
type ExportKind = 'save' | 'share';

export default function ExportScreen() {
  return (
    <RequirePhoto>
      <ExportBody />
    </RequirePhoto>
  );
}

function ExportBody() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const subjects = useSession((s) => s.subjects);
  const paperId = useSession((s) => s.paperId);
  const photoId = useSession((s) => s.photoId);
  const packMode = useSession((s) => s.packMode);
  const orientation = useSession((s) => s.orientation);
  usePersonPreviews();
  const gapMm = useSession((s) => s.gapMm);
  const marginMm = useSession((s) => s.marginMm);
  const cutGuides = useSession((s) => s.cutGuides);
  const exportDpi = useSession((s) => s.exportDpi);
  const exportFormat = useSession((s) => s.exportFormat);
  const recordExportedConfig = useSession((s) => s.recordExportedConfig);
  const completeSheet = useSession((s) => s.completeSheet);

  const paper = getPaperSize(paperId);
  const [images, setImages] = useState<Map<string, ImageSource>>(new Map());
  const [busy, setBusy] = useState<Busy>(null);
  const [format, setFormat] = useState<ExportImageExt>(exportFormat);
  const [savedId, setSavedId] = useState<string | null>(null);

  useEffect(() => {
    setFormat(exportFormat);
  }, [exportFormat]);

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
      formatSize(subjects[0]?.widthMm ?? 35, subjects[0]?.heightMm ?? 45);
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
      exportDpi,
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
  }, [layout, images, subjects, cutGuides, exportDpi, paperLabel, photoSummary]);

  const empty = layout.cells.length === 0;

  const finishAfterSuccess = async (kind: ExportKind) => {
    if (Platform.OS === 'web') {
      router.replace('/');
      return;
    }

    const title =
      kind === 'save' ? t('export.savedOkTitle') : t('export.sharedOkTitle');
    const body =
      kind === 'save' ? t('export.savedOkBody') : t('export.sharedOkBody');

    await new Promise<void>((resolve) => {
      Alert.alert(title, body, [
        {
          text: t('common.ok'),
          onPress: () => resolve(),
        },
      ]);
    });

    // Leave the form sheet first — presenting a full-screen interstitial from a
    // sheet (then replace) fails or gets dismissed instantly on iOS.
    router.replace('/');
    void onExportSuccessEngagement();
    setTimeout(() => {
      void showInterstitialIfNeeded('export');
    }, 700);
  };

  const run = async (kind: ExportKind, fn: () => Promise<unknown>) => {
    if (Platform.OS !== 'web') {
      const allowed = await canExportNow();
      if (!allowed) {
        openProPaywall('exports');
        return;
      }
    }
    setBusy(kind);
    try {
      await fn();
      recordExportedConfig();
      completeSheet();
      await finishAfterSuccess(kind);
    } catch (e) {
      Alert.alert(
        t('export.exportFailed'),
        e instanceof Error ? e.message : t('common.unknownError'),
      );
    } finally {
      setBusy(null);
    }
  };

  const toggleBookmark = async () => {
    if (!SAVED_SHEETS_AVAILABLE || empty) return;
    setBusy('bookmark');
    try {
      if (savedId) {
        await deleteSavedSheet(savedId);
        setSavedId(null);
        return;
      }
      await archive();
    } catch (e) {
      Alert.alert(
        t('export.couldntUpdateSaved'),
        e instanceof Error ? e.message : t('common.unknownError'),
      );
    } finally {
      setBusy(null);
    }
  };

  const saveLabel =
    Platform.OS === 'web'
      ? busy === 'save'
        ? t('export.downloading')
        : t('export.download')
      : busy === 'save'
        ? t('export.saving')
        : t('export.savePhotos');

  return (
    <>
      <Stack.Screen options={{ headerShown: false, title: t('export.title') }} />
      <View
        style={{
          paddingHorizontal: space.xl,
          // Grabber sits above content — leave room so nothing clips.
          paddingTop: Platform.OS === 'ios' ? space.xl + 4 : space.lg,
          paddingBottom: Math.max(insets.bottom, space.lg),
          gap: space.lg,
          backgroundColor: colors.bgElevated,
        }}
      >
        <View style={{ gap: 4 }}>
          <Text
            style={{
              fontFamily: fonts.semibold,
              fontSize: 20,
              letterSpacing: -0.3,
              color: colors.ink,
            }}
          >
            {t('export.title')}
          </Text>
          <Text selectable style={{ ...type.caption, color: colors.inkMuted }}>
            {t('export.metaInline', {
              count: layout.cells.length,
              size: formatSize(layout.paperWidthMm, layout.paperHeightMm),
              dpi: exportDpi,
            })}
          </Text>
        </View>

        <FormatSegment
          value={format}
          disabled={!!busy || empty}
          onChange={setFormat}
        />

        <Button
          label={saveLabel}
          disabled={!!busy || empty}
          onPress={() =>
            run('save', () =>
              saveImageToLibrary(
                layout,
                images,
                subjects,
                cutGuides,
                format,
                exportDpi,
              ),
            )
          }
        />

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            gap: space.xl,
          }}
        >
          <IconAction
            label={t('export.share')}
            disabled={!!busy || empty}
            busy={busy === 'share'}
            onPress={() =>
              run('share', () =>
                exportAndShareImage(
                  layout,
                  images,
                  subjects,
                  cutGuides,
                  format,
                  exportDpi,
                ),
              )
            }
            icon={
              Platform.OS === 'ios' ? (
                <ExportIcon size={22} color={colors.ink} weight="bold" />
              ) : (
                <ShareNetworkIcon size={22} color={colors.ink} weight="bold" />
              )
            }
          />
          {SAVED_SHEETS_AVAILABLE ? (
            <IconAction
              label={savedId ? t('export.saved') : t('export.save')}
              disabled={!!busy || empty}
              busy={busy === 'bookmark'}
              onPress={() => void toggleBookmark()}
              icon={
                <BookmarkSimpleIcon
                  size={22}
                  color={savedId ? colors.accent : colors.ink}
                  weight={savedId ? 'fill' : 'bold'}
                />
              }
            />
          ) : null}
        </View>
      </View>
    </>
  );
}

function FormatSegment({
  value,
  onChange,
  disabled,
}: {
  value: ExportImageExt;
  onChange: (v: ExportImageExt) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const opts: { id: ExportImageExt; label: string }[] = [
    { id: 'jpg', label: 'JPG' },
    { id: 'png', label: 'PNG' },
  ];
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ ...type.caption, color: colors.inkFaint }}>
        {t('export.format')}
      </Text>
      <View
        style={{
          flexDirection: 'row',
          padding: 3,
          borderRadius: radii.sm,
          borderCurve: 'continuous',
          backgroundColor: colors.line,
          opacity: disabled ? 0.5 : 1,
        }}
      >
        {opts.map((opt) => {
          const selected = value === opt.id;
          return (
            <Pressable
              key={opt.id}
              accessibilityRole="button"
              accessibilityState={{ selected, disabled: !!disabled }}
              accessibilityLabel={`${t('export.format')} ${opt.label}`}
              disabled={disabled}
              onPress={() => onChange(opt.id)}
              style={{
                flex: 1,
                paddingVertical: 8,
                alignItems: 'center',
                borderRadius: radii.sm - 2,
                borderCurve: 'continuous',
                backgroundColor: selected ? colors.bgElevated : 'transparent',
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.semibold,
                  fontSize: 14,
                  fontWeight: '600',
                  color: selected ? colors.ink : colors.inkMuted,
                }}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function IconAction({
  label,
  icon,
  onPress,
  disabled,
  busy,
}: {
  label: string;
  icon: ReactNode;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ busy: !!busy, disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        gap: 6,
        opacity: disabled && !busy ? 0.4 : pressed && !busy ? 0.7 : 1,
      })}
    >
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.bgElevated,
          borderWidth: 1,
          borderColor: colors.line,
          overflow: 'hidden',
        }}
      >
        <View style={{ opacity: busy ? 0.2 : 1 }}>{icon}</View>
        {busy ? (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(255,252,249,0.55)',
            }}
          >
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : null}
      </View>
      <Text style={{ ...type.caption, color: colors.inkMuted, fontSize: 12 }}>
        {label}
      </Text>
    </Pressable>
  );
}
