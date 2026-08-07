import { Image } from 'expo-image';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useSession } from '@/state/session';
import { pickFromLibrary, preparePersonImage } from '@/platform/media';
import { colors, radii, space, type } from '@/ui/tokens';

export type PeopleStripCaptureMode = 'none' | 'library' | 'sheet';

type Props = {
  /**
   * `library` — crop/photo: empty/re-tap opens library.
   * `sheet` — take photo | library | cancel → crop (cancel drops new empty shells).
   * `none` — focus only.
   */
  captureMode?: PeopleStripCaptureMode;
  /** @deprecated Prefer `captureMode="library"`. */
  enablePhotoPick?: boolean;
  /**
   * `live` — baked preview when available (sheet).
   * `source` — raw photo URI only; ignores crop/adjust (editor — no live strip thrash).
   */
  thumbs?: 'live' | 'source';
  onPersonFocus?: (id: string) => void;
};

export function PeopleStrip({
  captureMode,
  enablePhotoPick,
  thumbs = 'live',
  onPersonFocus,
}: Props) {
  const mode: PeopleStripCaptureMode =
    captureMode ?? (enablePhotoPick ? 'library' : 'none');
  const subjects = useSession((s) => s.subjects);
  const activeId = useSession((s) => s.activePersonId ?? s.subjects[0]?.id);
  const setActivePerson = useSession((s) => s.setActivePerson);
  const addPerson = useSession((s) => s.addPerson);
  const removePerson = useSession((s) => s.removePerson);
  const setPersonUri = useSession((s) => s.setPersonUri);

  const focus = (id: string) => {
    setActivePerson(id);
    onPersonFocus?.(id);
  };

  const pickLibraryFor = async (id: string, opts?: { goCrop?: boolean }) => {
    try {
      const raw = await pickFromLibrary();
      if (!raw) return false;
      const img = await preparePersonImage(raw);
      setPersonUri(id, img.uri, { sourceName: img.fileName ?? img.uri });
      focus(id);
      if (opts?.goCrop) {
        router.push(`/person/${id}/crop`);
      }
      return true;
    } catch (e) {
      Alert.alert(
        'Could not open library',
        e instanceof Error ? e.message : 'Unknown error',
      );
      return false;
    }
  };

  const offerSheetCapture = (id: string, opts: { removeOnCancel: boolean }) => {
    focus(id);
    const setPending = useSession.getState().setPendingCapturePersonId;
    const dropIfNew = () => {
      setPending(null);
      if (opts.removeOnCancel) removePerson(id);
    };
    Alert.alert('Add photo', undefined, [
      {
        text: 'Take photo',
        onPress: () => {
          if (opts.removeOnCancel) setPending(id);
          router.push('/camera');
        },
      },
      {
        text: 'Photo library',
        onPress: () => {
          if (opts.removeOnCancel) setPending(id);
          void (async () => {
            const ok = await pickLibraryFor(id, { goCrop: true });
            if (!ok) dropIfNew();
            else setPending(null);
          })();
        },
      },
      {
        text: 'Cancel',
        style: 'cancel',
        onPress: dropIfNew,
      },
    ]);
  };

  const onPersonPress = async (id: string) => {
    if (process.env.EXPO_OS === 'ios') {
      void Haptics.selectionAsync();
    }
    const person = subjects.find((s) => s.id === id);
    if (!person) return;

    if (mode === 'sheet') {
      if (!person.url) {
        offerSheetCapture(id, { removeOnCancel: false });
        return;
      }
      focus(id);
      return;
    }

    if (mode === 'library') {
      if (!person.url) {
        await pickLibraryFor(id);
        return;
      }
      if (person.id === activeId) {
        await pickLibraryFor(id);
        return;
      }
    }

    focus(id);
  };

  const onAdd = async () => {
    if (process.env.EXPO_OS === 'ios') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const id = addPerson();
    if (mode === 'library') {
      const ok = await pickLibraryFor(id);
      if (!ok) removePerson(id);
      return;
    }
    if (mode === 'sheet') {
      offerSheetCapture(id, { removeOnCancel: true });
      return;
    }
    focus(id);
  };

  return (
    <View
      style={{
        borderBottomWidth: 1,
        borderBottomColor: colors.line,
        backgroundColor: colors.bgElevated,
      }}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: space.lg,
          paddingVertical: space.md,
          gap: space.sm,
          alignItems: 'center',
        }}
      >
        {subjects.map((p) => {
          const selected = p.id === activeId;
          const thumbUri =
            thumbs === 'source' ? p.url : (p.previewUri ?? p.url);
          return (
            <Pressable
              key={p.id}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityHint={
                mode === 'library'
                  ? selected
                    ? 'Opens library to change this photo'
                    : p.url
                      ? 'Shows this person’s crop'
                      : 'Choose a photo for this person'
                  : mode === 'sheet' && !p.url
                    ? 'Take a photo or choose from library'
                    : undefined
              }
              onPress={() => void onPersonPress(p.id)}
              onLongPress={() => {
                if (subjects.length > 1) removePerson(p.id);
              }}
              style={{
                width: 64,
                alignItems: 'center',
                gap: 6,
              }}
            >
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: radii.sm,
                  borderCurve: 'continuous',
                  overflow: 'hidden',
                  borderWidth: selected ? 2 : 1,
                  borderColor: selected ? colors.accent : colors.line,
                  backgroundColor: colors.line,
                }}
              >
                {thumbUri ? (
                  <Image
                    source={{ uri: thumbUri }}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                  />
                ) : (
                  <View
                    style={{
                      flex: 1,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: colors.inkFaint, fontSize: 18 }}>+</Text>
                  </View>
                )}
              </View>
              <Text
                numberOfLines={1}
                style={{
                  ...type.caption,
                  color: selected ? colors.ink : colors.inkMuted,
                  maxWidth: 64,
                  textAlign: 'center',
                }}
              >
                {p.label}
              </Text>
            </Pressable>
          );
        })}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add person"
          onPress={() => void onAdd()}
          style={{
            width: 52,
            height: 52,
            borderRadius: radii.sm,
            borderCurve: 'continuous',
            borderWidth: 1,
            borderStyle: 'dashed',
            borderColor: colors.inkFaint,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 22,
          }}
        >
          <Text style={{ color: colors.ink, fontSize: 22, fontWeight: '500' }}>
            +
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
