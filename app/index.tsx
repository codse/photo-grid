import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { CameraType } from 'expo-image-picker';
import { router, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { CaretRightIcon } from 'phosphor-react-native/src/icons/CaretRight';
import { GearSixIcon } from 'phosphor-react-native/src/icons/GearSix';
import { PHOTO_PRESETS, PAPER_PRESETS } from '@/core/presets';
import { useSession } from '@/state/session';
import { pickFromCamera, pickFromLibrary } from '@/platform/media';
import { listSavedSheets, SAVED_SHEETS_AVAILABLE } from '@/platform/saved-sheets';
import type { SavedSheet } from '@/features/library/types';
import { regionForPhotoId, REGIONS } from '@/features/sheet/size-catalog';
import { PresetRow } from '@/features/sheet/preset-row';
import { Button } from '@/ui/primitives';
import { InsetGroup, ListRow, SectionHeader } from '@/ui/list-row';
import { CameraIcon, GridIcon, LibraryIcon } from '@/ui/icons';
import { colors, fonts, radii, space, type } from '@/ui/tokens';
import { ProOffer } from '@/monetization/pro-offer';
import { ProBadge } from '@/monetization/pro-badge';
import { AdBanner } from '@/monetization/ads';
import { useIsPro } from '@/monetization/purchases';
import { useTranslation } from 'react-i18next';

/** Scroll distance over which the large title collapses into the nav bar. */
const TITLE_COLLAPSE = 56;

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
  const setPersonUri = useSession((s) => s.setPersonUri);
  const subjects = useSession((s) => s.subjects);
  const activeId = useSession((s) => s.activePersonId ?? s.subjects[0]?.id);

  const [busy, setBusy] = useState(false);
  const [recent, setRecent] = useState<SavedSheet[]>([]);

  const activePhoto = PHOTO_PRESETS.find((p) => p.id === photoId);
  const paper = PAPER_PRESETS.find((p) => p.id === paperId);
  const withPhoto = subjects.filter((s) => s.url);
  const hasPhoto = withPhoto.length > 0;
  const regionLabel =
    REGIONS.find((r) => r.id === regionForPhotoId(photoId))?.label ?? '';

  const sizeTitle = activePhoto?.label ?? 'Photo size';
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

  const importToActive = async (opts: { go: 'crop' | 'sheet' }) => {
    if (!activeId) return;
    setBusy(true);
    try {
      const img = await pickFromLibrary();
      if (!img) return;
      setPersonUri(activeId, img.uri, {
        sourceName: img.fileName ?? img.uri,
      });
      if (opts.go === 'sheet') router.push('/sheet');
      else router.push(`/person/${activeId}/crop`);
    } catch (e) {
      Alert.alert(
        'Could not open library',
        e instanceof Error ? e.message : 'Unknown error',
      );
    } finally {
      setBusy(false);
    }
  };

  const takePhoto = async () => {
    if (Platform.OS !== 'web') {
      router.push('/camera');
      return;
    }
    if (!activeId) return;
    setBusy(true);
    try {
      const img =
        (await pickFromCamera(CameraType.front)) ?? (await pickFromLibrary());
      if (!img) {
        Alert.alert(
          'No photo',
          'Camera was canceled or unavailable. On desktop, pick a file — or use your phone.',
        );
        return;
      }
      setPersonUri(activeId, img.uri, {
        sourceName: img.fileName ?? img.uri,
      });
      router.push(`/person/${activeId}/crop`);
    } catch (e) {
      Alert.alert(
        'Could not open camera',
        e instanceof Error ? e.message : 'Unknown error',
      );
    } finally {
      setBusy(false);
    }
  };

  /** Apply size/paper, then continue — pick photo or open the sheet. */
  const usePreset = (cfg: (typeof savedPresets)[number]) => {
    applyConfig(cfg);
    if (hasPhoto) {
      router.push('/sheet');
      return;
    }
    Alert.alert(t('home.addPhotoTitle'), t('home.addPhotoBody'), [
      {
        text: t('home.takePhoto'),
        onPress: () => {
          void takePhoto();
        },
      },
      {
        text: t('home.photoLibraryAction'),
        onPress: () => {
          void importToActive({ go: 'crop' });
        },
      },
      { text: t('home.cancel'), style: 'cancel' },
    ]);
  };

  const appName = t('app.name');
  const scrollY = useSharedValue(0);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });

  // Large title in the page fades/shrinks away as you scroll.
  const largeTitleStyle = useAnimatedStyle(() => {
    const p = interpolate(
      scrollY.value,
      [0, TITLE_COLLAPSE],
      [0, 1],
      Extrapolation.CLAMP,
    );
    return {
      opacity: 1 - p,
      maxHeight: interpolate(p, [0, 1], [56, 0]),
      marginBottom: interpolate(p, [0, 1], [0, -space.xl]),
      transform: [{ translateY: interpolate(p, [0, 1], [0, -16]) }],
      overflow: 'hidden' as const,
    };
  });

  // Compact title in the nav bar fades in.
  const navTitleStyle = useAnimatedStyle(() => {
    const p = interpolate(
      scrollY.value,
      [TITLE_COLLAPSE * 0.45, TITLE_COLLAPSE],
      [0, 1],
      Extrapolation.CLAMP,
    );
    return { opacity: p };
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen
        options={{
          title: appName,
          headerBackTitle: 'Home',
          headerShown: true,
          headerTransparent: false,
          headerShadowVisible: false,
          headerLargeTitleEnabled: false,
          headerTintColor: colors.ink,
          headerStyle: { backgroundColor: colors.bg },
          headerTitle: () => (
            <Animated.View
              style={[
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  maxWidth: 220,
                },
                navTitleStyle,
              ]}
            >
              {isPro ? <ProBadge /> : null}
              <Text
                numberOfLines={1}
                style={{
                  fontFamily: fonts.semibold,
                  fontSize: 17,
                  fontWeight: '600',
                  color: colors.ink,
                  letterSpacing: -0.2,
                }}
              >
                {appName}
              </Text>
            </Animated.View>
          ),
        }}
      />

      <Stack.Toolbar placement="right" asChild>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('settings.title')}
          onPress={() => router.push('/settings')}
          hitSlop={8}
          style={({ pressed }) => ({
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.line,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <GearSixIcon size={18} color={colors.ink} weight="bold" />
        </Pressable>
      </Stack.Toolbar>

      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentInsetAdjustmentBehavior="automatic"
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: space.xl,
          paddingBottom: 64 + insets.bottom,
          gap: space.xl,
        }}
      >
        <Animated.View style={[{ gap: 8 }, largeTitleStyle]}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 10,
            }}
          >
            {isPro ? <ProBadge /> : null}
            <Text style={{ ...type.display, color: colors.ink, flexShrink: 1 }}>
              {appName}
            </Text>
          </View>
        </Animated.View>

        {hasPhoto ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Continue current sheet"
            onPress={() => router.push('/sheet')}
            style={({ pressed }) => ({
              borderRadius: radii.lg,
              borderCurve: 'continuous',
              backgroundColor: colors.accent,
              padding: space.lg,
              gap: space.md,
              opacity: pressed ? 0.9 : 1,
            })}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Text
                style={{
                  ...type.caption,
                  color: 'rgba(255,255,255,0.7)',
                  textTransform: 'uppercase',
                  letterSpacing: 0.6,
                }}
              >
                {t('home.inProgress')}
              </Text>
              <CaretRightIcon
                size={16}
                color="rgba(255,255,255,0.85)"
                weight="bold"
              />
            </View>
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}
            >
              <View style={{ flexDirection: 'row', marginRight: 4 }}>
                {withPhoto.slice(0, 3).map((s, i) => (
                  <View
                    key={s.id}
                    style={{
                      width: 44,
                      height: 56,
                      borderRadius: 8,
                      borderCurve: 'continuous',
                      overflow: 'hidden',
                      marginLeft: i === 0 ? 0 : -12,
                      borderWidth: 2,
                      borderColor: colors.accent,
                      backgroundColor: 'rgba(255,255,255,0.2)',
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
                    ...type.body,
                    fontFamily: fonts.semibold,
                    color: '#fff',
                  }}
                >
                  Continue sheet
                </Text>
                <Text
                  style={{
                    ...type.caption,
                    color: 'rgba(255,255,255,0.72)',
                  }}
                >
                  {withPhoto.length} photo{withPhoto.length === 1 ? '' : 's'} ·{' '}
                  {sizeDetail}
                </Text>
              </View>
            </View>
          </Pressable>
        ) : (
          <View style={{ gap: space.md }}>
            <Button
              label={busy ? 'Opening…' : t('home.takePhoto')}
              disabled={busy}
              icon={<CameraIcon color="#fff" size={20} />}
              onPress={() => void takePhoto()}
            />
          </View>
        )}

        <View style={{ gap: space.sm }}>
          <SectionHeader
            title={hasPhoto ? 'Add or replace' : t('home.orStartFrom')}
          />
          <InsetGroup>
            {hasPhoto ? (
              <ListRow
                title={t('home.takePhoto')}
                subtitle="Camera"
                disabled={busy}
                icon={<CameraIcon color={colors.accent} size={18} />}
                onPress={() => void takePhoto()}
              />
            ) : null}
            <ListRow
              title={t('home.photoLibrary')}
              subtitle={t('home.photoLibraryHint')}
              disabled={busy}
              icon={<LibraryIcon color={colors.accent} size={18} />}
              onPress={() => importToActive({ go: 'crop' })}
            />
            <ListRow
              title={t('home.tileReady')}
              subtitle={t('home.tileReadyHint')}
              disabled={busy}
              icon={<GridIcon color={colors.accent} size={18} />}
              onPress={() => importToActive({ go: 'sheet' })}
            />
          </InsetGroup>
        </View>

        <View style={{ gap: space.sm }}>
          <SectionHeader title={t('home.printSize')} />
          <InsetGroup>
            <ListRow
              title={sizeTitle}
              subtitle={sizeDetail}
              onPress={() => router.push('/size')}
              accessory={
                <View
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                >
                  <Text style={{ ...type.caption, color: colors.accent }}>
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

        {/* Upgrade only — unlocked Pro is the header badge */}
        {Platform.OS !== 'web' ? <ProOffer variant="card" /> : null}

        {SAVED_SHEETS_AVAILABLE && recent.length > 0 ? (
          <View style={{ gap: space.sm }}>
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
              contentContainerStyle={{ gap: space.md, paddingRight: space.xl }}
            >
              {recent.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => router.push('/saved')}
                  style={{ width: 112, gap: 8 }}
                >
                  <View
                    style={{
                      width: 112,
                      height: 148,
                      borderRadius: radii.md,
                      borderCurve: 'continuous',
                      backgroundColor: colors.bgElevated,
                      borderWidth: 1,
                      borderColor: colors.line,
                      overflow: 'hidden',
                    }}
                  >
                    <RecentThumb uri={item.uri} />
                  </View>
                  <Text
                    numberOfLines={2}
                    style={{
                      ...type.caption,
                      color: colors.inkMuted,
                    }}
                  >
                    {item.cellCount} photos · {item.paperLabel}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {Platform.OS !== 'web' ? (
          <AdBanner style={{ marginTop: space.sm }} />
        ) : null}

        {savedPresets.length > 0 ? (
          <View style={{ gap: space.sm }}>
            <SectionHeader title={t('home.yourPresets')} />
            <InsetGroup>
              {savedPresets.map((cfg) => {
                return (
                  <PresetRow
                    key={cfg.id}
                    preset={cfg}
                    onApply={() => usePreset(cfg)}
                    onRename={(name) => renamePreset(cfg.id, name)}
                    onDelete={() => deletePreset(cfg.id)}
                  />
                );
              })}
            </InsetGroup>
          </View>
        ) : null}

        {busy ? (
          <ActivityIndicator
            color={colors.accent}
            style={{ marginTop: space.sm }}
          />
        ) : null}
      </Animated.ScrollView>
    </View>
  );
}

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
