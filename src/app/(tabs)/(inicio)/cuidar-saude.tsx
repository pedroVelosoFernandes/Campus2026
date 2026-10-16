import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { OptionCard } from '@/components/OptionCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { CARE_OPTIONS } from '@/features/care-options';
import { useFontScale } from '@/features/settings';
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
  // A quebra do design só vale no tamanho padrão; com texto maior a linha quebra sozinha.
  const breakTitle = useFontScale() <= 1;
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader onBack={goBack} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.intro}>
          <AppText
            style={styles.title}
            accessibilityRole="header"
            accessibilityLabel="Como você quer cuidar da saúde?">
            {breakTitle ? 'Como você quer\ncuidar da saúde?' : 'Como você quer cuidar da saúde?'}
          </AppText>
          <AppText style={styles.subtitle}>Escolha uma opção para continuar.</AppText>
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
