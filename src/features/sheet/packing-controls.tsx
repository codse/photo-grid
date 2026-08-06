import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { packSubjects } from '@/core/layout';
import {
  getPaperSize,
  useActivePerson,
  useSession,
} from '@/state/session';
import { Chip, SectionLabel } from '@/ui/primitives';
import { colors, fonts, radii, space, type } from '@/ui/tokens';

/**
 * Auto fill + optional per-person Need N — lives with Customize
 * so size/paper changes and count stay in one place.
 */
export function PackingControls({ compact }: { compact?: boolean }) {
  const subjects = useSession((s) => s.subjects);
  const paperId = useSession((s) => s.paperId);
  const packMode = useSession((s) => s.packMode);
  const orientation = useSession((s) => s.orientation);
  const gapMm = useSession((s) => s.gapMm);
  const marginMm = useSession((s) => s.marginMm);
  const setPackMode = useSession((s) => s.setPackMode);
  const setPersonCopies = useSession((s) => s.setPersonCopies);
  const setActivePerson = useSession((s) => s.setActivePerson);
  const active = useActivePerson();
  const withPhoto = subjects.filter((s) => s.url);
  const paper = getPaperSize(paperId);

  const layout = useMemo(
    () =>
      packSubjects(subjects, {
        paperWidthMm: paper.widthMm,
        paperHeightMm: paper.heightMm,
        gapMm,
        marginMm,
        orientation,
        mode: packMode,
      }),
    [subjects, paper, gapMm, marginMm, orientation, packMode],
  );

  const countsBySubject = useMemo(() => {
    const map = new Map<string, number>();
    for (const cell of layout.cells) {
      map.set(cell.subjectId, (map.get(cell.subjectId) ?? 0) + 1);
    }
    return map;
  }, [layout.cells]);

  const cellCount = layout.cells.length;

  return (
    <View style={{ gap: compact ? space.md : space.lg }}>
      <View style={{ gap: 4 }}>
        <SectionLabel>Packing</SectionLabel>
        <Text style={{ ...type.caption, color: colors.inkMuted }}>
          {packMode === 'fill'
            ? 'Fill the sheet. Count updates when you change paper or photo size.'
            : 'Exact count per person. Extras won’t print if they don’t fit.'}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        <Chip
          label="Auto — fill sheet"
          selected={packMode === 'fill'}
          onPress={() => setPackMode('fill')}
        />
        <Chip
          label="Custom count"
          selected={packMode === 'exact'}
          onPress={() => setPackMode('exact')}
        />
      </View>

      {packMode === 'fill' ? (
        <Text style={{ ...type.body, color: colors.ink }}>
          Fits{' '}
          <Text style={{ fontFamily: fonts.semibold }}>
            {cellCount}
          </Text>{' '}
          photo{cellCount === 1 ? '' : 's'}
          {active && withPhoto.length > 1
            ? ` · ${countsBySubject.get(active.id) ?? 0} for ${active.label}`
            : ''}
        </Text>
      ) : (
        <View style={{ gap: space.sm }}>
          {withPhoto.map((person) => {
            const isActive = person.id === active?.id;
            return (
              <View
                key={person.id}
                style={{
                  gap: space.sm,
                  padding: space.md,
                  borderRadius: radii.md,
                  borderCurve: 'continuous',
                  backgroundColor: isActive ? colors.accentSoft : colors.bg,
                  borderWidth: 1,
                  borderColor: isActive ? colors.accent : colors.line,
                }}
              >
                <Pressable
                  onPress={() => setActivePerson(person.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Edit count for ${person.label}`}
                >
                  <Text style={{ ...type.caption, color: colors.inkMuted }}>
                    Need N — {person.label}
                    {withPhoto.length > 1
                      ? ` · ${countsBySubject.get(person.id) ?? 0} on sheet`
                      : ''}
                  </Text>
                </Pressable>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: space.md,
                  }}
                >
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Fewer copies for ${person.label}`}
                    onPress={() => {
                      setActivePerson(person.id);
                      setPersonCopies(
                        person.id,
                        Math.max(1, person.copies - 1),
                      );
                    }}
                    style={stepperBtn}
                  >
                    <Text style={stepperLabel}>−</Text>
                  </Pressable>
                  <Text
                    style={{
                      ...type.title,
                      color: colors.ink,
                      fontVariant: ['tabular-nums'],
                      minWidth: 40,
                      textAlign: 'center',
                    }}
                  >
                    {person.copies}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`More copies for ${person.label}`}
                    onPress={() => {
                      setActivePerson(person.id);
                      setPersonCopies(person.id, person.copies + 1);
                    }}
                    style={stepperBtn}
                  >
                    <Text style={stepperLabel}>+</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const stepperBtn = {
  width: 44,
  height: 44,
  borderRadius: radii.sm,
  borderCurve: 'continuous' as const,
  backgroundColor: colors.bgElevated,
  borderWidth: 1,
  borderColor: colors.line,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
};

const stepperLabel = {
  fontSize: 22,
  color: colors.ink,
  fontWeight: '500' as const,
};
