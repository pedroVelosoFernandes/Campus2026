import { router, type Href } from 'expo-router';
import { Accessibility, Bell, CircleHelp, MapPin, ShieldCheck } from 'lucide-react-native';
import { Fragment, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Avatar } from '@/components/Avatar';
import { NameSheet } from '@/components/NameSheet';
import { AccountCard } from '@/components/perfil/AccountCard';
import { HealthCardCard } from '@/components/perfil/HealthCardCard';
import { referenceUnitName } from '@/components/perfil/reference-unit';
import { PressableScale } from '@/components/PressableScale';
import { SettingsRow } from '@/components/SettingsRow';
import { useContrastColors, useSettings, type Settings } from '@/features/settings';
import { colors, radii, screenPadding, shadows, spacing, typography } from '@/theme';

type Row = { icon: typeof MapPin; label: string; detail: string; href: Href };

function notificationsSummary({ notifications }: Settings): string {
  const on = [
    notifications.vaccineReminders && 'vacinas',
    notifications.appointmentReminders && 'consultas',
    notifications.campaignAlerts && 'campanhas',
  ].filter(Boolean);
  if (on.length === 0) return 'Lembretes desligados';
  return `Lembretes de ${on.join(', ').replace(/, ([^,]*)$/, ' e $1')}`;
}

function buildRows(settings: Settings): Row[] {
  return [
    { icon: MapPin, label: 'Unidade de referência', detail: referenceUnitName(settings.referenceUnitId), href: '/perfil/unidade' },
    { icon: Bell, label: 'Notificações', detail: notificationsSummary(settings), href: '/perfil/notificacoes' },
    { icon: Accessibility, label: 'Acessibilidade', detail: 'Tamanho do texto e leitura em voz alta', href: '/perfil/acessibilidade' },
    { icon: ShieldCheck, label: 'Privacidade e dados', detail: 'Como usamos suas informações (LGPD)', href: '/perfil/privacidade' },
    { icon: CircleHelp, label: 'Ajuda', detail: 'Dúvidas sobre o app e o SUS', href: '/perfil/ajuda' },
  ];
}

function Identity({ name, onEditName }: { name: string; onEditName: () => void }) {
  const palette = useContrastColors();
  return (
    <View style={styles.identity}>
      <Avatar size={72} />
      <View style={styles.identityTexts}>
        <AppText style={[typography.headline, styles.name, { color: palette.textHeading }]} numberOfLines={2}>
          {name || 'Olá!'}
        </AppText>
        <PressableScale onPress={onEditName} hitSlop={8} pressedScale={0.97} style={styles.editName}>
          <AppText style={styles.editNameText}>{name ? 'Editar nome' : 'Como podemos te chamar?'}</AppText>
        </PressableScale>
      </View>
    </View>
  );
}

export default function PerfilScreen() {
  const { settings } = useSettings();
  const palette = useContrastColors();
  const [editingName, setEditingName] = useState(false);
  const rows = buildRows(settings);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppText style={[typography.title, styles.title, { color: palette.textHeading }]} accessibilityRole="header">
          Perfil
        </AppText>

        <Identity name={settings.profile.name} onEditName={() => setEditingName(true)} />
        <AccountCard />
        <HealthCardCard />

        <View style={[styles.list, { borderColor: palette.border }]}>
          {rows.map((row, index) => (
            <Fragment key={row.label}>
              {index > 0 ? <View style={[styles.divider, { backgroundColor: palette.border }]} /> : null}
              <SettingsRow icon={row.icon} label={row.label} detail={row.detail} onPress={() => router.push(row.href)} />
            </Fragment>
          ))}
        </View>
      </ScrollView>
      <NameSheet visible={editingName} onClose={() => setEditingName(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: screenPadding, paddingTop: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.xxl },
  title: { paddingHorizontal: spacing.xs },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, paddingHorizontal: spacing.xs },
  identityTexts: { flex: 1, gap: spacing.xxs },
  name: { fontSize: 20, lineHeight: 26 },
  editName: { minHeight: 32, justifyContent: 'center', alignSelf: 'flex-start' },
  editNameText: { ...typography.bodyMedium, fontSize: 15, color: colors.primary },
  list: {
    borderRadius: radii.lg,
    borderWidth: 1,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    ...shadows.card,
  },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 54 },
});
