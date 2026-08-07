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
import { Redirect, Stack, router } from 'expo-router';
import { ImagesIcon } from 'phosphor-react-native/src/icons/Images';
import { useTranslation } from 'react-i18next';
import type { SavedSheet } from '@/features/library/types';
import {
  SAVED_SHEETS_AVAILABLE,
  deleteSavedSheet,
  getSheetDataUrl,
  listSavedSheets,
  shareSavedSheet,
} from '@/platform/saved-sheets';
import { Button } from '@/ui/primitives';
import { colors, fonts, radii, space, type } from '@/ui/tokens';

export default function SavedScreen() {
  const { t } = useTranslation();
  const [items, setItems] = useState<SavedSheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listSavedSheets();
      setItems(list);
      const next: Record<string, string> = {};
      await Promise.all(
        list.map(async (item) => {
          const data = await getSheetDataUrl(item.uri);
          if (data) next[item.id] = data;
        }),
      );
      setThumbs(next);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!SAVED_SHEETS_AVAILABLE) return;
    void refresh();
  }, [refresh]);

  if (!SAVED_SHEETS_AVAILABLE) {
    return <Redirect href="/" />;
  }

  return (
    <>
      <Stack.Screen options={{ title: t('saved.title') }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          padding: space.xl,
          gap: space.md,
          paddingBottom: 48,
          flexGrow: 1,
        }}
      >
        {loading ? <ActivityIndicator color={colors.accent} /> : null}

        {!loading && items.length === 0 ? <SavedEmpty /> : null}

        {items.map((item) => (
          <View
            key={item.id}
            style={{
              borderRadius: radii.md,
              borderCurve: 'continuous',
              borderWidth: 1,
              borderColor: colors.line,
              backgroundColor: colors.bgElevated,
              overflow: 'hidden',
            }}
          >
            <View style={{ height: 160, backgroundColor: colors.line }}>
              {thumbs[item.id] ? (
                <Image
                  source={{ uri: thumbs[item.id] }}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="contain"
                />
              ) : null}
            </View>
            <View style={{ padding: space.lg, gap: space.sm }}>
              <Text
                style={{
                  ...type.body,
                  fontFamily: fonts.semibold,
                  color: colors.ink,
                }}
              >
                {item.title}
              </Text>
              <Text selectable style={{ ...type.caption, color: colors.inkMuted }}>
                {new Date(item.createdAt).toLocaleString()} · {item.cellCount}{' '}
                photos · {item.paperLabel}
              </Text>
              <Text
                numberOfLines={2}
                style={{ ...type.caption, color: colors.inkFaint }}
              >
                {item.photoSummary}
              </Text>
              <View style={{ flexDirection: 'row', gap: space.sm, marginTop: 4 }}>
                <Pressable
                  accessibilityRole="button"
                  onPress={async () => {
                    try {
                      await shareSavedSheet(item.uri);
                    } catch (e) {
                      Alert.alert(
                        t('saved.shareFailed'),
                        e instanceof Error ? e.message : t('common.unknownError'),
                      );
                    }
                  }}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: radii.sm,
                    backgroundColor: colors.accent,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: '600' }}>
                    {t('saved.share')}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    Alert.alert(t('saved.deleteTitle'), t('saved.deleteBody'), [
                      { text: t('saved.cancel'), style: 'cancel' },
                      {
                        text: t('saved.delete'),
                        style: 'destructive',
                        onPress: () => {
                          void (async () => {
                            await deleteSavedSheet(item.id);
                            await refresh();
                          })();
                        },
                      },
                    ]);
                  }}
                  style={{
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderRadius: radii.sm,
                    backgroundColor: 'rgba(180,35,24,0.1)',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: colors.danger, fontWeight: '600' }}>
                    {t('saved.delete')}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </>
  );
}

function SavedEmpty() {
  const { t } = useTranslation();
  return (
    <View
      style={{
        flex: 1,
        minHeight: 420,
        alignItems: 'center',
        justifyContent: 'center',
        gap: space.xl,
        paddingHorizontal: space.md,
      }}
    >
      <EmptySheetArt />
      <View style={{ alignItems: 'center', gap: 6, maxWidth: 260 }}>
        <Text
          style={{
            ...type.title,
            fontFamily: fonts.semibold,
            color: colors.ink,
            textAlign: 'center',
          }}
        >
          {t('saved.emptyTitle')}
        </Text>
        <Text
          style={{
            ...type.caption,
            color: colors.inkMuted,
            textAlign: 'center',
          }}
        >
          {t('saved.emptyBody')}
        </Text>
      </View>
      <Button
        label={t('saved.makeSheet')}
        icon={<ImagesIcon size={18} color="#fff" weight="bold" />}
        onPress={() => router.replace('/')}
      />
    </View>
  );
}

/** Mini printable sheet silhouette — show, don’t lecture. */
function EmptySheetArt() {
  const cell = { width: 28, height: 36, borderRadius: 4 };
  return (
    <View
      style={{
        width: 168,
        height: 112,
        borderRadius: radii.md,
        borderCurve: 'continuous',
        backgroundColor: colors.bgElevated,
        borderWidth: 1.5,
        borderColor: colors.line,
        padding: 14,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        justifyContent: 'center',
        alignContent: 'center',
        boxShadow: '0 10px 28px rgba(42,33,28,0.08)',
      }}
    >
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <View
          key={i}
          style={{
            ...cell,
            backgroundColor: i < 2 ? colors.accentSoft : 'rgba(237,228,220,0.85)',
            borderWidth: 1,
            borderColor: colors.line,
            borderStyle: 'dashed',
          }}
        />
      ))}
    </View>
  );
}
