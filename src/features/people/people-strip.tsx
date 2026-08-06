import { Image } from 'expo-image';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSession } from '@/state/session';
import { pickFromLibrary } from '@/platform/media';
import { colors, radii, space, type } from '@/ui/tokens';

type Props = {
  /**
   * Crop / photo step: tap empty or re-tap selected person to pick/replace a photo.
   * Tap another person with a photo to switch.
   */
  enablePhotoPick?: boolean;
  onPersonFocus?: (id: string) => void;
};

export function PeopleStrip({ enablePhotoPick, onPersonFocus }: Props) {
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

  const pickFor = async (id: string) => {
    try {
      const img = await pickFromLibrary();
      if (!img) return;
      setPersonUri(id, img.uri, { sourceName: img.fileName ?? img.uri });
      focus(id);
    } catch (e) {
      Alert.alert(
        'Could not open library',
        e instanceof Error ? e.message : 'Unknown error',
      );
    }
  };

  const onPersonPress = async (id: string) => {
    if (process.env.EXPO_OS === 'ios') {
      void Haptics.selectionAsync();
    }
    const person = subjects.find((s) => s.id === id);
    if (!person) return;

    if (enablePhotoPick) {
      if (!person.url) {
        await pickFor(id);
        return;
      }
      if (person.id === activeId) {
        // Re-tap selected → replace photo
        await pickFor(id);
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
    if (enablePhotoPick) {
      await pickFor(id);
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
          return (
            <Pressable
              key={p.id}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityHint={
                enablePhotoPick
                  ? selected
                    ? 'Opens library to change this photo'
                    : p.url
                      ? 'Shows this person’s crop'
                      : 'Choose a photo for this person'
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
                {p.url ? (
                  <Image
                    source={{ uri: p.url }}
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
