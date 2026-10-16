import { Hospital, Keyboard, LockKeyhole, Mic, Phone, ShieldCheck, type LucideIcon } from 'lucide-react-native';
import { memo, type ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { AppText } from '@/components/AppText';
import { IconTile } from '@/components/IconTile';
import { colors, radii, shadows, spacing, typography } from '@/theme';

/**
 * Ilustrações do onboarding, montadas com os mesmos elementos do app
 * (brilho menta do orbe, cartões brancos com borda, quadrados de ícone).
 * São decorativas: o leitor de tela lê só título e texto de cada página.
 */

const STAGE = 260;

function Stage({ children }: { children: ReactNode }) {
  return (
    <View style={styles.stage} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={styles.glowOuter} />
      <View style={styles.glowInner} />
      {children}
    </View>
  );
}

function Chip({ icon: Icon, label, style, tone = 'default' }: { icon: LucideIcon; label: string; style?: ViewStyle; tone?: 'default' | 'danger' }) {
  const danger = tone === 'danger';
  return (
    <View style={[styles.chip, danger && styles.chipDanger, style]}>
      <Icon size={18} color={danger ? colors.danger : colors.primary} strokeWidth={1.9} />
      <AppText style={[styles.chipLabel, danger && styles.chipLabelDanger]}>{label}</AppText>
    </View>
  );
}

function VoiceTextArtBase() {
  return (
    <Stage>
      <View style={styles.orb}>
        <Mic size={40} color={colors.onPrimary} strokeWidth={1.75} />
      </View>
      <Chip icon={Mic} label="Falar" style={styles.chipBottomLeft} />
      <Chip icon={Keyboard} label="Escrever" style={styles.chipTopRight} />
    </Stage>
  );
}

function GuidanceArtBase() {
  return (
    <Stage>
      <View style={styles.card}>
        <IconTile icon={Hospital} size={48} />
        <View style={styles.cardTexts}>
          <AppText style={styles.cardTitle}>UBS do seu bairro</AppText>
          <AppText style={styles.cardDetail}>Consulta de rotina</AppText>
        </View>
      </View>
      <Chip icon={Phone} label="Emergência: 192" tone="danger" style={styles.chipBelowCard} />
    </Stage>
  );
}

function PrivacyArtBase() {
  return (
    <Stage>
      <View style={styles.shieldHalo}>
        <IconTile icon={ShieldCheck} size={96} />
      </View>
      <Chip icon={LockKeyhole} label="LGPD" style={styles.chipTopLeft} />
    </Stage>
  );
}

export const VoiceTextArt = memo(VoiceTextArtBase);
export const GuidanceArt = memo(GuidanceArtBase);
export const PrivacyArt = memo(PrivacyArtBase);

const styles = StyleSheet.create({
  stage: { width: STAGE, height: STAGE, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  glowOuter: {
    position: 'absolute',
    width: STAGE,
    height: STAGE,
    borderRadius: STAGE / 2,
    backgroundColor: colors.glowOuter,
  },
  glowInner: {
    position: 'absolute',
    width: STAGE * 0.72,
    height: STAGE * 0.72,
    borderRadius: STAGE * 0.36,
    backgroundColor: colors.glowInner,
    opacity: 0.6,
  },
  orb: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: colors.primaryBright,
    backgroundImage: `radial-gradient(circle at 50% 45%, ${colors.orbCenter} 0%, ${colors.primaryBright} 52%, ${colors.primary} 100%)`,
    borderWidth: 3,
    borderColor: colors.glowRim,
    boxShadow: '0px 10px 28px rgba(31, 156, 158, 0.28)',
  },
  chip: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  chipDanger: { borderColor: '#F6D3D1', backgroundColor: '#FFF6F5' },
  chipLabel: { ...typography.bodyMedium, fontSize: 15, color: colors.textHeading },
  chipLabelDanger: { color: colors.dangerPressed },
  chipBottomLeft: { left: -8, bottom: 34 },
  chipTopRight: { right: -14, top: 36 },
  chipTopLeft: { left: 8, top: 40 },
  chipBelowCard: { bottom: 38 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    width: 248,
    marginTop: -40,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  cardTexts: { flex: 1, gap: spacing.xxs },
  cardTitle: { ...typography.bodyMedium, fontFamily: typography.label.fontFamily, color: colors.textHeading },
  cardDetail: { ...typography.caption, color: colors.textSecondary },
  shieldHalo: {
    width: 136,
    height: 136,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
});
