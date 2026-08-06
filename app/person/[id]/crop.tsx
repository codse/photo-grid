import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image as RNImage,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { ArrowClockwiseIcon } from 'phosphor-react-native/src/icons/ArrowClockwise';
import { CircleHalfIcon } from 'phosphor-react-native/src/icons/CircleHalf';
import { FlipHorizontalIcon } from 'phosphor-react-native/src/icons/FlipHorizontal';
import { ImagesIcon } from 'phosphor-react-native/src/icons/Images';
import { ScissorsIcon } from 'phosphor-react-native/src/icons/Scissors';
import { AdjustModal } from '@/features/sheet/adjust-modal';
import { CropCanvas } from '@/features/sheet/crop-canvas';
import { PeopleStrip } from '@/features/people/people-strip';
import { useSession } from '@/state/session';
import { pickFromLibrary } from '@/platform/media';
import {
  BG_REMOVAL_AVAILABLE,
  removeBackground,
} from '@/platform/bg-removal';
import { flipCropHorizontal, rotateCropCW } from '@/core/crop-math';
import { hasAdjustments } from '@/core/adjust-filter';
import { Button } from '@/ui/primitives';
import { colors, radii, space, type } from '@/ui/tokens';
import { RequirePhoto } from '@/features/session/require-photo';
import type { PhIcon } from '@/features/sheet/size-icons';

export default function PersonCropScreen() {
  return (
    <RequirePhoto>
      <PersonCropBody />
    </RequirePhoto>
  );
}

function PersonCropBody() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const subjects = useSession((s) => s.subjects);
  const setActivePerson = useSession((s) => s.setActivePerson);
  const setPersonCrop = useSession((s) => s.setPersonCrop);
  const setPersonUri = useSession((s) => s.setPersonUri);
  const replacePersonUri = useSession((s) => s.replacePersonUri);
  const undoPersonUri = useSession((s) => s.undoPersonUri);
  const setPersonAdjust = useSession((s) => s.setPersonAdjust);

  const active = subjects.find((s) => s.id === id) ?? subjects[0];
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [bgNote, setBgNote] = useState<string | null>(null);
  const [adjustOpen, setAdjustOpen] = useState(false);

  useEffect(() => {
    if (active?.id) setActivePerson(active.id);
  }, [active?.id, setActivePerson]);

  useEffect(() => {
    if (!active?.url) {
      setDims(null);
      return;
    }
    let cancelled = false;
    RNImage.getSize(
      active.url,
      (w, h) => {
        if (!cancelled) setDims({ w, h });
      },
      () => {
        if (!cancelled) setDims({ w: 1200, h: 1600 });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [active?.url]);

  const goPerson = (personId: string) => {
    router.replace(`/person/${personId}/crop`);
  };

  const choosePhoto = async () => {
    if (!active) return;
    setBusy(true);
    try {
      const img = await pickFromLibrary();
      if (!img) return;
      setPersonUri(active.id, img.uri, {
        sourceName: img.fileName ?? img.uri,
      });
    } catch (e) {
      Alert.alert(
        'Could not open library',
        e instanceof Error ? e.message : 'Unknown error',
      );
    } finally {
      setBusy(false);
    }
  };

  if (!active) {
    return null;
  }

  const adjusted = hasAdjustments(active.adjust);

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: active.label }} />
      <PeopleStrip enablePhotoPick onPersonFocus={goPerson} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          padding: space.xl,
          gap: space.lg,
          paddingBottom: 48,
        }}
      >
        {!active.url ? (
          <Button
            label={busy ? 'Opening…' : 'Choose photo'}
            disabled={busy}
            onPress={() => void choosePhoto()}
          />
        ) : dims ? (
          <CropCanvas
            uri={active.url}
            imgW={dims.w}
            imgH={dims.h}
            aspect={active.widthMm / active.heightMm}
            crop={active.crop}
            adjust={active.adjust}
            onChange={(c) => setPersonCrop(active.id, c)}
          />
        ) : (
          <ActivityIndicator color={colors.accent} />
        )}

        {active.url ? (
          <>
            <View
              style={{
                flexDirection: 'row',
                gap: 6,
                alignItems: 'stretch',
              }}
            >
              <EditAction
                icon={ArrowClockwiseIcon}
                label="Rotate"
                onPress={() =>
                  setPersonCrop(active.id, rotateCropCW(active.crop))
                }
              />
              <EditAction
                icon={FlipHorizontalIcon}
                label="Flip"
                onPress={() =>
                  setPersonCrop(active.id, flipCropHorizontal(active.crop))
                }
              />
              <EditAction
                icon={CircleHalfIcon}
                label="Adjust"
                selected={adjusted}
                disabled={busy}
                onPress={() => setAdjustOpen(true)}
              />
              {BG_REMOVAL_AVAILABLE ? (
                <EditAction
                  icon={ScissorsIcon}
                  label={busy ? '…' : 'BG'}
                  disabled={busy}
                  onPress={async () => {
                    setBusy(true);
                    setBgNote(null);
                    try {
                      const result = await removeBackground(active.url);
                      if (result.ok) {
                        replacePersonUri(active.id, result.uri);
                        setBgNote(
                          'Some agencies reject digitally altered photos. Undo if unsure.',
                        );
                      } else {
                        Alert.alert('Background removal', result.reason);
                      }
                    } finally {
                      setBusy(false);
                    }
                  }}
                />
              ) : null}
              <EditAction
                icon={ImagesIcon}
                label={busy ? '…' : 'Replace'}
                disabled={busy}
                onPress={() => void choosePhoto()}
              />
            </View>

            {active.previousUrl ? (
              <Button
                label="Undo background removal"
                variant="ghost"
                onPress={() => {
                  undoPersonUri(active.id);
                  setBgNote(null);
                }}
              />
            ) : null}
            {bgNote ? (
              <Text selectable style={{ ...type.caption, color: colors.accent }}>
                {bgNote}
              </Text>
            ) : null}

            <Button
              label="Continue to sheet"
              onPress={() => router.push('/sheet')}
            />

            <AdjustModal
              visible={adjustOpen}
              uri={active.url}
              value={active.adjust}
              onChange={(next) => setPersonAdjust(active.id, next)}
              onClose={() => setAdjustOpen(false)}
            />
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function EditAction({
  icon: Icon,
  label,
  onPress,
  disabled,
  selected,
}: {
  icon: PhIcon;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  selected?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled, selected: !!selected }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        minWidth: 0,
        paddingVertical: 8,
        paddingHorizontal: 4,
        borderRadius: radii.sm,
        borderCurve: 'continuous',
        backgroundColor: selected ? colors.accent : colors.accentSoft,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
      })}
    >
      <Icon size={18} color={selected ? '#fff' : colors.accent} weight="bold" />
      <Text
        numberOfLines={1}
        style={{
          fontSize: 11,
          lineHeight: 13,
          fontWeight: '600',
          color: selected ? '#fff' : colors.accent,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
