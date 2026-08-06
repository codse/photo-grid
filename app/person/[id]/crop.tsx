import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image as RNImage,
  Platform,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { CropCanvas } from '@/features/sheet/crop-canvas';
import { PeopleStrip } from '@/features/people/people-strip';
import { useSession } from '@/state/session';
import { flipHorizontal, pickFromLibrary, rotateImage } from '@/platform/media';
import {
  BG_REMOVAL_AVAILABLE,
  removeBackground,
} from '@/platform/bg-removal';
import { Button, ScreenIntro, SectionLabel } from '@/ui/primitives';
import { colors, space, type } from '@/ui/tokens';
import { RequirePhoto } from '@/features/session/require-photo';

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
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <View style={{ flex: 1 }}>
                <Button
                  label="Rotate 90°"
                  variant="secondary"
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
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  label="Flip"
                  variant="secondary"
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
              </View>
            </View>

            <View style={{ gap: space.sm }}>
              <Text style={{ ...type.caption, color: colors.inkMuted }}>
                Brightness
              </Text>
              <View style={{ flexDirection: 'row', gap: space.sm }}>
                {[0.85, 1, 1.15].map((v) => (
                  <View key={v} style={{ flex: 1 }}>
                    <Button
                      label={v === 1 ? 'Normal' : v < 1 ? 'Darker' : 'Brighter'}
                      variant={
                        active.adjust.brightness === v ? 'primary' : 'secondary'
                      }
                      onPress={() =>
                        setPersonAdjust(active.id, {
                          ...active.adjust,
                          brightness: v,
                        })
                      }
                    />
                  </View>
                ))}
              </View>
            </View>

            {BG_REMOVAL_AVAILABLE ? (
              <View style={{ gap: space.sm }}>
                <Button
                  label={busy ? 'Removing…' : 'Remove background'}
                  variant="secondary"
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
                  <Text
                    selectable
                    style={{ ...type.caption, color: colors.accent }}
                  >
                    {bgNote}
                  </Text>
                ) : (
                  <Text style={{ ...type.caption, color: colors.inkFaint }}>
                    On-device (Apple Vision / ML Kit). Optional.
                  </Text>
                )}
              </View>
            ) : (
              <Text style={{ ...type.caption, color: colors.inkFaint }}>
                Background removal is available in the iOS/Android app build.
              </Text>
            )}

            <Button
              label="Continue to sheet"
              onPress={() => router.push('/sheet')}
            />
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}
