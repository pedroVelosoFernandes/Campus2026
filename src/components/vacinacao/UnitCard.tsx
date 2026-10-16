import { Building2, Navigation } from 'lucide-react-native';
import { memo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { IconTile } from '@/components/IconTile';
import { colors, radii, shadows, spacing, typography } from '@/theme';

export type UnitCardProps = {
  /** `null` enquanto a busca não terminou. */
  name: string | null;
  services: string;
  hint: string;
  onDirections: () => void;
  onOtherUnits: () => void;
  directionsDisabled?: boolean;
};

/** Cartão sobreposto ao mapa: unidade sugerida + "Como chegar" + "Ver outras unidades". */
function UnitCardBase({ name, services, hint, onDirections, onOtherUnits, directionsDisabled }: UnitCardProps) {
  return (
    <View style={styles.card}>
      {name ? (
        <View style={styles.header} accessible accessibilityLabel={`${name}. ${services}. ${hint}`}>
          <IconTile icon={Building2} size={60} />
          <View style={styles.texts}>
            <Text style={styles.name}>{name}</Text>
            <Text style={styles.line}>{services}</Text>
            <Text style={styles.line}>{hint}</Text>
          </View>
        </View>
      ) : (
        <View style={[styles.header, styles.loading]}>
          <ActivityIndicator color={colors.primary} accessibilityLabel="Buscando unidades" />
        </View>
      )}
      <View style={styles.actions}>
        <Button
          label="Como chegar"
          icon={Navigation}
          iconFilled
          onPress={onDirections}
          disabled={!name || directionsDisabled}
          accessibilityHint="Abre o app de mapas com a rota até a unidade"
        />
        <Button label="Ver outras unidades" variant="outline" onPress={onOtherUnits} disabled={!name} />
      </View>
    </View>
  );
}

export const UnitCard = memo(UnitCardBase);

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
  loading: { minHeight: 76, alignItems: 'center', justifyContent: 'center' },
  texts: { flex: 1, gap: spacing.xxs },
  name: { ...typography.headline, color: colors.textHeading },
  line: { ...typography.caption, fontSize: 15, lineHeight: 21, color: colors.textSecondary },
  actions: { gap: spacing.md },
});
