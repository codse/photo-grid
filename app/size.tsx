import { ScrollView } from 'react-native';
import { router } from 'expo-router';
import { CheckIcon } from 'phosphor-react-native/src/icons/Check';
import { PhotoPaperPicker } from '@/features/sheet/photo-paper-picker';
import { Button } from '@/ui/primitives';
import { space } from '@/ui/tokens';

/** Size/paper settings — opened from home “Change”, not the front door. */
export default function SizeScreen() {
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        padding: space.xl,
        gap: space.xl,
        paddingBottom: 48,
      }}
    >
      <PhotoPaperPicker />
      <Button
        label="Done"
        onPress={() => router.back()}
        icon={<CheckIcon size={18} color="#fff" weight="bold" />}
      />
    </ScrollView>
  );
}
