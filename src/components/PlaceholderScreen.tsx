import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing, typography } from '@/theme';

import { AppText } from './AppText';
import { ScreenHeader } from './ScreenHeader';

export type PlaceholderScreenProps = {
  title: string;
  /** Mostra o chevron de voltar (padrão: true). */
  showBack?: boolean;
};

function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

/** Tela provisória (título centralizado) enquanto a tela real não é construída. */
export function PlaceholderScreen({ title, showBack = true }: PlaceholderScreenProps) {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader onBack={showBack ? goBack : undefined} />
      <View style={styles.center}>
        <AppText accessibilityRole="header" style={styles.title}>
          {title}
        </AppText>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  title: { ...typography.title, color: colors.textHeading, textAlign: 'center' },
});
