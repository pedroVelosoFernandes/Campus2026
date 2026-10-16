import type { LucideIcon } from 'lucide-react-native';
import { memo, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { IconTile } from '@/components/IconTile';
import { colors, radii, shadows, spacing, typography } from '@/theme';

type Action = { label: string; onPress: () => void; icon?: LucideIcon; disabled?: boolean; hint?: string };

export type StatusCardProps = {
  icon: LucideIcon;
  title: string;
  message: string;
  primary?: Action;
  secondary?: Action;
  /** Conteúdo extra entre o texto e os botões (ex.: campo da cidade). */
  children?: ReactNode;
};

/**
 * Cartão sobreposto ao mapa para os estados sem unidade: explicação antes do
 * pedido de localização, cidade digitada e "nenhuma unidade encontrada".
 * Mesmo formato do `UnitCard`, para a tela não "pular".
 */
function StatusCardBase({ icon, title, message, primary, secondary, children }: StatusCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header} accessible accessibilityLabel={`${title}. ${message}`}>
        <IconTile icon={icon} size={60} />
        <View style={styles.texts}>
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          <Text style={styles.message}>{message}</Text>
        </View>
      </View>
      {children}
      <View style={styles.actions}>
        {primary ? (
          <Button
            label={primary.label}
            icon={primary.icon}
            onPress={primary.onPress}
            disabled={primary.disabled}
            accessibilityHint={primary.hint}
          />
        ) : null}
        {secondary ? (
          <Button
            label={secondary.label}
            variant="outline"
            icon={secondary.icon}
            onPress={secondary.onPress}
            disabled={secondary.disabled}
            accessibilityHint={secondary.hint}
          />
        ) : null}
      </View>
    </View>
  );
}

export const StatusCard = memo(StatusCardBase);

const styles = StyleSheet.create({
  card: {
    gap: spacing.lg,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.lg },
  texts: { flex: 1, gap: spacing.xxs },
  title: { ...typography.headline, color: colors.textHeading },
  message: { ...typography.caption, fontSize: 15, lineHeight: 21, color: colors.textSecondary },
  actions: { gap: spacing.md },
});
