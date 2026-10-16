import { router } from 'expo-router';
import { CalendarDays, Keyboard, Mic, Syringe } from 'lucide-react-native';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { HomeHeader } from '@/components/HomeHeader';
import { MicOrb } from '@/components/MicOrb';
import { ShortcutCard } from '@/components/ShortcutCard';
import { mockUser } from '@/mocks/user';
import { colors, screenPadding, spacing, typography } from '@/theme';

const openAssistant = () => router.push('/assistente');
const openChat = () => router.navigate('/conversas');
const openVaccination = () => router.push('/vacinacao');
const openRoutineCare = () => router.push('/cuidar-saude');
const noop = () => {};

export default function InicioScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <HomeHeader
          firstName={mockUser.firstName}
          hasNotifications={mockUser.hasUnreadNotifications}
          onNotificationsPress={noop}
        />

        <View style={styles.intro}>
          <Text style={styles.title} accessibilityRole="header">
            Como podemos ajudar?
          </Text>
          <Text style={styles.subtitle}>Conte o que você precisa, por voz ou texto.</Text>
        </View>

        <View style={styles.orb}>
          <MicOrb onPress={openAssistant} accessibilityLabel="Falar com o assistente por voz" />
        </View>

        <View style={styles.actions}>
          <Button label="Conversar agora" icon={Mic} onPress={openAssistant} />
          <Button label="Prefiro escrever" icon={Keyboard} variant="secondary" onPress={openChat} />
        </View>

        <Text style={styles.section} accessibilityRole="header">
          Atalhos
        </Text>
        <View style={styles.shortcuts}>
          <ShortcutCard icon={Syringe} label="Vacinas" onPress={openVaccination} />
          <ShortcutCard icon={CalendarDays} label="Consulta de rotina" onPress={openRoutineCare} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: screenPadding, paddingTop: spacing.xs, paddingBottom: spacing.xl },
  intro: { marginTop: spacing.xl, paddingHorizontal: spacing.xs, gap: spacing.sm },
  title: { ...typography.display, color: colors.textHeading },
  subtitle: { ...typography.body, fontSize: 16.5, color: colors.textSecondary },
  orb: { alignItems: 'center', marginTop: spacing.xs, marginBottom: spacing.xs },
  actions: { gap: spacing.md },
  section: { ...typography.headline, color: colors.textHeading, marginTop: spacing.xxl, marginBottom: spacing.md },
  shortcuts: { flexDirection: 'row', gap: spacing.md },
});
