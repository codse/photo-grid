import { useState } from 'react';
import { Alert, Platform, ScrollView, Text, View } from 'react-native';
import { CameraType } from 'expo-image-picker';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { PeopleStrip } from '@/features/people/people-strip';
import { useActivePerson, useSession } from '@/state/session';
import { pickFromCamera, pickFromLibrary } from '@/platform/media';
import { Button } from '@/ui/primitives';
import { colors, radii, space, type } from '@/ui/tokens';
import { formatSize } from '@/core/units';

export default function PhotoScreen() {
  const active = useActivePerson();
  const setPersonUri = useSession((s) => s.setPersonUri);
  const [busy, setBusy] = useState(false);

  if (!active) {
    return (
      <View style={{ flex: 1, padding: space.xl }}>
        <Text>No person selected.</Text>
      </View>
    );
  }

  const takePhoto = async () => {
    if (Platform.OS !== 'web') {
      router.push('/camera');
      return;
    }
    setBusy(true);
    try {
      const img =
        (await pickFromCamera(CameraType.front)) ?? (await pickFromLibrary());
      if (!img) {
        Alert.alert(
          'No photo',
          'Camera was canceled or unavailable. On desktop, pick a file — or use your phone.',
        );
        return;
      }
      setPersonUri(active.id, img.uri, {
        sourceName: img.fileName ?? img.uri,
      });
    } catch (e) {
      Alert.alert(
        'Could not open camera',
        e instanceof Error ? e.message : 'Unknown error',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <PeopleStrip enablePhotoPick />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          padding: space.xl,
          gap: space.lg,
          paddingBottom: 48,
        }}
      >
        <View
          style={{
            alignSelf: 'center',
            width: 200,
            aspectRatio: active.widthMm / active.heightMm,
            borderRadius: radii.md,
            borderCurve: 'continuous',
            overflow: 'hidden',
            backgroundColor: colors.line,
            borderWidth: 1,
            borderColor: colors.line,
          }}
        >
          {active.url ? (
            <Image
              source={{ uri: active.url }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
            />
          ) : (
            <View
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                padding: space.md,
              }}
            >
              <Text
                style={{
                  ...type.caption,
                  color: colors.inkFaint,
                  textAlign: 'center',
                }}
              >
                No photo yet
              </Text>
            </View>
          )}
        </View>

        <Text
          selectable
          style={{ ...type.caption, color: colors.inkMuted, textAlign: 'center' }}
        >
          {formatSize(active.widthMm, active.heightMm)}
        </Text>

        <Button
          label={busy ? 'Opening…' : 'Take photo'}
          disabled={busy}
          onPress={() => void takePhoto()}
        />
        <Button
          label="Choose from library"
          variant="secondary"
          disabled={busy}
          onPress={async () => {
            setBusy(true);
            try {
              const img = await pickFromLibrary();
              if (img) {
                setPersonUri(active.id, img.uri, {
                  sourceName: img.fileName ?? img.uri,
                });
              }
            } catch (e) {
              Alert.alert(
                'Could not open library',
                e instanceof Error ? e.message : 'Unknown error',
              );
            } finally {
              setBusy(false);
            }
          }}
        />

        {active.url ? (
          <>
            <Button
              label="Crop & adjust"
              onPress={() => router.push(`/person/${active.id}/crop`)}
            />
            <Button
              label="Continue to sheet"
              variant="secondary"
              onPress={() => router.push('/sheet')}
            />
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}
