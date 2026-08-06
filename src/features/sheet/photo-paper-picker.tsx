import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { PAPER_PRESETS, PHOTO_PRESETS } from '@/core/presets';
import { formatSize } from '@/core/units';
import { useSession } from '@/state/session';
import {
  PRIMARY_PAPER_IDS,
  REGIONS,
  presetsForRegion,
  regionForPhotoId,
  shortPhotoLabel,
  type RegionId,
} from '@/features/sheet/size-catalog';
import {
  PAPER_SECTION_ICON,
  PHOTO_SECTION_ICON,
  REGION_ICONS,
  REGION_SECTION_ICON,
  SELECTED_CHECK_ICON,
  iconForPaper,
  iconForPhotoPreset,
} from '@/features/sheet/size-icons';
import { ChoiceList, type SelectOption } from '@/ui/option-select';
import { SectionLabel } from '@/ui/primitives';
import { colors, fonts, radii, space, type } from '@/ui/tokens';

/** Region → document → paper controls shared by Size screen and sheet customize. */
export function PhotoPaperPicker({ compact }: { compact?: boolean }) {
  const photoId = useSession((s) => s.photoId);
  const paperId = useSession((s) => s.paperId);
  const setPhotoPreset = useSession((s) => s.setPhotoPreset);
  const setPaperPreset = useSession((s) => s.setPaperPreset);

  const [regionId, setRegionId] = useState<RegionId>(() =>
    regionForPhotoId(photoId),
  );
  const [showAllPaper, setShowAllPaper] = useState(false);

  const docs = useMemo(() => presetsForRegion(regionId), [regionId]);
  const activePhoto = PHOTO_PRESETS.find((p) => p.id === photoId);
  const activePaper = PAPER_PRESETS.find((p) => p.id === paperId);
  const region = REGIONS.find((r) => r.id === regionId);

  const papers = useMemo(() => {
    if (showAllPaper) return PAPER_PRESETS;
    const primaryIds = new Set<string>(PRIMARY_PAPER_IDS);
    const primary = PAPER_PRESETS.filter((p) => primaryIds.has(p.id));
    if (!primaryIds.has(paperId)) {
      const current = PAPER_PRESETS.find((p) => p.id === paperId);
      if (current) return [...primary, current];
    }
    return primary;
  }, [showAllPaper, paperId]);

  const selectRegion = (next: RegionId) => {
    setRegionId(next);
    const list = presetsForRegion(next);
    if (!list.some((p) => p.id === photoId) && list[0]) {
      setPhotoPreset(list[0].id);
    }
  };

  const RegionSectionIcon = REGION_SECTION_ICON;
  const PhotoSectionIcon = PHOTO_SECTION_ICON;
  const PaperSectionIcon = PAPER_SECTION_ICON;
  const CheckIcon = SELECTED_CHECK_ICON;

  const regionOptions: SelectOption[] = useMemo(
    () =>
      REGIONS.map((r) => ({
        id: r.id,
        label: r.label,
        detail: r.hint,
        Icon: REGION_ICONS[r.id],
      })),
    [],
  );

  const docOptions: SelectOption[] = useMemo(
    () =>
      docs.map((p) => ({
        id: p.id,
        label: shortPhotoLabel(p, regionId),
        detail: formatSize(p.widthMm, p.heightMm),
        Icon: iconForPhotoPreset(p.id, p.label),
      })),
    [docs, regionId],
  );

  const paperOptions: SelectOption[] = useMemo(
    () =>
      papers.map((p) => ({
        id: p.id,
        label: p.id === '4x6' ? '4×6 in (pharmacy)' : p.label,
        detail: formatSize(p.widthMm, p.heightMm),
        Icon: iconForPaper(p.id),
      })),
    [papers],
  );

  return (
    <View style={{ gap: compact ? space.md : space.xl }}>
      {!compact && activePhoto && activePaper ? (
        <View
          style={{
            padding: space.lg,
            borderRadius: radii.lg,
            borderCurve: 'continuous',
            backgroundColor: colors.accentSoft,
            gap: space.sm,
          }}
        >
          <Text
            style={{
              ...type.caption,
              color: colors.accent,
              textTransform: 'uppercase',
              letterSpacing: 0.8,
            }}
          >
            Current
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: space.sm,
            }}
          >
            <CheckIcon size={22} color={colors.accent} weight="fill" />
            <View style={{ flex: 1, gap: 2 }}>
              <Text
                style={{
                  ...type.body,
                  fontFamily: fonts.semibold,
                  color: colors.ink,
                }}
              >
                {activePhoto.label}
              </Text>
              <Text style={{ ...type.caption, color: colors.inkMuted }}>
                {formatSize(activePhoto.widthMm, activePhoto.heightMm)}
                {' · '}
                {activePaper.id === '4x6'
                  ? '4×6 in pharmacy sheet'
                  : activePaper.label}
              </Text>
            </View>
          </View>
        </View>
      ) : null}

      <View style={{ gap: space.sm }}>
        <SectionLabel
          icon={
            <RegionSectionIcon
              size={14}
              color={colors.inkFaint}
              weight="bold"
            />
          }
        >
          Where is this for?
        </SectionLabel>
        {region && !compact && regionOptions.length <= 3 ? (
          <Text
            style={{ ...type.caption, color: colors.inkMuted, marginTop: -4 }}
          >
            {region.hint}
          </Text>
        ) : null}
        <ChoiceList
          value={regionId}
          options={regionOptions}
          onChange={(id) => selectRegion(id as RegionId)}
          accessibilityLabel="Region"
        />
      </View>

      <View style={{ gap: space.sm }}>
        <SectionLabel
          icon={
            <PhotoSectionIcon
              size={14}
              color={colors.inkFaint}
              weight="bold"
            />
          }
        >
          Photo size
        </SectionLabel>
        {docOptions.length > 3 ? (
          <ChoiceList
            value={photoId}
            options={docOptions}
            onChange={setPhotoPreset}
            accessibilityLabel="Photo size"
          />
        ) : (
          docs.map((p) => {
            const selected = photoId === p.id;
            const DocIcon = iconForPhotoPreset(p.id, p.label);
            const ink = selected ? '#fff' : colors.ink;
            const muted = selected
              ? 'rgba(255,255,255,0.72)'
              : colors.inkFaint;
            return (
              <Pressable
                key={p.id}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setPhotoPreset(p.id)}
                style={{
                  paddingVertical: compact ? 10 : 14,
                  paddingHorizontal: 14,
                  borderRadius: radii.md,
                  borderCurve: 'continuous',
                  backgroundColor: selected ? colors.accent : colors.bgElevated,
                  borderWidth: 1,
                  borderColor: selected ? colors.accent : colors.line,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: space.md,
                }}
              >
                <View
                  style={{
                    width: compact ? 36 : 40,
                    height: compact ? 36 : 40,
                    borderRadius: radii.sm,
                    borderCurve: 'continuous',
                    backgroundColor: selected
                      ? 'rgba(255,255,255,0.18)'
                      : colors.accentSoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <DocIcon
                    size={compact ? 18 : 20}
                    color={selected ? '#fff' : colors.accent}
                    weight={selected ? 'fill' : 'duotone'}
                  />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text
                    style={{
                      ...type.body,
                      fontSize: compact ? 14 : 16,
                      fontFamily: fonts.medium,
                      color: ink,
                    }}
                  >
                    {shortPhotoLabel(p, regionId)}
                  </Text>
                  <Text
                    style={{
                      ...type.caption,
                      fontVariant: ['tabular-nums'],
                      color: muted,
                    }}
                  >
                    {formatSize(p.widthMm, p.heightMm)}
                  </Text>
                </View>
                {selected ? (
                  <CheckIcon size={20} color="#fff" weight="fill" />
                ) : null}
              </Pressable>
            );
          })
        )}
      </View>

      <View style={{ gap: space.sm }}>
        <SectionLabel
          icon={
            <PaperSectionIcon
              size={14}
              color={colors.inkFaint}
              weight="bold"
            />
          }
        >
          Print on
        </SectionLabel>
        <ChoiceList
          value={paperId}
          options={paperOptions}
          onChange={(id) => {
            setPaperPreset(id);
            if (
              !PRIMARY_PAPER_IDS.includes(
                id as (typeof PRIMARY_PAPER_IDS)[number],
              )
            ) {
              setShowAllPaper(true);
            }
          }}
          accessibilityLabel="Paper size"
        />
        {!showAllPaper && PAPER_PRESETS.length > papers.length ? (
          <Pressable
            onPress={() => setShowAllPaper(true)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
          >
            <Text style={{ ...type.caption, color: colors.accent }}>
              More paper sizes
            </Text>
          </Pressable>
        ) : showAllPaper && papers.length > 3 ? (
          <Pressable
            onPress={() => setShowAllPaper(false)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
          >
            <Text style={{ ...type.caption, color: colors.accent }}>
              Show fewer paper sizes
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
