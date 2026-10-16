import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OptionCard } from '@/components/OptionCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { CARE_OPTIONS } from '@/features/care-options';
import { colors, screenPadding, spacing, typography } from '@/theme';

const STAGGER_MS = 60;

const entering = (index: number) =>
  FadeInDown.duration(320)
    .delay(80 + index * STAGGER_MS)
    .withInitialValues({ transform: [{ translateY: 12 }] })
    .reduceMotion(ReduceMotion.System);

function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

export default function CuidarSaudeScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader onBack={goBack} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.intro}>
          <Text
            style={styles.title}
            accessibilityRole="header"
            accessibilityLabel="Como você quer cuidar da saúde?">
            {'Como você quer\ncuidar da saúde?'}
          </Text>
          <Text style={styles.subtitle}>Escolha uma opção para continuar.</Text>
        </View>

        <View style={styles.options}>
          {CARE_OPTIONS.map((option, index) => (
            <Animated.View key={option.key} entering={entering(index)}>
              <OptionCard
                icon={option.icon}
                title={option.title}
                subtitle={option.subtitle}
                onPress={option.open}
                testID={`cuidar-saude-${option.key}`}
              />
            </Animated.View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: screenPadding, paddingBottom: spacing.xl },
  intro: { marginTop: spacing.lg, gap: spacing.sm, paddingHorizontal: spacing.xxs },
  title: { ...typography.display, color: colors.textHeading },
  subtitle: { ...typography.bodyLarge, color: colors.textSecondary },
  options: { marginTop: spacing.xxl, gap: spacing.lg },
});
