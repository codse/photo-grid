import { ScrollView } from 'react-native';
import { router } from 'expo-router';
import { CheckIcon } from 'phosphor-react-native/src/icons/Check';
import { PhotoPaperPicker } from '@/features/sheet/photo-paper-picker';
import { SIZE_PAGE_ICON } from '@/features/sheet/size-icons';
import { Button, ScreenIntro } from '@/ui/primitives';
import { colors, space } from '@/ui/tokens';

/** Size/paper settings — opened from home “Change”, not the front door. */
export default function SizeScreen() {
  const IntroIcon = SIZE_PAGE_ICON;

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        padding: space.xl,
        gap: space.xl,
        paddingBottom: 48,
      }}
    >
      <ScreenIntro
        title="Size & paper"
        body="Defaults are fine for most jobs. Change only if you need a different document or pharmacy sheet."
        icon={<IntroIcon size={26} color={colors.accent} weight="duotone" />}
      />
      <PhotoPaperPicker />
      <Button
        label="Done"
        onPress={() => router.back()}
        icon={<CheckIcon size={18} color="#fff" weight="bold" />}
      />
    </ScrollView>
  );
}
