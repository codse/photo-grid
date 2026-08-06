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
import { Redirect, Stack } from 'expo-router';
import type { SavedSheet } from '@/features/library/types';
import {
  SAVED_SHEETS_AVAILABLE,
  deleteSavedSheet,
  getSheetDataUrl,
  listSavedSheets,
  shareSavedSheet,
} from '@/platform/saved-sheets';
import { colors, fonts, radii, space, type } from '@/ui/tokens';

export default function SavedScreen() {
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
      <Stack.Screen options={{ title: 'Saved sheets' }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          padding: space.xl,
          gap: space.md,
          paddingBottom: 48,
        }}
      >
        <Text style={{ ...type.body, color: colors.inkMuted }}>
          Sheets you export are kept here so you can share or reprint later.
          Nothing is uploaded.
        </Text>

        {loading ? <ActivityIndicator color={colors.accent} /> : null}

        {!loading && items.length === 0 ? (
          <Text style={{ ...type.body, color: colors.inkFaint }}>
            No saved sheets yet. Export a print sheet to create one.
          </Text>
        ) : null}

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
                        'Share failed',
                        e instanceof Error ? e.message : 'Unknown error',
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
                  <Text style={{ color: '#fff', fontWeight: '600' }}>Share</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    Alert.alert('Delete sheet?', 'This cannot be undone.', [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Delete',
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
                    Delete
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
