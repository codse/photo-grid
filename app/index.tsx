import { useCallback, useEffect, useState } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PHOTO_PRESETS, PAPER_PRESETS } from '@/core/presets';
import { formatSize } from '@/core/units';
import { useSession } from '@/state/session';
import { pickFromLibrary } from '@/platform/media';
import { listSavedSheets, SAVED_SHEETS_AVAILABLE } from '@/platform/saved-sheets';
import type { SavedSheet } from '@/features/library/types';
import { regionForPhotoId, REGIONS } from '@/features/sheet/size-catalog';
import { labelForConfig } from '@/features/sheet/config-label';
import { Button, ScreenIntro } from '@/ui/primitives';
import { ActionTile } from '@/ui/action-tile';
import { CameraIcon, GridIcon, LibraryIcon } from '@/ui/icons';
import { colors, fonts, radii, space, type } from '@/ui/tokens';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const photoId = useSession((s) => s.photoId);
  const paperId = useSession((s) => s.paperId);
  const recentConfigs = useSession((s) => s.recentConfigs);
  const applyConfig = useSession((s) => s.applyConfig);
  const setPersonUri = useSession((s) => s.setPersonUri);
  const subjects = useSession((s) => s.subjects);
  const activeId = useSession((s) => s.activePersonId ?? s.subjects[0]?.id);

  const [busy, setBusy] = useState(false);
  const [recent, setRecent] = useState<SavedSheet[]>([]);

  const activePhoto = PHOTO_PRESETS.find((p) => p.id === photoId);
  const paper = PAPER_PRESETS.find((p) => p.id === paperId);
  const hasPhoto = subjects.some((s) => s.url);
  const regionLabel =
    REGIONS.find((r) => r.id === regionForPhotoId(photoId))?.label ?? '';

  const refreshRecent = useCallback(async () => {
    try {
      const items = await listSavedSheets();
      setRecent(items.slice(0, 4));
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

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          padding: space.xl,
          paddingTop: Math.max(insets.top, space.xl),
          gap: space.xl,
          paddingBottom: 56,
        }}
      >
        <ScreenIntro
          title="Passport Photo Print"
          body="Pack passport photos onto a pharmacy sheet. Offline · exact sizes · no uploads."
        />

        <View style={{ gap: space.sm }}>
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <ActionTile
              label={busy ? 'Opening…' : 'Take photo'}
              caption="Camera"
              emphasis="primary"
              disabled={busy}
              icon={<CameraIcon color="#fff" size={24} />}
              onPress={() => router.push('/camera')}
            />
            <ActionTile
              label="Library"
              caption="Crop next"
              disabled={busy}
              icon={<LibraryIcon color={colors.accent} size={24} />}
              onPress={() => importToActive({ go: 'crop' })}
            />
          </View>
          <ActionTile
            label="Tile ready photos"
            caption="Skip crop · go to sheet"
            disabled={busy}
            layout="row"
            icon={<GridIcon color={colors.accent} size={22} />}
            onPress={() => importToActive({ go: 'sheet' })}
          />
        </View>

        <View style={{ gap: space.sm }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Change photo size or paper"
            onPress={() => router.push('/size')}
            style={{
              padding: space.lg,
              borderRadius: radii.md,
              borderCurve: 'continuous',
              backgroundColor: colors.bgElevated,
              borderWidth: 1,
              borderColor: colors.line,
              gap: 4,
            }}
          >
            <Text style={{ ...type.caption, color: colors.inkFaint }}>
              Size · tap to change
            </Text>
            <Text
              style={{
                ...type.body,
                fontFamily: fonts.semibold,
                color: colors.ink,
              }}
            >
              {activePhoto?.label ?? 'Photo size'}
            </Text>
            <Text style={{ ...type.caption, color: colors.inkMuted }}>
              {activePhoto
                ? formatSize(activePhoto.widthMm, activePhoto.heightMm)
                : ''}
              {' · '}
              {paper?.id === '4x6' ? '4×6 in (pharmacy)' : paper?.label}
              {regionLabel ? ` · ${regionLabel}` : ''}
            </Text>
          </Pressable>

          {recentConfigs.length > 0 ? (
            <View style={{ gap: space.sm }}>
              <Text
                style={{
                  ...type.caption,
                  color: colors.inkFaint,
                  textTransform: 'uppercase',
                  letterSpacing: 0.8,
                }}
              >
                Recent
              </Text>
              <View
                style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}
              >
                {recentConfigs.slice(0, 5).map((cfg) => {
                  const selected =
                    cfg.photoId === photoId && cfg.paperId === paperId;
                  const { title, detail } = labelForConfig(cfg);
                  return (
                    <Pressable
                      key={`${cfg.photoId}|${cfg.paperId}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      accessibilityLabel={`${title}, ${detail}`}
                      onPress={() => applyConfig(cfg)}
                      style={{
                        paddingVertical: 10,
                        paddingHorizontal: 12,
                        borderRadius: radii.sm,
                        borderCurve: 'continuous',
                        backgroundColor: selected
                          ? colors.accent
                          : colors.bgElevated,
                        borderWidth: 1,
                        borderColor: selected ? colors.accent : colors.line,
                        maxWidth: '100%',
                        gap: 2,
                      }}
                    >
                      <Text
                        numberOfLines={1}
                        style={{
                          ...type.caption,
                          fontFamily: fonts.medium,
                          color: selected ? '#fff' : colors.ink,
                        }}
                      >
                        {title}
                      </Text>
                      <Text
                        numberOfLines={1}
                        style={{
                          ...type.caption,
                          fontSize: 12,
                          color: selected
                            ? 'rgba(255,255,255,0.75)'
                            : colors.inkFaint,
                        }}
                      >
                        {detail}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}
        </View>

        {hasPhoto ? (
          <View style={{ gap: space.sm }}>
            <Button
              label="Continue current sheet"
              variant="secondary"
              onPress={() => router.push('/sheet')}
            />
          </View>
        ) : null}

        {SAVED_SHEETS_AVAILABLE ? (
          <View style={{ gap: space.md }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  ...type.caption,
                  color: colors.inkFaint,
                  textTransform: 'uppercase',
                  letterSpacing: 0.8,
                }}
              >
                Saved sheets
              </Text>
              <Pressable onPress={() => router.push('/saved')}>
                <Text style={{ ...type.caption, color: colors.accent }}>
                  Open all
                </Text>
              </Pressable>
            </View>

            {recent.length === 0 ? (
              <Text style={{ ...type.body, color: colors.inkMuted }}>
                Saved sheets show up here after you export — revisit anytime.
              </Text>
            ) : (
              <View style={{ gap: space.sm }}>
                {recent.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => router.push('/saved')}
                    style={{
                      flexDirection: 'row',
                      gap: space.md,
                      padding: space.md,
                      borderRadius: radii.md,
                      borderCurve: 'continuous',
                      backgroundColor: colors.bgElevated,
                      borderWidth: 1,
                      borderColor: colors.line,
                      alignItems: 'center',
                    }}
                  >
                    <View
                      style={{
                        width: 52,
                        height: 68,
                        borderRadius: radii.sm,
                        backgroundColor: colors.line,
                        overflow: 'hidden',
                      }}
                    >
                      <RecentThumb uri={item.uri} />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text
                        numberOfLines={1}
                        style={{
                          ...type.body,
                          fontFamily: fonts.medium,
                          color: colors.ink,
                        }}
                      >
                        {item.title}
                      </Text>
                      <Text
                        numberOfLines={1}
                        style={{ ...type.caption, color: colors.inkMuted }}
                      >
                        {item.cellCount} photos · {item.paperLabel}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        ) : null}

        {busy ? <ActivityIndicator color={colors.accent} /> : null}
      </ScrollView>
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
    <Image source={{ uri: src }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
  );
}
