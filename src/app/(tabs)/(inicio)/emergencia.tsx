import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { callNumber, EMERGENCY_CONTACTS } from '@/components/emergencia/contacts';
import { EmergencyCallCard } from '@/components/emergencia/EmergencyCallCard';
import { WarningSigns } from '@/components/emergencia/WarningSigns';
import { InfoNote } from '@/components/InfoNote';
import { ScreenHeader } from '@/components/ScreenHeader';
import { colors, screenPadding, spacing, typography } from '@/theme';

function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

function call(number: string) {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  void callNumber(number);
}

/** Telefones de emergência e sinais de alerta. Rota: /emergencia. */
export default function EmergenciaScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Emergência" onBack={goBack} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.intro}>
          <Text style={styles.title} accessibilityRole="header">
            Precisa de ajuda agora?
          </Text>
          <Text style={styles.subtitle}>Ligação gratuita, de qualquer telefone. SAMU, Bombeiros e CVV atendem 24 horas.</Text>
        </View>

        <View style={styles.cards}>
          {EMERGENCY_CONTACTS.map((contact) => (
            <EmergencyCallCard key={contact.number} contact={contact} onCall={call} />
          ))}
        </View>

        <WarningSigns />

        <InfoNote message="O Alô Saúde orienta o acesso ao SUS e não substitui o atendimento de um profissional de saúde." />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: screenPadding, paddingBottom: spacing.xxxl, gap: spacing.xxl },
  intro: { marginTop: spacing.sm, gap: spacing.sm, paddingHorizontal: spacing.xxs },
  title: { ...typography.title, color: colors.textHeading },
  subtitle: { ...typography.bodyLarge, color: colors.textSecondary },
  cards: { gap: spacing.md },
});
