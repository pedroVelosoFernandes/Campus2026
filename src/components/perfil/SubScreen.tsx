import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/ScreenHeader';
import { useContrastColors, useScaledTypography } from '@/features/settings';
import { colors, screenPadding, spacing } from '@/theme';

export type SubScreenProps = {
  title: string;
  /** Parágrafo curto abaixo do cabeçalho. */
  intro?: string;
  children: ReactNode;
  testID?: string;
};

function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/perfil');
}

/** Estrutura comum das telas do Perfil: chevron de voltar, título central e conteúdo rolável. */
export function SubScreen({ title, intro, children, testID }: SubScreenProps) {
  const type = useScaledTypography();
  const palette = useContrastColors();
  return (
    <SafeAreaView style={styles.safe} edges={['top']} testID={testID}>
      <ScreenHeader title={title} onBack={goBack} backLabel="Voltar para o Perfil" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {intro ? <Text style={[type.body, styles.intro, { color: palette.textSecondary }]}>{intro}</Text> : null}
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: {
    paddingHorizontal: screenPadding,
    paddingTop: spacing.sm,
    paddingBottom: spacing.huge,
    gap: spacing.xxl,
  },
  intro: { paddingHorizontal: spacing.xs },
});
