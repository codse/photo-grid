import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CaretRightIcon } from 'phosphor-react-native/src/icons/CaretRight';
import { PlusIcon } from 'phosphor-react-native/src/icons/Plus';
import { PHOTO_PRESETS, PAPER_PRESETS } from '@/core/presets';
import { useSession } from '@/state/session';
import { pickFromLibrary, preparePersonImage } from '@/platform/media';
import { listSavedSheets, SAVED_SHEETS_AVAILABLE } from '@/platform/saved-sheets';
import type { SavedSheet } from '@/features/library/types';
import { QUICK_SIZE_IDS, QUICK_SIZE_LABEL_KEYS } from '@/features/sheet/size-catalog';
import { PresetRow } from '@/features/sheet/preset-row';
import { InsetGroup, SectionHeader } from '@/ui/list-row';
import { SheetPreviewMark } from '@/ui/sheet-preview-mark';
import { colors, fonts, radii, space } from '@/ui/tokens';
import { ProBadge } from '@/monetization/pro-badge';
import { openProPaywall } from '@/monetization/pro-route';
import { AdBanner, usingTestAdUnits } from '@/monetization/ads';
import { useIsPro } from '@/monetization/purchases';
import { useTranslation } from 'react-i18next';

/** iOS Settings-style grouped canvas. */
const GROUPED_BG = Platform.OS === 'ios' ? '#F2F2F7' : colors.bg;
const ROW_PRESS = Platform.OS === 'ios' ? '#D1D1D6' : colors.accentSoft;

