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
  variantFromParam,
  VARIANTS,
} from '@/components/vacinacao/nearby-units';
import { NearbyCard } from '@/components/vacinacao/NearbyCard';
import { UnitMap } from '@/components/vacinacao/UnitMap';
import { UnitsSheet } from '@/components/vacinacao/UnitsSheet';
import { useNearbySearch } from '@/components/vacinacao/use-nearby-search';
import { MOCK_USER_LOCATION } from '@/mocks/health-units';
import { colors, screenPadding, spacing, typography } from '@/theme';

const MAP_HEIGHT = 300;
const CARD_OVERLAP = 44;
const CARD_HINT = 'Confirme horários e disponibilidade.';
const CARD_ENTER = FadeInDown.duration(320).reduceMotion(ReduceMotion.System);

function mapLabel(name: string | null, official: boolean): string {
  if (!name) return 'Mapa da região';
  return official ? `Mapa com a localização de ${name}` : `Mapa com a localização de exemplo de ${name}`;
}

function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

export default function VacinacaoScreen() {
  const { servico } = useLocalSearchParams<{ servico?: string }>();
  const copy = VARIANTS[variantFromParam(servico)];
  const nearby = useNearbySearch(copy.servico);
  const { units, notice, compactNotice } = nearby;
  // Antes de saber onde a pessoa está, o mapa mostra a região de referência.
  const origin = nearby.search?.coordinates ?? MOCK_USER_LOCATION;
  const official = nearby.dataSource === 'cnes';
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const selected = units.find((unit) => unit.id === selectedId) ?? units[0] ?? null;
  const selectedCoords = selected && nearby.card === 'unit' ? coordinatesOf(selected) : null;
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
          calloutLabel={official ? 'Unidade do SUS' : 'Exemplo de unidade'}
          height={MAP_HEIGHT}
          coveredBottom={CARD_OVERLAP}
          accessibilityLabel={mapLabel(name, official)}
        />

        <Animated.View entering={CARD_ENTER} style={styles.card}>
          <NearbyCard
            mode={nearby.card}
            location={nearby.location}
            canChangeCity={nearby.source === 'oficial'}
            emptyMessage={official ? notice : undefined}
            unit={{
              name,
              services: selected ? describeServices(selected.services, copy.servico) : '',
              hint: CARD_HINT,
              onDirections: openDirections,
              onOtherUnits: openSheet,
              directionsDisabled: !selectedCoords,
            }}
          />
        </Animated.View>

        <View style={styles.below}>
          <InfoNote title={copy.noteTitle} message={copy.noteMessage} />
          {nearby.card === 'unit' ? <Text style={styles.notice}>{compactNotice}</Text> : null}
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
    marginBottom: spacing.md,
  },
  card: { marginTop: -CARD_OVERLAP, marginHorizontal: screenPadding },
  below: { marginTop: spacing.lg, marginHorizontal: screenPadding, gap: spacing.lg },
  notice: { ...typography.caption, fontSize: 12, lineHeight: 16, color: colors.textMuted, textAlign: 'center' },
});
