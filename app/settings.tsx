import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { Stack, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { BookmarkSimpleIcon } from 'phosphor-react-native/src/icons/BookmarkSimple';
import { CaretRightIcon } from 'phosphor-react-native/src/icons/CaretRight';
import { FileTextIcon } from 'phosphor-react-native/src/icons/FileText';
import { GlobeHemisphereWestIcon } from 'phosphor-react-native/src/icons/GlobeHemisphereWest';
import { InfoIcon } from 'phosphor-react-native/src/icons/Info';
import { ShieldCheckIcon } from 'phosphor-react-native/src/icons/ShieldCheck';
import { WarningCircleIcon } from 'phosphor-react-native/src/icons/WarningCircle';
import { InsetGroup, ListRow, SectionHeader } from '@/ui/list-row';
import {
  OptionPickerModal,
  type SelectOption,
} from '@/ui/option-select';
import { colors, fonts, radii, space, type } from '@/ui/tokens';
import {
  APP_LOCALES,
  getLocaleLabel,
  useAppLocale,
  type AppLocale,
} from '@/i18n';

const VERSION =
  Constants.expoConfig?.version ??
  Constants.nativeAppVersion ??
  '1.0.0';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { locale, setLocale } = useAppLocale();
  const [languageOpen, setLanguageOpen] = useState(false);

  const languageOptions = useMemo<SelectOption[]>(
    () =>
      APP_LOCALES.map((code) => ({
        id: code,
        label: getLocaleLabel(code),
      })),
    [t],
  );

  return (
    <>
      <Stack.Screen options={{ title: t('settings.title') }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          padding: space.xl,
          paddingBottom: 64,
          gap: space.xxl,
        }}
      >
        <View
          style={{
            borderRadius: radii.lg,
            borderCurve: 'continuous',
            backgroundColor: colors.accentSoft,
            borderWidth: 1,
            borderColor: 'rgba(255, 107, 53, 0.22)',
            padding: space.lg,
            gap: 6,
          }}
        >
          <Text
            style={{
              fontFamily: fonts.playfulSemi,
              fontSize: 20,
              letterSpacing: -0.3,
              color: colors.ink,
            }}
          >
            {t('app.name')}
          </Text>
          <Text style={{ ...type.body, color: colors.inkMuted, fontSize: 15 }}>
            {t('settings.blurb')}
          </Text>
        </View>

        <View style={{ gap: space.sm }}>
          <SectionHeader title={t('settings.preferences')} />
          <InsetGroup>
            <ListRow
              title={t('settings.language')}
              icon={
                <GlobeHemisphereWestIcon
                  size={18}
                  color={colors.accent}
                  weight="duotone"
                />
              }
              onPress={() => setLanguageOpen(true)}
              accessory={
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    maxWidth: 160,
                  }}
                >
                  <Text
                    numberOfLines={1}
                    style={{
                      ...type.caption,
                      color: colors.inkMuted,
                      textAlign: 'right',
                    }}
                  >
                    {getLocaleLabel(locale)}
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

        <View style={{ gap: space.sm }}>
          <SectionHeader title={t('settings.legal')} />
          <InsetGroup>
            <ListRow
              title={t('settings.about')}
              icon={
                <InfoIcon size={18} color={colors.accent} weight="duotone" />
              }
              onPress={() => router.push('/about')}
            />
            <ListRow
              title={t('settings.privacy')}
              icon={
                <ShieldCheckIcon
                  size={18}
                  color={colors.accent}
                  weight="duotone"
                />
              }
              onPress={() => router.push('/privacy')}
            />
            <ListRow
              title={t('settings.terms')}
              icon={
                <FileTextIcon
                  size={18}
                  color={colors.accent}
                  weight="duotone"
                />
              }
              onPress={() => router.push('/terms')}
            />
            <ListRow
              title={t('settings.disclaimer')}
              icon={
                <WarningCircleIcon
                  size={18}
                  color={colors.accent}
                  weight="duotone"
                />
              }
              onPress={() => router.push('/disclaimer')}
            />
          </InsetGroup>
        </View>

        <View style={{ gap: space.md, alignItems: 'center', paddingTop: 4 }}>
          <Pressable
            onPress={() => router.push('/saved')}
            accessibilityRole="button"
            accessibilityLabel={t('settings.savedHint')}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              paddingVertical: 10,
              paddingHorizontal: 14,
              borderRadius: radii.md,
              borderCurve: 'continuous',
              backgroundColor: pressed ? colors.accentSoft : 'transparent',
            })}
          >
            <BookmarkSimpleIcon
              size={16}
              color={colors.inkMuted}
              weight="duotone"
            />
            <Text style={{ ...type.caption, color: colors.inkMuted }}>
              {t('settings.savedHint')}
            </Text>
          </Pressable>
          <Text
            style={{
              ...type.caption,
              color: colors.inkFaint,
              letterSpacing: 0.2,
            }}
          >
            {t('settings.version', { version: VERSION })}
          </Text>
        </View>
      </ScrollView>

      <OptionPickerModal
        visible={languageOpen}
        value={locale}
        options={languageOptions}
        onChange={(id) => void setLocale(id as AppLocale)}
        onClose={() => setLanguageOpen(false)}
        title={t('settings.language')}
      />
    </>
  );
}
