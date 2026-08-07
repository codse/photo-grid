import { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { Stack, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { BookmarkSimpleIcon } from 'phosphor-react-native/src/icons/BookmarkSimple';
import { CaretRightIcon } from 'phosphor-react-native/src/icons/CaretRight';
import { FileTextIcon } from 'phosphor-react-native/src/icons/FileText';
import { GlobeHemisphereWestIcon } from 'phosphor-react-native/src/icons/GlobeHemisphereWest';
import { ImageIcon } from 'phosphor-react-native/src/icons/Image';
import { InfoIcon } from 'phosphor-react-native/src/icons/Info';
import { QuestionIcon } from 'phosphor-react-native/src/icons/Question';
import { ChatCircleIcon } from 'phosphor-react-native/src/icons/ChatCircle';
import { ScissorsIcon } from 'phosphor-react-native/src/icons/Scissors';
import { ShieldCheckIcon } from 'phosphor-react-native/src/icons/ShieldCheck';
import { WarningCircleIcon } from 'phosphor-react-native/src/icons/WarningCircle';
import type { ExportImageExt } from '@/core/export-name';
import { EXPORT_DPI_OPTIONS, type ExportDpi } from '@/core/units';
import { useSession } from '@/state/session';
import { InsetGroup, ListRow, SectionHeader } from '@/ui/list-row';
import {
  OptionPickerModal,
  type SelectOption,
} from '@/ui/option-select';
import { colors, radii, space, type } from '@/ui/tokens';
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

const GROUPED_BG = Platform.OS === 'ios' ? '#F2F2F7' : colors.bg;

type PickerKind = 'language' | 'dpi' | 'format' | null;

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { locale, setLocale } = useAppLocale();
  const exportDpi = useSession((s) => s.exportDpi);
  const exportFormat = useSession((s) => s.exportFormat);
  const cutGuides = useSession((s) => s.cutGuides);
  const setExportDpi = useSession((s) => s.setExportDpi);
  const setExportFormat = useSession((s) => s.setExportFormat);
  const setCutGuides = useSession((s) => s.setCutGuides);

  const [picker, setPicker] = useState<PickerKind>(null);

  const languageOptions = useMemo<SelectOption[]>(
    () =>
      APP_LOCALES.map((code) => ({
        id: code,
        label: getLocaleLabel(code),
      })),
    [t],
  );

  const dpiOptions = useMemo<SelectOption[]>(
    () =>
      EXPORT_DPI_OPTIONS.map((dpi) => ({
        id: String(dpi),
        label:
          dpi === 300
            ? t('settings.dpiStandard', { dpi })
            : t('settings.dpiHigh', { dpi }),
      })),
    [t],
  );

  const formatOptions = useMemo<SelectOption[]>(
    () => [
      { id: 'jpg', label: 'JPG' },
      { id: 'png', label: 'PNG' },
    ],
    [],
  );

  const formatLabel = exportFormat === 'png' ? 'PNG' : 'JPG';

  return (
    <>
      <Stack.Screen
        options={{
          title: t('settings.title'),
          headerStyle: { backgroundColor: GROUPED_BG },
          contentStyle: { backgroundColor: GROUPED_BG },
        }}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ flex: 1, backgroundColor: GROUPED_BG }}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: space.lg,
          paddingBottom: 64,
          gap: 28,
        }}
      >
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
              onPress={() => setPicker('language')}
              accessory={
                <ValueChevron label={getLocaleLabel(locale)} />
              }
            />
          </InsetGroup>
        </View>

        <View style={{ gap: space.sm }}>
          <SectionHeader title={t('settings.export')} />
          <InsetGroup>
            <ListRow
              title={t('settings.dpi')}
              subtitle={t('settings.dpiHint')}
              icon={
                <ImageIcon size={18} color={colors.accent} weight="duotone" />
              }
              onPress={() => setPicker('dpi')}
              accessory={<ValueChevron label={`${exportDpi}`} />}
            />
            <ListRow
              title={t('settings.defaultFormat')}
              subtitle={t('settings.defaultFormatHint')}
              icon={
                <FileTextIcon
                  size={18}
                  color={colors.accent}
                  weight="duotone"
                />
              }
              onPress={() => setPicker('format')}
              accessory={<ValueChevron label={formatLabel} />}
            />
            <ListRow
              title={t('settings.cutGuides')}
              subtitle={t('settings.cutGuidesHint')}
              icon={
                <ScissorsIcon
                  size={18}
                  color={colors.accent}
                  weight="duotone"
                />
              }
              onPress={() => setCutGuides(!cutGuides)}
              accessory={
                <Text style={{ ...type.caption, color: colors.accent }}>
                  {cutGuides ? t('settings.on') : t('settings.off')}
                </Text>
              }
            />
          </InsetGroup>
        </View>

        <View style={{ gap: space.sm }}>
          <SectionHeader title={t('settings.helpSection')} />
          <InsetGroup>
            <ListRow
              title={t('settings.help')}
              icon={
                <QuestionIcon
                  size={18}
                  color={colors.accent}
                  weight="duotone"
                />
              }
              onPress={() => router.push('/settings/help')}
            />
            <ListRow
              title={t('settings.faq')}
              icon={
                <ChatCircleIcon
                  size={18}
                  color={colors.accent}
                  weight="duotone"
                />
              }
              onPress={() => router.push('/settings/faq')}
            />
            <ListRow
              title={t('settings.about')}
              icon={
                <InfoIcon size={18} color={colors.accent} weight="duotone" />
              }
              onPress={() => router.push('/settings/about')}
            />
          </InsetGroup>
        </View>

        <View style={{ gap: space.sm }}>
          <SectionHeader title={t('settings.legal')} />
          <InsetGroup>
            <ListRow
              title={t('settings.privacy')}
              icon={
                <ShieldCheckIcon
                  size={18}
                  color={colors.accent}
                  weight="duotone"
                />
              }
              onPress={() => router.push('/settings/privacy')}
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
              onPress={() => router.push('/settings/terms')}
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
              onPress={() => router.push('/settings/disclaimer')}
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
        visible={picker === 'language'}
        value={locale}
        options={languageOptions}
        onChange={(id) => void setLocale(id as AppLocale)}
        onClose={() => setPicker(null)}
        title={t('settings.language')}
      />
      <OptionPickerModal
        visible={picker === 'dpi'}
        value={String(exportDpi)}
        options={dpiOptions}
        onChange={(id) => setExportDpi(Number(id) as ExportDpi)}
        onClose={() => setPicker(null)}
        title={t('settings.dpi')}
      />
      <OptionPickerModal
        visible={picker === 'format'}
        value={exportFormat}
        options={formatOptions}
        onChange={(id) => setExportFormat(id as ExportImageExt)}
        onClose={() => setPicker(null)}
        title={t('settings.defaultFormat')}
      />
    </>
  );
}

function ValueChevron({ label }: { label: string }) {
  return (
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
        {label}
      </Text>
      <CaretRightIcon size={16} color={colors.inkFaint} weight="bold" />
    </View>
  );
}
