import { Pressable, ScrollView, Text, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { CaretRightIcon } from 'phosphor-react-native/src/icons/CaretRight';
import { InsetGroup, ListRow, SectionHeader } from '@/ui/list-row';
import { colors, fonts, space, type } from '@/ui/tokens';
import { APP_LOCALES, getLocaleLabel, useAppLocale } from '@/i18n';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { locale, setLocale } = useAppLocale();

  return (
    <>
      <Stack.Screen options={{ title: t('settings.title') }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          padding: space.xl,
          paddingBottom: 56,
          gap: space.xl,
        }}
      >
        <View style={{ gap: space.sm }}>
          <SectionHeader title={t('settings.language')} />
          <InsetGroup>
            {APP_LOCALES.map((code) => (
              <ListRow
                key={code}
                title={getLocaleLabel(code)}
                onPress={() => void setLocale(code)}
                accessory={
                  locale === code ? (
                    <Text
                      style={{
                        ...type.caption,
                        fontFamily: fonts.semibold,
                        color: colors.accent,
                      }}
                    >
                      {t('settings.on')}
                    </Text>
                  ) : (
                    <CaretRightIcon size={16} color={colors.inkFaint} weight="bold" />
                  )
                }
              />
            ))}
          </InsetGroup>
        </View>

        <View style={{ gap: space.sm }}>
          <SectionHeader title={t('settings.legal')} />
          <InsetGroup>
            <ListRow
              title={t('settings.about')}
              onPress={() => router.push('/about')}
            />
            <ListRow
              title={t('settings.privacy')}
              onPress={() => router.push('/privacy')}
            />
            <ListRow
              title={t('settings.terms')}
              onPress={() => router.push('/terms')}
            />
            <ListRow
              title={t('settings.disclaimer')}
              onPress={() => router.push('/disclaimer')}
            />
          </InsetGroup>
        </View>

        <Pressable
          onPress={() => router.push('/saved')}
          style={{ paddingVertical: 4 }}
        >
          <Text style={{ ...type.caption, color: colors.inkMuted, textAlign: 'center' }}>
            {t('settings.savedHint')}
          </Text>
        </Pressable>
      </ScrollView>
    </>
  );
}
