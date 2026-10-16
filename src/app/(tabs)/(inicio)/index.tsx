import { router } from 'expo-router';
import { Keyboard, Mic } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { EmergencyLink } from '@/components/emergencia/EmergencyLink';
import { HomeHeader } from '@/components/HomeHeader';
import { MicOrb } from '@/components/MicOrb';
import { NameSheet } from '@/components/NameSheet';
import { ShortcutCard } from '@/components/ShortcutCard';
import { CARE_OPTIONS, type CareOption } from '@/features/care-options';
import { useNotifications } from '@/features/notifications/store';
import { useSettings } from '@/features/settings';
import { colors, screenPadding, spacing, typography } from '@/theme';

const openAssistant = () => router.push('/assistente');
const openChat = () => router.navigate('/conversas/chat');
const openNotifications = () => router.push('/notificacoes');
const openEmergency = () => router.push('/emergencia');

/** As quatro opções de "Como você quer cuidar da saúde?" em grade 2×2. */
const ROWS: CareOption[][] = [CARE_OPTIONS.slice(0, 2), CARE_OPTIONS.slice(2, 4)];

/** Orbe compacto: a grade inteira cabe acima da barra de abas num iPhone 17 Pro. */
const ORB_SIZE = 76;

function CareGrid() {
  return (
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
  );
}

export default function InicioScreen() {
  const { unreadCount } = useNotifications();
  const { profile } = useSettings().settings;
  const [askingName, setAskingName] = useState(false);
  const showNameInvite = !profile.name && !profile.namePromptDone;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <HomeHeader
          name={profile.name}
          onAskName={showNameInvite ? () => setAskingName(true) : undefined}
          unreadCount={unreadCount}
          onNotificationsPress={openNotifications}
        />

        <View style={styles.intro}>
          <AppText style={styles.title} accessibilityRole="header">
            Como podemos ajudar?
          </AppText>
          <AppText style={styles.subtitle}>Conte o que você precisa, por voz ou texto.</AppText>
        </View>

        <View style={styles.orb}>
          <MicOrb size={ORB_SIZE} onPress={openAssistant} accessibilityLabel="Falar com o assistente por voz" />
        </View>

        <View style={styles.actions}>
          <Button label="Conversar agora" icon={Mic} onPress={openAssistant} />
          <Button label="Prefiro escrever" icon={Keyboard} variant="secondary" onPress={openChat} />
        </View>

        <AppText style={styles.section} accessibilityRole="header">
          Cuidar da saúde
        </AppText>
        <CareGrid />

        <EmergencyLink onPress={openEmergency} />
      </ScrollView>
      <NameSheet visible={askingName} onClose={() => setAskingName(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: screenPadding, paddingTop: spacing.xs, paddingBottom: spacing.sm },
  // zIndex: o texto fica acima do brilho do orbe.
  intro: { zIndex: 1, marginTop: spacing.md, paddingHorizontal: spacing.xs, gap: spacing.xs },
  title: { ...typography.display, fontSize: 30, lineHeight: 36, color: colors.textHeading },
  subtitle: { ...typography.body, color: colors.textSecondary },
  // Os anéis de brilho passam um pouco por trás do texto e dos botões, como no design.
  orb: { alignItems: 'center', marginTop: -spacing.xs, marginBottom: -spacing.lg },
  actions: { gap: spacing.sm + 2 },
  section: { ...typography.headline, color: colors.textHeading, marginTop: spacing.lg, marginBottom: spacing.sm + 2 },
  grid: { gap: spacing.sm + 2 },
  gridRow: { flexDirection: 'row', gap: spacing.sm + 2 },
});
