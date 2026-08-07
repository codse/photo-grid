import { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { defaultPresetName } from '@/features/sheet/config-label';
import { useSession } from '@/state/session';
import { colors, fonts, radii, space, type } from '@/ui/tokens';

/** Name + save current print settings as a reusable preset. */
export function SavePresetButton() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const insets = useSafeAreaInsets();
  const photoId = useSession((s) => s.photoId);
  const paperId = useSession((s) => s.paperId);
  const saveNamedPreset = useSession((s) => s.saveNamedPreset);

  useEffect(() => {
    if (!open) return;
    setName(defaultPresetName({ photoId, paperId }));
  }, [open, photoId, paperId]);

  const save = () => {
    saveNamedPreset(name);
    setOpen(false);
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('sheetOptions.savePreset')}
        onPress={() => setOpen(true)}
        style={({ pressed }) => ({
          paddingVertical: 14,
          paddingHorizontal: 16,
          borderRadius: radii.md,
          borderCurve: 'continuous',
          borderWidth: 1,
          borderColor: colors.line,
          backgroundColor: pressed ? colors.accentSoft : colors.bgElevated,
          alignItems: 'center',
        })}
      >
        <Text
          style={{
            ...type.body,
            fontFamily: fonts.semibold,
            color: colors.accent,
          }}
        >
          {t('sheetOptions.savePreset')}
        </Text>
        <Text style={{ ...type.caption, color: colors.inkFaint, marginTop: 2 }}>
          {t('sheetOptions.savePresetHint')}
        </Text>
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
          <Pressable
            style={{
              flex: 1,
              backgroundColor: 'rgba(42,33,28,0.35)',
              justifyContent: 'center',
              padding: space.xl,
              paddingBottom: Math.max(insets.bottom, space.xl),
            }}
            onPress={() => setOpen(false)}
          >
            <View
              style={{
                backgroundColor: colors.bgElevated,
                borderRadius: radii.lg,
                borderCurve: 'continuous',
                padding: space.xl,
                gap: space.md,
                borderWidth: 1,
                borderColor: colors.line,
              }}
            >
              <Text style={{ ...type.title, fontSize: 20, color: colors.ink }}>
                {t('sheetOptions.namePreset')}
              </Text>
              <Text style={{ ...type.caption, color: colors.inkMuted }}>
                {t('sheetOptions.namePresetHint')}
              </Text>
              <TextInput
                value={name}
                onChangeText={setName}
                autoFocus
                selectTextOnFocus
                maxLength={48}
                placeholder={t('sheetOptions.presetNamePlaceholder')}
                placeholderTextColor={colors.inkFaint}
                returnKeyType="done"
                onSubmitEditing={save}
                style={{
                  ...type.body,
                  color: colors.ink,
                  borderWidth: 1,
                  borderColor: colors.line,
                  borderRadius: radii.sm,
                  borderCurve: 'continuous',
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  backgroundColor: colors.bg,
                }}
              />
              <View style={{ flexDirection: 'row', gap: space.sm, marginTop: 4 }}>
                <Pressable
                  onPress={() => setOpen(false)}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    alignItems: 'center',
                    borderRadius: radii.md,
                    borderCurve: 'continuous',
                    backgroundColor: colors.line,
                  }}
                >
                  <Text style={{ fontFamily: fonts.semibold, color: colors.ink }}>
                    {t('common.cancel')}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={save}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    alignItems: 'center',
                    borderRadius: radii.md,
                    borderCurve: 'continuous',
                    backgroundColor: colors.accent,
                  }}
                >
                  <Text style={{ fontFamily: fonts.semibold, color: '#fff' }}>
                    {t('export.save')}
                  </Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
      </Modal>
    </>
  );
}
