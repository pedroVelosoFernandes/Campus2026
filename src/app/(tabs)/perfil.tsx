import { Accessibility, Bell, CircleHelp, IdCard, MapPin, ShieldCheck } from 'lucide-react-native';
import { Fragment } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { SettingsRow } from '@/components/SettingsRow';
import { mockUser } from '@/mocks/user';
import { colors, radii, screenPadding, shadows, spacing, typography } from '@/theme';

const ROWS = [
  { icon: MapPin, label: 'Unidade de referência', detail: mockUser.referenceUnit },
  { icon: Bell, label: 'Notificações', detail: 'Lembretes de vacinas e consultas' },
  { icon: Accessibility, label: 'Acessibilidade', detail: 'Tamanho do texto e leitura em voz alta' },
  { icon: ShieldCheck, label: 'Privacidade e dados', detail: 'Como usamos suas informações (LGPD)' },
  { icon: CircleHelp, label: 'Ajuda', detail: 'Dúvidas sobre o app' },
] as const;

export default function PerfilScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title} accessibilityRole="header">
          Perfil
        </Text>

        <View style={styles.identity}>
          <Avatar size={72} />
          <View style={styles.identityTexts}>
            <Text style={styles.name}>{mockUser.fullName}</Text>
            <Text style={styles.meta}>{mockUser.city}</Text>
          </View>
        </View>

        <View style={styles.card} accessible accessibilityLabel={`Cartão SUS, número ${mockUser.cns}`}>
          <View style={styles.cardHeader}>
            <IdCard size={22} color={colors.primary} strokeWidth={1.6} />
            <Text style={styles.cardTitle}>Cartão SUS</Text>
          </View>
          <Text style={styles.cns}>{mockUser.cns}</Text>
          <Text style={styles.meta}>Nascimento: {mockUser.birthDate}</Text>
        </View>

        <View style={styles.list}>
          {ROWS.map((row, index) => (
            <Fragment key={row.label}>
              {index > 0 ? <View style={styles.divider} /> : null}
              <SettingsRow icon={row.icon} label={row.label} detail={row.detail} />
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
  title: { ...typography.title, color: colors.textHeading, paddingHorizontal: spacing.xs },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, paddingHorizontal: spacing.xs },
  identityTexts: { flex: 1, gap: spacing.xxs },
  name: { ...typography.headline, fontSize: 20, lineHeight: 26, color: colors.textHeading },
  meta: { ...typography.caption, color: colors.textSecondary },
  card: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.mint,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardTitle: { ...typography.bodyMedium, color: colors.textHeading },
  cns: { ...typography.headline, fontSize: 22, lineHeight: 28, letterSpacing: 1, color: colors.primary },
  list: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    ...shadows.card,
  },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 54 },
});
