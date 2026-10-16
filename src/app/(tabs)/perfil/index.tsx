import { router, type Href } from 'expo-router';
import { Accessibility, Bell, CircleHelp, IdCard, MapPin, ShieldCheck } from 'lucide-react-native';
import { Fragment } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { referenceUnitName } from '@/components/perfil/reference-unit';
import { SettingsRow } from '@/components/SettingsRow';
import { useContrastColors, useScaledSize, useScaledTypography, useSettings, type Settings } from '@/features/settings';
import { mockUser } from '@/mocks/user';
import { colors, radii, screenPadding, shadows, spacing } from '@/theme';

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

export default function PerfilScreen() {
  const { settings } = useSettings();
  const type = useScaledTypography();
  const size = useScaledSize();
  const palette = useContrastColors();
  const rows = buildRows(settings);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[type.title, styles.title, { color: palette.textHeading }]} accessibilityRole="header">
          Perfil
        </Text>

        <View style={styles.identity}>
          <Avatar size={72} />
          <View style={styles.identityTexts}>
            <Text style={[type.headline, { fontSize: size(20), lineHeight: size(26), color: palette.textHeading }]}>
              {mockUser.fullName}
            </Text>
            <Text style={[type.caption, { color: palette.textSecondary }]}>{mockUser.city}</Text>
          </View>
        </View>

        <View style={[styles.card, { borderColor: palette.border }]} accessible accessibilityLabel={`Cartão SUS, número ${mockUser.cns}`}>
          <View style={styles.cardHeader}>
            <IdCard size={22} color={colors.primary} strokeWidth={1.6} />
            <Text style={[type.bodyMedium, { color: palette.textHeading }]}>Cartão SUS</Text>
          </View>
          <Text style={[type.headline, styles.cns, { fontSize: size(22), lineHeight: size(28) }]}>{mockUser.cns}</Text>
          <Text style={[type.caption, { color: palette.textSecondary }]}>Nascimento: {mockUser.birthDate}</Text>
        </View>

        <View style={[styles.list, { borderColor: palette.border }]}>
          {rows.map((row, index) => (
            <Fragment key={row.label}>
              {index > 0 ? <View style={[styles.divider, { backgroundColor: palette.border }]} /> : null}
              <SettingsRow icon={row.icon} label={row.label} detail={row.detail} onPress={() => router.push(row.href)} />
            </Fragment>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: screenPadding, paddingTop: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.xxl },
  title: { paddingHorizontal: spacing.xs },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, paddingHorizontal: spacing.xs },
  identityTexts: { flex: 1, gap: spacing.xxs },
  card: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    backgroundColor: colors.mint,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cns: { letterSpacing: 1, color: colors.primary },
  list: {
    borderRadius: radii.lg,
    borderWidth: 1,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    ...shadows.card,
  },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 54 },
});
