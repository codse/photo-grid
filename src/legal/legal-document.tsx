import { ScrollView, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import type { LegalDoc } from '@/legal/docs';
import { colors, fonts, space, type } from '@/ui/tokens';

export function LegalDocument({ doc }: { doc: LegalDoc }) {
  return (
    <>
      <Stack.Screen options={{ title: doc.title }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          padding: space.xl,
          paddingBottom: 56,
          gap: space.xl,
        }}
      >
        <Text style={{ ...type.caption, color: colors.inkFaint }}>
          Updated {doc.updated}
        </Text>
        {doc.sections.map((section) => (
          <View key={section.heading} style={{ gap: 6 }}>
            <Text
              style={{
                ...type.body,
                fontFamily: fonts.semibold,
                color: colors.ink,
              }}
            >
              {section.heading}
            </Text>
            <Text style={{ ...type.body, color: colors.inkMuted, lineHeight: 24 }}>
              {section.body}
            </Text>
          </View>
        ))}
      </ScrollView>
    </>
  );
}