function lightTap() {
  if (Platform.OS === 'ios') {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

function mediumTap() {
  if (Platform.OS === 'ios') {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }
}

export default function HomeScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const isPro = useIsPro();
  const photoId = useSession((s) => s.photoId);
  const paperId = useSession((s) => s.paperId);
  const savedPresets = useSession((s) => s.savedPresets);
  const applyConfig = useSession((s) => s.applyConfig);
  const deletePreset = useSession((s) => s.deletePreset);
  const renamePreset = useSession((s) => s.renamePreset);
  const setPhotoPreset = useSession((s) => s.setPhotoPreset);
  const setPersonUri = useSession((s) => s.setPersonUri);
  const subjects = useSession((s) => s.subjects);
  const activeId = useSession((s) => s.activePersonId ?? s.subjects[0]?.id);

  const [busy, setBusy] = useState(false);
  const [recent, setRecent] = useState<SavedSheet[]>([]);

  const activePhoto = PHOTO_PRESETS.find((p) => p.id === photoId);
  const paper = PAPER_PRESETS.find((p) => p.id === paperId);
  const withPhoto = subjects.filter((s) => s.url);
  const hasPhoto = withPhoto.length > 0;

  const sizeDetail = [
    activePhoto
      ? `${Math.round(activePhoto.widthMm)}×${Math.round(activePhoto.heightMm)} mm`
      : null,
    paper?.id === '4x6' ? '4×6 in' : paper?.label,
  ]
    .filter(Boolean)
    .join(' · ');

  const refreshRecent = useCallback(async () => {
    try {
      const items = await listSavedSheets();
      setRecent(items.slice(0, 6));
    } catch {
      setRecent([]);
    }
  }, []);

  useEffect(() => {
    if (!SAVED_SHEETS_AVAILABLE) return;
    void refreshRecent();
  }, [refreshRecent]);

  const importToActive = async () => {
    if (!activeId) return;
    mediumTap();
    setBusy(true);
    try {
      const img = await pickFromLibrary();
      if (!img) return;
      const prepared = await preparePersonImage(img);
      setPersonUri(activeId, prepared.uri, {
        sourceName: prepared.fileName ?? prepared.uri,
      });
      router.push(`/person/${activeId}/crop`);
    } catch (e) {
      Alert.alert(
        t('home.libraryOpenFailed'),
        e instanceof Error ? e.message : t('common.unknownError'),
      );
    } finally {
      setBusy(false);
    }
  };

  const takePhoto = () => {
    lightTap();
    router.push('/camera');
  };

  const usePreset = (cfg: (typeof savedPresets)[number]) => {
    lightTap();
    applyConfig(cfg);
    if (hasPhoto) {
      router.push('/sheet');
      return;
    }
    Alert.alert(t('home.addPhotoTitle'), t('home.addPhotoBody'), [
      {
        text: t('home.takePhoto'),
        onPress: takePhoto,
      },
      {
        text: t('home.photoLibraryAction'),
        onPress: () => {
          void importToActive();
        },
      },
      { text: t('home.cancel'), style: 'cancel' },
    ]);
  };

  const homeTitle = t('app.homeTitle');

  const openPro = () => {
    if (Platform.OS === 'web') return;
    lightTap();
    openProPaywall();
  };

  return (
    <View style={{ flex: 1, backgroundColor: GROUPED_BG }}>
      {/* Flat under NativeTabs — nested Stack under tabs hangs Release (SDK 57). */}
      <View
        style={{
          paddingTop: Math.max(insets.top, 12),
          paddingHorizontal: 16,
          paddingBottom: 10,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          backgroundColor: GROUPED_BG,
        }}
      >
        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            fontFamily: fonts.semibold,
            fontSize: 22,
            fontWeight: '600',
            color: colors.ink,
            letterSpacing: -0.2,
          }}
        >
          {homeTitle}
        </Text>
        <ProBadge
          variant={isPro ? 'pro' : 'get'}
          onPress={isPro ? undefined : openPro}
        />
      </View>

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ flex: 1, backgroundColor: GROUPED_BG }}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: space.md,
          paddingBottom: 32,
          gap: 28,
        }}
      >
          {!hasPhoto ? (
            <Text style={styles.tagline}>{t('home.getStartedHint')}</Text>
          ) : null}

          {hasPhoto ? (
            <InsetGroup dividerInset={72}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('home.continueSheet')}
                onPress={() => {
                  lightTap();
                  router.push('/sheet');
                }}
                style={({ pressed }) => ({
                  backgroundColor: pressed ? ROW_PRESS : 'transparent',
                })}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    minHeight: 72,
                  }}
                >
                  <View style={{ flexDirection: 'row' }}>
                    {withPhoto.slice(0, 3).map((s, i) => (
                      <View
                        key={s.id}
                        style={{
                          width: 40,
                          height: 52,
                          borderRadius: 6,
                          borderCurve: 'continuous',
                          overflow: 'hidden',
                          marginLeft: i === 0 ? 0 : -10,
                          borderWidth: StyleHairline,
                          borderColor: colors.bgElevated,
                          backgroundColor: colors.line,
                        }}
                      >
                        {s.url ? (
                          <ExpoImage
                            source={{ uri: s.url }}
                            style={{ width: '100%', height: '100%' }}
                            contentFit="cover"
                          />
                        ) : null}
                      </View>
                    ))}
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text
                      style={{
                        fontSize: 17,
                        fontWeight: '600',
                        color: colors.ink,
                        letterSpacing: -0.2,
                      }}
                    >
                      {t('home.continueSheetShort')}
                    </Text>
                    <Text
                      style={{
                        fontSize: 13,
                        color: colors.inkMuted,
                        lineHeight: 18,
                      }}
                    >
                      {t('home.photoCount', { count: withPhoto.length })} ·{' '}
                      {sizeDetail}
                    </Text>
                  </View>
                  <CaretRightIcon size={16} color={colors.inkFaint} weight="bold" />
                </View>
              </Pressable>
            </InsetGroup>
          ) : null}

          <View style={{ gap: space.sm }}>
            {hasPhoto ? (
              <SectionHeader title={t('home.addOrReplace')} />
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${t('home.choosePhoto')}. ${t('home.choosePhotoHint')}`}
              accessibilityState={{ disabled: busy }}
              disabled={busy}
              onPress={() => void importToActive()}
              style={({ pressed }) => [
                styles.heroCta,
                {
                  opacity: busy ? 0.55 : 1,
                  transform: [{ scale: pressed && !busy ? 0.985 : 1 }],
                  backgroundColor: pressed ? '#A88438' : colors.accent,
                },
              ]}
            >
              <SheetPreviewMark width={56} onAccent />
              <View style={{ alignItems: 'center', gap: 4 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <PlusIcon size={22} color="#fff" weight="bold" />
                  <Text style={styles.heroLabel}>{t('home.choosePhoto')}</Text>
                </View>
                <Text style={styles.heroHint}>{t('home.choosePhotoHint')}</Text>
              </View>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('home.takeNewPhoto')}
              disabled={busy}
              onPress={takePhoto}
              hitSlop={8}
              style={({ pressed }) => ({
                alignSelf: 'center',
                paddingVertical: 10,
                paddingHorizontal: 16,
                opacity: busy ? 0.45 : pressed ? 0.55 : 1,
              })}
            >
              <Text style={styles.secondaryLink}>{t('home.takeNewPhoto')}</Text>
            </Pressable>
          </View>

          <View>
            <SectionHeader
              title={t('home.quickSizes')}
              action={{
                label: t('home.allSizes'),
                onPress: () => {
                  lightTap();
                  router.push('/size');
                },
              }}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.hBleed}
              contentContainerStyle={styles.hBleedContent}
            >
              {QUICK_SIZE_IDS.map((id) => {
                const preset = PHOTO_PRESETS.find((p) => p.id === id);
                if (!preset) return null;
                const selected = photoId === id;
                const chipLabel = t(`home.quick.${QUICK_SIZE_LABEL_KEYS[id]}`);
                const sizeHint = `${Math.round(preset.widthMm)}×${Math.round(preset.heightMm)} mm`;
                return (
                  <Pressable
                    key={id}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`${chipLabel}. ${sizeHint}`}
                    onPress={() => {
                      lightTap();
                      setPhotoPreset(id);
                    }}
                    style={({ pressed }) => [
                      styles.sizeChip,
                      selected && styles.sizeChipSelected,
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.sizeChipText,
                        selected && styles.sizeChipTextSelected,
                      ]}
                    >
                      {chipLabel}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {SAVED_SHEETS_AVAILABLE && recent.length > 0 ? (
            <View>
              <SectionHeader
                title={t('home.saved')}
                action={{
                  label: t('home.seeAll'),
                  onPress: () => router.push('/saved'),
                }}
              />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.hBleed}
                contentContainerStyle={[styles.hBleedContent, { gap: 12 }]}
              >
                {recent.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => {
                      lightTap();
                      router.push('/saved');
                    }}
                    style={{ width: 108, gap: 6 }}
                  >
                    <View
                      style={{
                        width: 108,
                        height: 140,
                        borderRadius: 12,
                        borderCurve: 'continuous',
                        backgroundColor: colors.bgElevated,
                        overflow: 'hidden',
                      }}
                    >
                      <RecentThumb uri={item.uri} />
                    </View>
                    <Text
                      numberOfLines={2}
                      style={{
                        fontSize: 12,
                        color: colors.inkMuted,
                        lineHeight: 16,
                      }}
                    >
                      {item.cellCount} photos · {item.paperLabel}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ) : null}

          {savedPresets.length > 0 ? (
            <View>
              <SectionHeader title={t('home.savedPresets')} />
              <InsetGroup>
                {savedPresets.map((cfg) => (
                  <PresetRow
                    key={cfg.id}
                    preset={cfg}
                    onApply={() => usePreset(cfg)}
                    onRename={(name) => renamePreset(cfg.id, name)}
                    onDelete={() => deletePreset(cfg.id)}
                  />
                ))}
              </InsetGroup>
            </View>
          ) : null}

          {busy ? (
            <ActivityIndicator
              color={colors.accent}
              style={{ marginTop: space.sm }}
            />
          ) : null}
        </ScrollView>

      {/* In-screen dock — BottomAccessory is unreliable across iOS versions.
          Clear floating NativeTabs with bottom padding. */}
      {Platform.OS !== 'web' ? (
        <View
          style={[
            styles.bannerDock,
            { paddingBottom: Math.max(insets.bottom, 8) + 64 },
          ]}
        >
          <AdBanner size="banner" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tagline: {
    fontFamily: fonts.regular,
    fontSize: 17,
    lineHeight: 24,
    letterSpacing: -0.2,
    color: colors.inkMuted,
    paddingHorizontal: 4,
    marginBottom: -8,
  },
  heroCta: {
    borderRadius: radii.lg,
    borderCurve: 'continuous',
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    minHeight: 168,
  },
  heroLabel: {
    fontFamily: fonts.semibold,
    fontSize: 20,
    letterSpacing: -0.3,
    color: '#fff',
  },
  heroHint: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: 'rgba(255,255,255,0.78)',
  },
  secondaryLink: {
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.accent,
    letterSpacing: -0.2,
  },
  /** Escape parent paddingHorizontal so chips scroll edge-to-edge. */
  hBleed: {
    marginHorizontal: -16,
  },
  hBleedContent: {
    gap: 8,
    paddingHorizontal: 16,
  },
  sizeChip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderCurve: 'continuous',
    backgroundColor: colors.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Platform.OS === 'ios' ? '#C6C6C8' : colors.line,
    alignItems: 'center',
  },
  sizeChipSelected: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  sizeChipText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.ink,
    letterSpacing: -0.1,
  },
  sizeChipTextSelected: {
    fontFamily: fonts.semibold,
    color: colors.ink,
  },
  bannerDock: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#C6C6C8',
    backgroundColor: GROUPED_BG,
    alignItems: 'center',
    paddingTop: 6,
  },
});

const StyleHairline = Platform.select({ ios: 1 / 3, default: 1 }) ?? 1;

function RecentThumb({ uri }: { uri: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { getSheetDataUrl } = await import('@/platform/saved-sheets');
        const data = await getSheetDataUrl(uri);
        if (!cancelled) setSrc(data);
      } catch {
        if (!cancelled) setSrc(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uri]);

  if (!src) {
    return <View style={{ flex: 1, backgroundColor: colors.line }} />;
  }
  return (
    <ExpoImage
      source={{ uri: src }}
      style={{ width: '100%', height: '100%' }}
      contentFit="cover"
    />
  );
}
