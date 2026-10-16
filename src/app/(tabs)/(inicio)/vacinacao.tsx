import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { InfoNote } from '@/components/InfoNote';
import { ScreenHeader } from '@/components/ScreenHeader';
import {
  coordinatesOf,
  describeServices,
  directionsUrl,
  displayName,
  useNearbyUnits,
  variantFromParam,
  VARIANTS,
} from '@/components/vacinacao/nearby-units';
import { UnitCard } from '@/components/vacinacao/UnitCard';
import { UnitMap } from '@/components/vacinacao/UnitMap';
import { UnitsSheet } from '@/components/vacinacao/UnitsSheet';
import { colors, screenPadding, spacing, typography } from '@/theme';

const MAP_HEIGHT = 272;
const CARD_OVERLAP = 30;
const CARD_HINT = 'Confirme horários e disponibilidade.';
const CARD_ENTER = FadeInDown.duration(320).reduceMotion(ReduceMotion.System);

function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

export default function VacinacaoScreen() {
  const { servico } = useLocalSearchParams<{ servico?: string }>();
  const copy = VARIANTS[variantFromParam(servico)];
  const { units, origin, notice } = useNearbyUnits(copy.servico);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const selected = units.find((unit) => unit.id === selectedId) ?? units[0] ?? null;
  const selectedCoords = selected ? coordinatesOf(selected.id) : null;
  const name = selected ? displayName(selected.name) : null;

  const openDirections = useCallback(() => {
    if (!selectedCoords || !name) return;
    Linking.openURL(directionsUrl(selectedCoords, name)).catch(() => {});
  }, [name, selectedCoords]);

  const openSheet = useCallback(() => setSheetOpen(true), []);
  const closeSheet = useCallback(() => setSheetOpen(false), []);
  const selectUnit = useCallback((unitId: string) => {
    setSelectedId(unitId);
    setSheetOpen(false);
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Onde buscar atendimento" onBack={goBack} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title} accessibilityRole="header">
          {copy.title}
        </Text>

        <UnitMap
          coordinates={selectedCoords ?? origin}
          showMarker={!!selectedCoords}
          calloutLabel="Exemplo de unidade"
          height={MAP_HEIGHT}
          accessibilityLabel={name ? `Mapa com a localização de exemplo de ${name}` : 'Mapa da região'}
        />

        <Animated.View entering={CARD_ENTER} style={styles.card}>
          <UnitCard
            name={name}
            services={selected ? describeServices(selected.services, copy.servico) : ''}
            hint={CARD_HINT}
            onDirections={openDirections}
            onOtherUnits={openSheet}
            directionsDisabled={!selectedCoords}
          />
        </Animated.View>

        <View style={styles.below}>
          <InfoNote title={copy.noteTitle} message={copy.noteMessage} />
          <Text style={styles.notice}>{notice}</Text>
        </View>
      </ScrollView>

      <UnitsSheet
        visible={sheetOpen}
        units={units}
        selectedId={selected?.id ?? null}
        notice={notice}
        onSelect={selectUnit}
        onClose={closeSheet}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: spacing.xxl },
  title: {
    ...typography.title,
    color: colors.textHeading,
    paddingHorizontal: screenPadding + spacing.xs,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  card: { marginTop: -CARD_OVERLAP, marginHorizontal: screenPadding },
  below: { marginTop: spacing.lg, marginHorizontal: screenPadding, gap: spacing.lg },
  notice: { ...typography.caption, fontSize: 13, lineHeight: 18, color: colors.textMuted, paddingHorizontal: spacing.xs },
});
