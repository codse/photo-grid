import {
  Modal,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { SlidersHorizontalIcon } from 'phosphor-react-native/src/icons/SlidersHorizontal';
import { PHOTO_PRESETS } from '@/core/presets';
import { formatSize } from '@/core/units';
import { MmStepper } from '@/features/sheet/mm-stepper';
import { PackingControls } from '@/features/sheet/packing-controls';
import { PhotoPaperPicker } from '@/features/sheet/photo-paper-picker';
import {
  getPaperSize,
  useSession,
  type Orientation,
} from '@/state/session';
import { SavePresetButton } from '@/features/sheet/save-preset-button';
import { Chip, SectionLabel } from '@/ui/primitives';
import { colors, fonts, radii, space, type } from '@/ui/tokens';

export function useSheetOptionsSummary() {
  const { t } = useTranslation();
  const photoId = useSession((s) => s.photoId);
  const paperId = useSession((s) => s.paperId);
  const marginMm = useSession((s) => s.marginMm);
  const packMode = useSession((s) => s.packMode);
  const photo = PHOTO_PRESETS.find((p) => p.id === photoId);
  const paper = getPaperSize(paperId);
  const photoBit = photo
    ? `${Math.round(photo.widthMm)}×${Math.round(photo.heightMm)} mm`
    : t('sheetOptions.photo');
  const paperBit =
    paper.id === '4x6' ? '4×6 in' : formatSize(paper.widthMm, paper.heightMm);
  const packBit =
    packMode === 'fill'
      ? t('sheetOptions.autoFill')
      : t('sheetOptions.customCount');
  return {
    packBit,
    photoBit,
    paperBit,
    marginMm,
    line: `${packBit} · ${photoBit} · ${paperBit}`,
  };
}

/** Full customize body — packing + photo/paper + geometry. */
export function SheetOptionsBody() {
  const { t } = useTranslation();
  const orientation = useSession((s) => s.orientation);
  const gapMm = useSession((s) => s.gapMm);
  const marginMm = useSession((s) => s.marginMm);
  const cutGuides = useSession((s) => s.cutGuides);
  const setOrientation = useSession((s) => s.setOrientation);
  const setGapMm = useSession((s) => s.setGapMm);
  const setMarginMm = useSession((s) => s.setMarginMm);
  const setCutGuides = useSession((s) => s.setCutGuides);

  const orientations: { id: Orientation; label: string }[] = [
    { id: 'auto', label: t('sheetOptions.auto') },
    { id: 'portrait', label: t('sheetOptions.portrait') },
    { id: 'landscape', label: t('sheetOptions.landscape') },
  ];

  return (
    <View style={{ gap: space.xl }}>
      <PackingControls compact />

      <PhotoPaperPicker compact />

      <View style={{ gap: space.sm }}>
        <SectionLabel>{t('sheetOptions.orientation')}</SectionLabel>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {orientations.map((o) => (
            <Chip
              key={o.id}
              label={o.label}
              selected={orientation === o.id}
              onPress={() => setOrientation(o.id)}
            />
          ))}
        </View>
      </View>

      <View style={{ gap: space.md }}>
        <MmStepper
          label={t('sheetOptions.margin')}
          valueMm={marginMm}
          onChange={setMarginMm}
          min={0}
          max={30}
          step={0.5}
        />
        <MmStepper
          label={t('sheetOptions.gap')}
          valueMm={gapMm}
          onChange={setGapMm}
          min={0}
          max={20}
          step={0.5}
        />
      </View>

      <View style={{ gap: space.sm }}>
        <SectionLabel>{t('sheetOptions.cutGuides')}</SectionLabel>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: space.sm,
          }}
        >
          <Text style={{ ...type.body, color: colors.ink }}>
            {t('sheetOptions.showCutLines')}
          </Text>
          <Switch
            value={cutGuides}
            onValueChange={setCutGuides}
            trackColor={{ true: colors.accent, false: colors.line }}
          />
        </View>
      </View>
    </View>
  );
}

/** Header / toolbar control — Photos-style entry to customize. */
export function CustomizeHeaderButton({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('sheetOptions.customizeA11y')}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => ({
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: pressed ? colors.accentSoft : 'rgba(28,27,25,0.06)',
      })}
    >
      <SlidersHorizontalIcon size={20} color={colors.ink} weight="bold" />
    </Pressable>
  );
}

/**
 * Compact summary under the preview — one line, opens the sheet.
 * Keeps customize reachable without eating the first viewport.
 */
export function CustomizeSummaryBar({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation();
  const { line, marginMm } = useSheetOptionsSummary();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('sheetOptions.customizeA11y')}
      onPress={onPress}
      style={({ pressed }) => ({
        alignSelf: 'stretch',
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.sm,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: radii.md,
        borderCurve: 'continuous',
        backgroundColor: pressed ? colors.accentSoft : colors.bgElevated,
        borderWidth: 1,
        borderColor: colors.line,
      })}
    >
      <SlidersHorizontalIcon size={16} color={colors.accent} weight="bold" />
      <Text
        numberOfLines={1}
        style={{
          ...type.caption,
          color: colors.inkMuted,
          flex: 1,
        }}
      >
        {line} · {marginMm} mm
      </Text>
      <Text style={{ ...type.caption, color: colors.accent, fontWeight: '600' }}>
        {t('common.edit')}
      </Text>
    </Pressable>
  );
}

/** Bottom / form sheet — Apple Photos “Adjust” pattern. */
export function CustomizeSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: colors.bg,
          paddingTop: space.lg,
          maxHeight: height,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: space.xl,
            paddingBottom: space.md,
            borderBottomWidth: 1,
            borderBottomColor: colors.line,
          }}
        >
          <Text
            style={{
              ...type.title,
              fontSize: 20,
              color: colors.ink,
            }}
          >
            {t('sheetOptions.customize')}
          </Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <Text
              style={{
                ...type.body,
                fontFamily: fonts.semibold,
                color: colors.accent,
              }}
            >
              {t('common.done')}
            </Text>
          </Pressable>
        </View>
        <ScrollView
          contentContainerStyle={{
            padding: space.xl,
            paddingBottom: Math.max(insets.bottom, space.xl) + space.lg,
            gap: space.lg,
          }}
        >
          <Text style={{ ...type.caption, color: colors.inkMuted }}>
            {t('sheetOptions.blurb')}
          </Text>
          <SheetOptionsBody />
          <SavePresetButton />
        </ScrollView>
      </View>
    </Modal>
  );
}

/** Full-height docked sidebar for tablet / wide web — not a floating card. */
export function SheetOptionsSidebar({ width = 320 }: { width?: number }) {
  const { t } = useTranslation();
  const { line } = useSheetOptionsSummary();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        width,
        flexShrink: 0,
        alignSelf: 'stretch',
        borderLeftWidth: 1,
        borderLeftColor: colors.line,
        backgroundColor: colors.bgElevated,
      }}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: space.lg,
          paddingBottom: Math.max(insets.bottom, space.xl) + space.lg,
          gap: space.lg,
        }}
      >
        <View style={{ gap: 4 }}>
          <Text
            style={{
              ...type.caption,
              color: colors.inkFaint,
              textTransform: 'uppercase',
              letterSpacing: 0.8,
            }}
          >
            {t('sheetOptions.customize')}
          </Text>
          <Text style={{ ...type.caption, color: colors.inkMuted }}>{line}</Text>
        </View>
        <SheetOptionsBody />
        <SavePresetButton />
      </ScrollView>
    </View>
  );
}
