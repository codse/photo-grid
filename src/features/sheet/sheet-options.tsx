import { useState } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';
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
import { Chip, SectionLabel } from '@/ui/primitives';
import { colors, fonts, radii, space, type } from '@/ui/tokens';

const ORIENTATIONS: { id: Orientation; label: string }[] = [
  { id: 'auto', label: 'Auto' },
  { id: 'portrait', label: 'Portrait' },
  { id: 'landscape', label: 'Landscape' },
];

export function useSheetOptionsSummary() {
  const photoId = useSession((s) => s.photoId);
  const paperId = useSession((s) => s.paperId);
  const marginMm = useSession((s) => s.marginMm);
  const packMode = useSession((s) => s.packMode);
  const photo = PHOTO_PRESETS.find((p) => p.id === photoId);
  const paper = getPaperSize(paperId);
  const photoBit = photo
    ? `${Math.round(photo.widthMm)}×${Math.round(photo.heightMm)} mm`
    : 'Photo';
  const paperBit =
    paper.id === '4x6' ? '4×6 in' : formatSize(paper.widthMm, paper.heightMm);
  const packBit = packMode === 'fill' ? 'auto fill' : 'custom count';
  return `${packBit} · ${photoBit} · ${paperBit} · ${marginMm} mm margin`;
}

/** Full customize body — packing + photo/paper + geometry. */
export function SheetOptionsBody() {
  const orientation = useSession((s) => s.orientation);
  const gapMm = useSession((s) => s.gapMm);
  const marginMm = useSession((s) => s.marginMm);
  const cutGuides = useSession((s) => s.cutGuides);
  const setOrientation = useSession((s) => s.setOrientation);
  const setGapMm = useSession((s) => s.setGapMm);
  const setMarginMm = useSession((s) => s.setMarginMm);
  const setCutGuides = useSession((s) => s.setCutGuides);

  return (
    <View style={{ gap: space.xl }}>
      <PackingControls compact />

      <PhotoPaperPicker compact />

      <View style={{ gap: space.sm }}>
        <SectionLabel>Orientation</SectionLabel>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {ORIENTATIONS.map((o) => (
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
          label="Margin"
          valueMm={marginMm}
          onChange={setMarginMm}
          min={0}
          max={30}
          step={0.5}
        />
        <MmStepper
          label="Gap between photos"
          valueMm={gapMm}
          onChange={setGapMm}
          min={0}
          max={20}
          step={0.5}
        />
      </View>

      <View style={{ gap: space.sm }}>
        <SectionLabel>Cut guides</SectionLabel>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: space.sm,
          }}
        >
          <Text style={{ ...type.body, color: colors.ink }}>
            Show cut lines on export
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

/** Collapsed-by-default accordion for phones. */
export function SheetOptionsAccordion({
  defaultOpen = false,
}: {
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const summary = useSheetOptionsSummary();

  return (
    <View
      style={{
        borderRadius: radii.lg,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: colors.line,
        backgroundColor: colors.bgElevated,
        overflow: 'hidden',
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((v) => !v)}
        style={({ pressed }) => ({
          padding: space.lg,
          gap: 4,
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: space.md,
          }}
        >
          <Text
            style={{
              ...type.body,
              fontFamily: fonts.semibold,
              color: colors.ink,
            }}
          >
            Customize
          </Text>
          <Text style={{ ...type.caption, color: colors.accent }}>
            {open ? 'Hide' : 'Edit'}
          </Text>
        </View>
        <Text style={{ ...type.caption, color: colors.inkMuted }}>{summary}</Text>
      </Pressable>
      {open ? (
        <View
          style={{
            paddingHorizontal: space.lg,
            paddingBottom: space.lg,
            borderTopWidth: 1,
            borderTopColor: colors.line,
            paddingTop: space.lg,
          }}
        >
          <SheetOptionsBody />
        </View>
      ) : null}
    </View>
  );
}

/** Always-visible sidebar for tablet / wide web. */
export function SheetOptionsSidebar() {
  const summary = useSheetOptionsSummary();
  return (
    <View
      style={{
        width: 320,
        flexShrink: 0,
        padding: space.lg,
        gap: space.lg,
        backgroundColor: colors.bgElevated,
        borderRadius: radii.lg,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: colors.line,
        alignSelf: 'flex-start',
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
          Customize
        </Text>
        <Text style={{ ...type.caption, color: colors.inkMuted }}>{summary}</Text>
      </View>
      <SheetOptionsBody />
    </View>
  );
}
