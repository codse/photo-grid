import { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ConfigSnapshot } from '@/platform/prefs';
import { labelForConfig } from '@/features/sheet/config-label';
import { colors, fonts, radii, space, type } from '@/ui/tokens';

type Props = {
  preset: ConfigSnapshot;
  onApply: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
};

export function PresetRow({
  preset,
  onApply,
  onRename,
  onDelete,
}: Props) {
  const { title, detail } = labelForConfig(preset);
  const [menu, setMenu] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(preset.name);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (renaming) setName(preset.name);
  }, [renaming, preset.name]);

  return (
    <>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: 56,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${title}. ${detail}`}
          onPress={onApply}
          style={({ pressed }) => ({
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 14,
            paddingLeft: space.lg,
            paddingRight: space.sm,
            backgroundColor: pressed ? colors.accentSoft : 'transparent',
            gap: space.md,
          })}
        >
          <View style={{ flex: 1, gap: 2 }}>
            <Text
              style={{
                ...type.body,
                fontFamily: fonts.medium,
                color: colors.ink,
              }}
            >
              {title}
            </Text>
            <Text style={{ ...type.caption, color: colors.inkFaint }}>
              {detail}
            </Text>
          </View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Options for ${title}`}
          hitSlop={8}
          onPress={() => setMenu(true)}
          style={{
            paddingHorizontal: space.lg,
            paddingVertical: 14,
          }}
        >
          <Text style={{ ...type.body, color: colors.inkFaint, letterSpacing: 2 }}>
            •••
          </Text>
        </Pressable>
      </View>

      <Modal
        visible={menu}
        transparent
        animationType="fade"
        onRequestClose={() => setMenu(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(42,33,28,0.35)',
            justifyContent: 'flex-end',
            padding: space.xl,
            paddingBottom: Math.max(insets.bottom, space.xl),
          }}
          onPress={() => setMenu(false)}
        >
          <View
            style={{
              backgroundColor: colors.bgElevated,
              borderRadius: radii.lg,
              borderCurve: 'continuous',
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: colors.line,
            }}
          >
            <Text
              style={{
                ...type.caption,
                color: colors.inkFaint,
                padding: space.lg,
                paddingBottom: space.sm,
              }}
            >
              {title}
            </Text>
            <Action
              label="Use preset"
              onPress={() => {
                setMenu(false);
                onApply();
              }}
            />
            <Action
              label="Rename"
              onPress={() => {
                setMenu(false);
                setRenaming(true);
              }}
            />
            <Action
              label="Delete"
              destructive
              onPress={() => {
                setMenu(false);
                onDelete();
              }}
            />
            <Action label="Cancel" onPress={() => setMenu(false)} />
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={renaming}
        transparent
        animationType="fade"
        onRequestClose={() => setRenaming(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(42,33,28,0.35)',
            justifyContent: 'center',
            padding: space.xl,
          }}
          onPress={() => setRenaming(false)}
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
              Rename preset
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              autoFocus
              selectTextOnFocus
              maxLength={48}
              returnKeyType="done"
              onSubmitEditing={() => {
                if (name.trim()) onRename(name);
                setRenaming(false);
              }}
              style={{
                ...type.body,
                color: colors.ink,
                borderWidth: 1,
                borderColor: colors.line,
                borderRadius: radii.sm,
                paddingVertical: 12,
                paddingHorizontal: 14,
                backgroundColor: colors.bg,
              }}
            />
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <Pressable
                onPress={() => setRenaming(false)}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  alignItems: 'center',
                  borderRadius: radii.md,
                  backgroundColor: colors.line,
                }}
              >
                <Text style={{ fontFamily: fonts.semibold, color: colors.ink }}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (name.trim()) onRename(name);
                  setRenaming(false);
                }}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  alignItems: 'center',
                  borderRadius: radii.md,
                  backgroundColor: colors.accent,
                }}
              >
                <Text style={{ fontFamily: fonts.semibold, color: '#fff' }}>
                  Save
                </Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

function Action({
  label,
  onPress,
  destructive,
}: {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        paddingVertical: 14,
        paddingHorizontal: space.lg,
        backgroundColor: pressed ? colors.accentSoft : 'transparent',
        borderTopWidth: 1,
        borderTopColor: colors.line,
      })}
    >
      <Text
        style={{
          ...type.body,
          fontFamily: fonts.medium,
          color: destructive ? colors.danger : colors.ink,
          textAlign: 'center',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
