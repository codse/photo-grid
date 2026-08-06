import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image as RNImage,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowClockwiseIcon } from 'phosphor-react-native/src/icons/ArrowClockwise';
import { CircleHalfIcon } from 'phosphor-react-native/src/icons/CircleHalf';
import { FlipHorizontalIcon } from 'phosphor-react-native/src/icons/FlipHorizontal';
import { ScissorsIcon } from 'phosphor-react-native/src/icons/Scissors';
import { AdjustModal } from '@/features/sheet/adjust-modal';
import { CropCanvas } from '@/features/sheet/crop-canvas';
import { PeopleStrip } from '@/features/people/people-strip';
import { useSession } from '@/state/session';
import { flipHorizontal, pickFromLibrary, rotateImage } from '@/platform/media';
import {
  BG_REMOVAL_AVAILABLE,
  removeBackground,
} from '@/platform/bg-removal';
import { hasAdjustments } from '@/core/adjust-filter';
import { Button, ScreenIntro, SectionLabel } from '@/ui/primitives';
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

  const cropHint =
    Platform.OS === 'web'
      ? 'Drag or middle-click-drag to pan · scroll or Zoom −/+ to scale. Keep the head inside the oval guide.'
      : 'Drag to pan · pinch or Zoom −/+ to scale. Keep the head inside the oval guide.';

  const adjusted = hasAdjustments(active.adjust);

  return (
    <View style={{ flex: 1 }}>
      <PeopleStrip enablePhotoPick onPersonFocus={goPerson} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          padding: space.xl,
          gap: space.lg,
          paddingBottom: 48,
        }}
      >
        <ScreenIntro
          title={`Crop · ${active.label}`}
          body={
            active.url
              ? cropHint
              : 'Tap this person’s tile (or Choose photo) to add an image, then crop.'
          }
        />

        {!active.url ? (
          <View style={{ gap: space.md }}>
            <Text style={{ ...type.body, color: colors.inkMuted }}>
              No photo for {active.label} yet.
            </Text>
            <Button
              label={busy ? 'Opening…' : 'Choose photo'}
              disabled={busy}
              onPress={() => void choosePhoto()}
            />
          </View>
        ) : dims ? (
          <CropCanvas
            uri={active.url}
            imgW={dims.w}
            imgH={dims.h}
            aspect={active.widthMm / active.heightMm}
            crop={active.crop}
            adjust={active.adjust}
            onChange={(crop) => setPersonCrop(active.id, crop)}
          />
        ) : (
          <ActivityIndicator color={colors.accent} />
        )}

        {active.url ? (
          <>
            <Button
              label={busy ? 'Opening…' : 'Replace photo'}
              variant="ghost"
              disabled={busy}
              onPress={() => void choosePhoto()}
            />

            <SectionLabel>Quick edits</SectionLabel>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
              <EditAction
                icon={ArrowClockwiseIcon}
                label="Rotate"
                disabled={busy}
                onPress={async () => {
                  setBusy(true);
                  try {
                    const uri = await rotateImage(active.url, 90);
                    setPersonUri(active.id, uri);
                  } finally {
                    setBusy(false);
                  }
                }}
              />
              <EditAction
                icon={FlipHorizontalIcon}
                label="Flip"
                disabled={busy}
                onPress={async () => {
                  setBusy(true);
                  try {
                    const uri = await flipHorizontal(active.url);
                    setPersonUri(active.id, uri);
                  } finally {
                    setBusy(false);
                  }
                }}
              />
              <EditAction
                icon={CircleHalfIcon}
                label={adjusted ? 'Adjusted' : 'Adjust'}
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
            ) : BG_REMOVAL_AVAILABLE ? (
              <Text style={{ ...type.caption, color: colors.inkFaint }}>
                BG removes background on-device. Optional.
              </Text>
            ) : (
              <Text style={{ ...type.caption, color: colors.inkFaint }}>
                Background removal is available in the iOS/Android app build.
              </Text>
            )}

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
        minWidth: 76,
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: radii.md,
        borderCurve: 'continuous',
        backgroundColor: selected ? colors.accent : colors.accentSoft,
        alignItems: 'center',
        gap: 6,
        opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
      })}
    >
      <Icon
        size={22}
        color={selected ? '#fff' : colors.accent}
        weight="bold"
      />
      <Text
        style={{
          ...type.caption,
          color: selected ? '#fff' : colors.accent,
          fontWeight: '600',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
