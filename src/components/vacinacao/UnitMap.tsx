import { Building2 } from 'lucide-react-native';
import { memo, useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';

import { colors, fontFamily, radii, shadows, spacing } from '@/theme';

import type { Coordinates } from '@/services/health-units';

export type UnitMapProps = {
  /** Unidade em destaque; o mapa recentraliza nela quando muda. */
  coordinates: Coordinates;
  /** Esconde o pino enquanto a busca não terminou. */
  showMarker: boolean;
  /** Rótulo da pílula sobre o pino (ex.: "Exemplo de unidade"). */
  calloutLabel: string;
  height: number;
  accessibilityLabel: string;
};

const DELTA = { latitudeDelta: 0.012, longitudeDelta: 0.012 };
/** Desloca o centro para o sul, deixando o pino acima do cartão que sobrepõe o mapa. */
const CENTER_OFFSET = 0.0016;

function regionFor(coords: Coordinates): Region {
  return { latitude: coords.latitude - CENTER_OFFSET, longitude: coords.longitude, ...DELTA };
}

/** Pílula branca "Exemplo de unidade" + pino teal em gota, ancorados na ponta do pino. */
function UnitPin({ label }: { label: string }) {
  return (
    <View style={styles.pinWrap} pointerEvents="none">
      <View style={styles.callout}>
        <Building2 size={14} color={colors.primary} strokeWidth={2} />
        <Text style={styles.calloutText}>{label}</Text>
      </View>
      <View style={styles.calloutTail} />
      <View style={styles.pin}>
        <View style={styles.pinDot} />
      </View>
    </View>
  );
}

function UnitMapBase({ coordinates, showMarker, calloutLabel, height, accessibilityLabel }: UnitMapProps) {
  const mapRef = useRef<MapView>(null);
  const { latitude, longitude } = coordinates;
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    mapRef.current?.animateToRegion(regionFor({ latitude, longitude }), 450);
  }, [latitude, longitude]);

  return (
    <View style={[styles.frame, { height }]} accessible accessibilityLabel={accessibilityLabel}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={regionFor(coordinates)}
        mapType="mutedStandard"
        userInterfaceStyle="light"
        showsPointsOfInterests={false}
        showsBuildings={false}
        showsCompass={false}
        showsScale={false}
        toolbarEnabled={false}
        pitchEnabled={false}
        rotateEnabled={false}>
        {showMarker ? (
          <Marker coordinate={coordinates} anchor={{ x: 0.5, y: 1 }} tracksViewChanges={false}>
            <UnitPin label={calloutLabel} />
          </Marker>
        ) : null}
      </MapView>
    </View>
  );
}

export const UnitMap = memo(UnitMapBase);

const PIN = 34;

const styles = StyleSheet.create({
  frame: { width: '100%', overflow: 'hidden', backgroundColor: colors.mint },
  pinWrap: { alignItems: 'center', paddingHorizontal: spacing.sm },
  callout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadows.card,
  },
  calloutText: { fontFamily: fontFamily.medium, fontSize: 14, lineHeight: 18, color: colors.textBody },
  calloutTail: {
    width: 10,
    height: 10,
    marginTop: -5,
    transform: [{ rotate: '45deg' }],
    backgroundColor: colors.surface,
  },
  pin: {
    width: PIN,
    height: PIN,
    marginTop: spacing.md,
    marginBottom: PIN * 0.21,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopLeftRadius: PIN / 2,
    borderTopRightRadius: PIN / 2,
    borderBottomLeftRadius: PIN / 2,
    borderBottomRightRadius: 0,
    transform: [{ rotate: '45deg' }],
    backgroundColor: colors.primary,
  },
  pinDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.surface },
});
