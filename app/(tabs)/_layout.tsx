import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useTranslation } from 'react-i18next';
import { HouseIcon } from 'phosphor-react-native/src/icons/House';
import { GearSixIcon } from 'phosphor-react-native/src/icons/GearSix';
import { TabAdAccessory } from '@/monetization/tab-ad-accessory';
import { colors, fonts } from '@/ui/tokens';

export default function TabsLayout() {
  const { t } = useTranslation();
  const home = t('common.home');
  const settings = t('settings.title');

  if (Platform.OS === 'web') {
    return (
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.inkFaint,
          tabBarLabelStyle: {
            fontFamily: fonts.medium,
            fontSize: 11,
            fontWeight: '500',
          },
          tabBarStyle: {
            backgroundColor: colors.bgElevated,
            borderTopColor: colors.line,
            height: 56,
            paddingTop: 4,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: home,
            tabBarIcon: ({ color, size }) => (
              <HouseIcon size={size} color={String(color)} weight="fill" />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: settings,
            tabBarIcon: ({ color, size }) => (
              <GearSixIcon size={size} color={String(color)} weight="fill" />
            ),
          }}
        />
      </Tabs>
    );
  }

  return (
    <NativeTabs
      tintColor={colors.accent}
      iconColor={colors.inkFaint}
      backgroundColor={colors.bgElevated}
      minimizeBehavior="never"
    >
      <NativeTabs.BottomAccessory>
        <TabAdAccessory />
      </NativeTabs.BottomAccessory>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>{home}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'house', selected: 'house.fill' }}
          md="home"
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Label>{settings}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'gearshape', selected: 'gearshape.fill' }}
          md="settings"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
