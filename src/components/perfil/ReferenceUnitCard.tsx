import { ArrowLeftRight, Building2, Clock, MapPin, Navigation, Phone, type LucideIcon } from 'lucide-react-native';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { IconTile } from '@/components/IconTile';
import { useContrastColors } from '@/features/settings';
import type { UnitMatch } from '@/services/health-units';
import { colors, fontFamily, radii, spacing, typography } from '@/theme';

import { displayName, formatDistance, serviceNames } from './reference-unit';

export type ReferenceUnitCardProps = {
  unit: UnitMatch;
  onDirections: () => void;
  onChange: () => void;
  directionsDisabled?: boolean;
};

function Detail({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  const palette = useContrastColors();
  return (
    <View style={styles.detail}>
      <Icon size={18} color={colors.primary} strokeWidth={1.7} style={styles.detailIcon} />
      <AppText style={[typography.body, styles.flex, { color: palette.textBody }]}>{text}</AppText>
    </View>
  );
}

/** Cartão menta da UBS de referência: endereço, horário, serviços e ações. */
function ReferenceUnitCardBase({ unit, onDirections, onChange, directionsDisabled }: ReferenceUnitCardProps) {
  const palette = useContrastColors();
  const distance = formatDistance(unit.distanceKm);
  const kind = distance ? `${unit.type} · ${distance} de casa` : unit.type;

  return (
    <View style={[styles.card, { borderColor: palette.border }]} testID="reference-unit-card">
      <View style={styles.head}>
        <IconTile icon={Building2} size={52} />
        <View style={styles.flex}>
          <AppText style={[typography.headline, { color: palette.textHeading }]} accessibilityRole="header">
            {displayName(unit.name)}
          </AppText>
          <AppText style={[typography.caption, { color: palette.textSecondary }]}>{kind}</AppText>
        </View>
      </View>

      <View style={styles.details}>
        {unit.address ? <Detail icon={MapPin} text={unit.address} /> : null}
        <Detail icon={Clock} text={unit.hours} />
        {unit.phone ? <Detail icon={Phone} text={unit.phone} /> : null}
      </View>

      <View style={styles.chips} accessibilityLabel={`Serviços: ${serviceNames(unit.services).join(', ')}`}>
        {serviceNames(unit.services).map((name) => (
          <View key={name} style={styles.chip}>
            <AppText style={[typography.caption, styles.chipText]}>{name}</AppText>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <Button label="Como chegar" icon={Navigation} iconFilled onPress={onDirections} disabled={directionsDisabled} />
        <Button label="Trocar unidade" icon={ArrowLeftRight} variant="outline" onPress={onChange} />
      </View>
    </View>
  );
}

export const ReferenceUnitCard = memo(ReferenceUnitCardBase);

const styles = StyleSheet.create({
  card: {
    gap: spacing.lg,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    backgroundColor: colors.mint,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
  details: { gap: spacing.sm },
  detail: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  detailIcon: { marginTop: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 1,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.mintStrong,
  },
  chipText: { fontFamily: fontFamily.medium, color: colors.primary },
  actions: { gap: spacing.md },
});
