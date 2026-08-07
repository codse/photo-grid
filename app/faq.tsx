import { ScrollView, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { FAQ } from '@/legal/docs';
import { Accordion, DisclaimerCallout } from '@/ui/accordion';
import { colors, space, type } from '@/ui/tokens';

export default function FaqScreen() {
  const items = FAQ.sections.map((section, i) => ({
    id: `faq-${i}`,
    title: section.heading,
    body: section.body,
  }));

  return (
    <>
      <Stack.Screen options={{ title: FAQ.title }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          padding: space.xl,
          paddingBottom: 56,
          gap: space.xl,
        }}
      >
        <Text style={{ ...type.caption, color: colors.inkFaint }}>
          Updated {FAQ.updated}
        </Text>

        <DisclaimerCallout title="Important">
          Passport Photo Print helps you size and print photos. We are not
          responsible if a government, embassy, visa center, or photo lab
          rejects your photos, application, or prints — for any reason,
          including size, background, lighting, expression, quality, or
          changing rules. Always verify current official requirements before
          you submit.
        </DisclaimerCallout>

        <Accordion items={items} defaultOpenId={items[0]?.id} />
      </ScrollView>
    </>
  );
}
