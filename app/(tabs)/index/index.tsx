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
import { router, Stack, useFocusEffect } from 'expo-router';
import { CaretRightIcon } from 'phosphor-react-native/src/icons/CaretRight';
import { PHOTO_PRESETS, PAPER_PRESETS } from '@/core/presets';
import { useSession } from '@/state/session';
import { pickFromLibrary, preparePersonImage } from '@/platform/media';
import { listSavedSheets, SAVED_SHEETS_AVAILABLE } from '@/platform/saved-sheets';
import type { SavedSheet } from '@/features/library/types';
import { regionForPhotoId, REGIONS } from '@/features/sheet/size-catalog';
import { PresetRow } from '@/features/sheet/preset-row';
import { ActionTile } from '@/ui/action-tile';
import { InsetGroup, ListRow, SectionHeader } from '@/ui/list-row';
import { CameraIcon, LibraryIcon } from '@/ui/icons';
import { colors, space } from '@/ui/tokens';
import { ProBadge } from '@/monetization/pro-badge';
import { AdBanner } from '@/monetization/ads';
import { useIsPro } from '@/monetization/purchases';
import { loadForceFreeAds } from '@/monetization/ads-prefs';
import { useTranslation } from 'react-i18next';

/** iOS Settings-style grouped canvas. */
const GROUPED_BG = Platform.OS === 'ios' ? '#F2F2F7' : colors.bg;
const ROW_PRESS = Platform.OS === 'ios' ? '#D1D1D6' : colors.accentSoft;

function lightTap() {
  if (Platform.OS === 'ios') {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

export default function HomeScreen() {
  const { t } = useTranslation();
  const isPro = useIsPro();
  const photoId = useSession((s) => s.photoId);
  const paperId = useSession((s) => s.paperId);
  const savedPresets = useSession((s) => s.savedPresets);
  const applyConfig = useSession((s) => s.applyConfig);
  const deletePreset = useSession((s) => s.deletePreset);
  const renamePreset = useSession((s) => s.renamePreset);
  const setPersonUri = useSession((s) => s.setPersonUri);
  const subjects = useSession((s) => s.subjects);
  const activeId = useSession((s) => s.activePersonId ?? s.subjects[0]?.id);

  const [busy, setBusy] = useState(false);
  const [recent, setRecent] = useState<SavedSheet[]>([]);
  const [bannerKey, setBannerKey] = useState(0);
  const [forceFree, setForceFree] = useState(false);

  useEffect(() => {
    void loadForceFreeAds().then((v) => setForceFree(v));
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadForceFreeAds().then((v) => {
        setForceFree(v);
        setBannerKey((k) => k + 1);
      });
    }, []),
  );

  const showBanner = Platform.OS !== 'web' && (!isPro || forceFree);

  const activePhoto = PHOTO_PRESETS.find((p) => p.id === photoId);
  const paper = PAPER_PRESETS.find((p) => p.id === paperId);
  const withPhoto = subjects.filter((s) => s.url);
  const hasPhoto = withPhoto.length > 0;
  const regionLabel =
    REGIONS.find((r) => r.id === regionForPhotoId(photoId))?.label ?? '';

  const sizeTitle = activePhoto?.label ?? t('home.photoSizeFallback');
  const sizeDetail = [
    activePhoto
      ? `${Math.round(activePhoto.widthMm)}×${Math.round(activePhoto.heightMm)} mm`
      : null,
    paper?.id === '4x6' ? '4×6 in' : paper?.label,
    regionLabel || null,
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
    lightTap();
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

  const appName = t('app.name');
  const largeTitle = Platform.OS === 'ios';

  const openPro = () => {
    if (Platform.OS === 'web') return;
    lightTap();
    router.push('/pro');
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: appName,
          headerBackTitle: t('common.home'),
          headerShown: true,
          headerTransparent: false,
          headerShadowVisible: false,
          headerLargeTitleEnabled: largeTitle,
          headerLargeTitleShadowVisible: false,
          headerTintColor: colors.ink,
          headerStyle: { backgroundColor: GROUPED_BG },
          headerLargeStyle: { backgroundColor: GROUPED_BG },
          headerTitleStyle: {
            fontWeight: '600',
            color: colors.ink,
          },
          headerLargeTitleStyle: {
            fontWeight: '700',
            color: colors.ink,
          },
          contentStyle: { backgroundColor: GROUPED_BG },
        }}
      />

      <Stack.Toolbar placement="right">
        <Stack.Toolbar.View hidesSharedBackground>
          <View style={{ justifyContent: 'center', paddingRight: 2 }}>
            <ProBadge
              variant={isPro ? 'pro' : 'get'}
              onPress={isPro ? undefined : openPro}
            />
          </View>
        </Stack.Toolbar.View>
      </Stack.Toolbar>

      <View style={{ flex: 1, backgroundColor: GROUPED_BG }}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ flex: 1, backgroundColor: GROUPED_BG }}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: largeTitle ? 8 : space.md,
          paddingBottom: 32,
          gap: 28,
        }}
      >
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
          <View
            style={{
              flexDirection: 'row',
              gap: 12,
              paddingHorizontal: space.lg,
            }}
          >
            <ActionTile
              label={t('home.camera')}
              icon={<CameraIcon color={colors.accent} size={24} />}
              disabled={busy}
              onPress={takePhoto}
            />
            <ActionTile
              label={t('home.gallery')}
              icon={<LibraryIcon color={colors.accent} size={24} />}
              disabled={busy}
              onPress={() => void importToActive()}
            />
          </View>
        </View>

        <View>
          <SectionHeader title={t('home.printSize')} />
          <InsetGroup>
            <ListRow
              title={sizeTitle}
              subtitle={sizeDetail}
              onPress={() => {
                lightTap();
                router.push('/size');
              }}
              accessory={
                <View
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                >
                  <Text
                    style={{
                      fontSize: 15,
                      color: colors.inkFaint,
                    }}
                  >
                    {t('home.change')}
                  </Text>
                  <CaretRightIcon
                    size={16}
                    color={colors.inkFaint}
                    weight="bold"
                  />
                </View>
              }
            />
          </InsetGroup>
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
              contentContainerStyle={{ gap: 12, paddingRight: 8 }}
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
            <SectionHeader title={t('home.yourPresets')} />
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

      {showBanner ? (
        <View style={styles.bannerDock}>
          <AdBanner key={bannerKey} size="anchored" />
        </View>
      ) : null}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  bannerDock: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#C6C6C8',
    backgroundColor: GROUPED_BG,
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 2,
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
