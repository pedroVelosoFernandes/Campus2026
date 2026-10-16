import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LEGAL_CONTENT } from '@/components/auth/legal-content';
import { ScreenHeader } from '@/components/ScreenHeader';
import { colors, radii, screenPadding, spacing, typography } from '@/theme';

function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/onboarding');
}

export default function LegalScreen() {
  const { doc } = useLocalSearchParams<{ doc?: string }>();
  const content = LEGAL_CONTENT[doc === 'privacidade' ? 'privacidade' : 'termos'];
  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader onBack={goBack} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title} accessibilityRole="header">
          {content.title}
        </Text>
        <View style={styles.card}>
          {content.sections.map((section, index) => (
            <View key={section.heading} style={[styles.section, index > 0 && styles.divider]}>
              <Text style={styles.heading}>{section.heading}</Text>
              <Text style={styles.text}>{section.text}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: screenPadding, paddingTop: spacing.sm, paddingBottom: spacing.xxxl, gap: spacing.xl },
  title: { ...typography.title, color: colors.textHeading, paddingHorizontal: spacing.xs },
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
  },
  section: { paddingVertical: spacing.lg, gap: spacing.xs },
  divider: { borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: colors.border },
  heading: { ...typography.headline, color: colors.textHeading },
  text: { ...typography.body, color: colors.textSecondary },
});
