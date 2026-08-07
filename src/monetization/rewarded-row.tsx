import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  getAdsMutedUntil,
  isAdsMutedNow,
  loadForceFreeAds,
  getForceFreeAdsSync,
} from '@/monetization/ads-prefs';
import { showRewardedForAdBreak } from '@/monetization/ads';
import { getCachedIsPro, isPro } from '@/monetization/purchases';
import { colors, space } from '@/ui/tokens';

/** Optional rewarded break — mute ads for an hour without buying Pro. */
export function RewardedAdRow({ onMuted }: { onMuted?: () => void }) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [mutedUntil, setMutedUntil] = useState(0);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    await loadForceFreeAds();
    const force = getForceFreeAdsSync();
    let pro = false;
    try {
      pro = getCachedIsPro() || (await isPro());
    } catch {
      pro = false;
    }
    if (pro && !force) {
      setVisible(false);
      return;
    }
    const until = await getAdsMutedUntil();
    setMutedUntil(until);
    setVisible(true);
  };

  useEffect(() => {
    void refresh();
  }, []);

  if (!visible) return null;

  const muted = mutedUntil > Date.now();

  const watch = async () => {
    setBusy(true);
    try {
      const result = await showRewardedForAdBreak();
      if (result.status === 'rewarded') {
        setMutedUntil(result.mutedUntil);
        onMuted?.();
        Alert.alert(
          t('ads.mutedTitle'),
          t('ads.mutedBody'),
        );
      } else if (result.status === 'unavailable') {
        Alert.alert(t('ads.unavailableTitle'), result.message);
      }
    } finally {
      setBusy(false);
      void isAdsMutedNow();
    }
  };

  return (
    <Pressable
      accessibilityRole="button"
      disabled={busy || muted}
      onPress={() => void watch()}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: space.lg,
        backgroundColor: pressed ? '#D1D1D6' : 'transparent',
        opacity: busy ? 0.85 : 1,
      })}
    >
      <View style={{ flex: 1, gap: 2, paddingRight: space.md }}>
        <Text
          style={{
            fontSize: 17,
            fontWeight: '400',
            letterSpacing: -0.2,
            color: colors.ink,
          }}
        >
          {muted ? t('ads.mutedActive') : t('ads.watchTitle')}
        </Text>
        <Text style={{ fontSize: 13, color: colors.inkMuted, lineHeight: 18 }}>
          {muted
            ? t('ads.mutedUntilHint', {
                time: new Date(mutedUntil).toLocaleTimeString([], {
                  hour: 'numeric',
                  minute: '2-digit',
                }),
              })
            : t('ads.watchHint')}
        </Text>
      </View>
      {busy ? (
        <ActivityIndicator color={colors.accent} />
      ) : muted ? null : (
        <Text style={{ fontSize: 17, fontWeight: '400', color: colors.accent }}>
          {t('ads.watchCta')}
        </Text>
      )}
    </Pressable>
  );
}
