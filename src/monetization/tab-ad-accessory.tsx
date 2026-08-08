import { Platform, View } from 'react-native';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { AdBanner } from '@/monetization/ads';

/**
 * Banner hosted in NativeTabs.BottomAccessory so it sits above the
 * floating liquid-glass tab bar (in-screen docks end up underneath).
 * AdBanner itself gates on Pro / mute / force-free.
 */
export function TabAdAccessory() {
  const placement = NativeTabs.BottomAccessory.usePlacement();

  if (Platform.OS === 'web') return null;
  // Compact inline chrome next to the tab pill — not enough room for a banner.
  if (placement === 'inline') return null;

  return (
    <View style={{ width: '100%', alignItems: 'center', minHeight: 50 }}>
      {/* Fixed BANNER fits BottomAccessory; adaptive sizes get clipped. */}
      <AdBanner size="banner" />
    </View>
  );
}
