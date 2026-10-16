import { router } from 'expo-router';
import { Keyboard, Mic } from 'lucide-react-native';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { EmergencyLink } from '@/components/emergencia/EmergencyLink';
import { HomeHeader } from '@/components/HomeHeader';
import { MicOrb } from '@/components/MicOrb';
import { ShortcutCard } from '@/components/ShortcutCard';
import { CARE_OPTIONS, type CareOption } from '@/features/care-options';
import { useNotifications } from '@/features/notifications/store';
import { mockUser } from '@/mocks/user';
import { colors, screenPadding, spacing, typography } from '@/theme';

const openAssistant = () => router.push('/assistente');
const openChat = () => router.navigate('/conversas');
const openNotifications = () => router.push('/notificacoes');
const openEmergency = () => router.push('/emergencia');

/** As quatro opções de "Como você quer cuidar da saúde?" em grade 2×2. */
const ROWS: CareOption[][] = [CARE_OPTIONS.slice(0, 2), CARE_OPTIONS.slice(2, 4)];

export default function InicioScreen() {
  const { unreadCount } = useNotifications();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <HomeHeader
          firstName={mockUser.firstName}
          unreadCount={unreadCount}
          onNotificationsPress={openNotifications}
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
          Cuidar da saúde
        </Text>
        <View style={styles.grid}>
          {ROWS.map((row) => (
            <View key={row[0]?.key} style={styles.gridRow}>
              {row.map((option) => (
                <ShortcutCard
                  key={option.key}
                  icon={option.icon}
                  title={option.title}
                  subtitle={option.subtitle}
                  onPress={option.open}
                  testID={`inicio-${option.key}`}
                />
              ))}
            </View>
          ))}
        </View>

        <View style={styles.emergency}>
          <EmergencyLink onPress={openEmergency} />
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
  section: { ...typography.headline, color: colors.textHeading, marginTop: spacing.xxl + spacing.xs, marginBottom: spacing.md },
  grid: { gap: spacing.md },
  gridRow: { flexDirection: 'row', gap: spacing.md },
  emergency: { marginTop: spacing.lg },
});
