import { Building2, Check, Clock, MapPin } from 'lucide-react-native';
import { memo, useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { GestureDetector, GestureHandlerRootView, Pressable, usePanGesture } from 'react-native-gesture-handler';
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { IconTile } from '@/components/IconTile';
import { PressableScale } from '@/components/PressableScale';
import { colors, radii, spacing, typography } from '@/theme';

import type { UnitMatch } from '@/services/health-units';

import { displayName, formatDistance } from './nearby-units';

export type UnitsSheetProps = {
  visible: boolean;
  units: UnitMatch[];
  selectedId: string | null;
  notice: string;
  onSelect: (unitId: string) => void;
  onClose: () => void;
  /** Título da folha (padrão: "Outras unidades"). */
  title?: string;
};

const HIDDEN = 700;
const TIMING = { duration: 260, reduceMotion: ReduceMotion.System } as const;
const DISMISS_DISTANCE = 110;
const DISMISS_VELOCITY = 900;

function UnitRow({ unit, selected, onPress }: { unit: UnitMatch; selected: boolean; onPress: () => void }) {
  const name = displayName(unit.name);
  const distance = formatDistance(unit.distanceKm);
  const kind = distance ? `${unit.type} · ${distance}` : unit.type;
  return (
    <PressableScale
      onPress={onPress}
      pressedScale={0.98}
      accessibilityLabel={`${name}, ${kind}. ${unit.address ?? ''}. ${unit.hours}`}
      accessibilityState={{ selected }}
      style={[styles.row, selected && styles.rowSelected]}>
      <IconTile icon={Building2} size={44} />
      <View style={styles.rowTexts}>
        <Text style={styles.rowName}>{name}</Text>
        <Text style={styles.rowKind}>{kind}</Text>
        {unit.address ? (
          <View style={styles.meta}>
            <MapPin size={14} color={colors.textMuted} strokeWidth={1.75} />
            <Text style={styles.metaText}>{unit.address}</Text>
          </View>
        ) : null}
        <View style={styles.meta}>
          <Clock size={14} color={colors.textMuted} strokeWidth={1.75} />
          <Text style={styles.metaText}>{unit.hours}</Text>
        </View>
      </View>
      {selected ? <Check size={20} color={colors.primary} strokeWidth={2.25} /> : null}
    </PressableScale>
  );
}

/** Folha inferior com as outras unidades; arrastar para baixo ou tocar fora fecha. */
function UnitsSheetBase({
  visible,
  units,
  selectedId,
  notice,
  onSelect,
  onClose,
  title = 'Outras unidades',
}: UnitsSheetProps) {
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const translateY = useSharedValue(HIDDEN);

  if (visible && !mounted) setMounted(true);

  useEffect(() => {
    if (visible) {
      translateY.set(withTiming(0, TIMING));
      return;
    }
    translateY.set(
      withTiming(HIDDEN, TIMING, (finished) => {
        if (finished) scheduleOnRN(setMounted, false);
      }),
    );
  }, [translateY, visible]);

  const pan = usePanGesture({
    activeOffsetY: [-8, 8],
    onUpdate: (event) => {
      translateY.set(Math.max(0, event.translationY));
    },
    onDeactivate: (event) => {
      if (event.translationY > DISMISS_DISTANCE || event.velocityY > DISMISS_VELOCITY) {
        scheduleOnRN(onClose);
      } else {
        translateY.set(withTiming(0, TIMING));
      }
    },
  });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.get() }] }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: 1 - Math.min(1, translateY.get() / 400) }));

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <GestureHandlerRootView style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
          <Pressable style={styles.root} onPress={onClose} accessibilityLabel="Fechar lista de unidades" />
        </Animated.View>
        <GestureDetector gesture={pan}>
          <Animated.View
            style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }, sheetStyle]}
            accessibilityViewIsModal>
            <View style={styles.handle} />
            <Text style={styles.title} accessibilityRole="header">
              {title}
            </Text>
            <View style={styles.list}>
              {units.map((unit) => (
                <UnitRow
                  key={unit.id}
                  unit={unit}
                  selected={unit.id === selectedId}
                  onPress={() => onSelect(unit.id)}
                />
              ))}
            </View>
            <Text style={styles.notice}>{notice}</Text>
          </Animated.View>
        </GestureDetector>
      </GestureHandlerRootView>
    </Modal>
  );
}

export const UnitsSheet = memo(UnitsSheetBase);

const styles = StyleSheet.create({
  root: { flex: 1 },
  backdrop: { backgroundColor: colors.textHeading + '59' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    gap: spacing.md,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    backgroundColor: colors.background,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    marginBottom: spacing.xs,
    backgroundColor: colors.borderStrong,
  },
  title: { ...typography.headline, color: colors.textHeading },
  list: { gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  rowSelected: { borderColor: colors.primary, backgroundColor: colors.mint },
  rowTexts: { flex: 1, gap: spacing.xxs },
  rowName: { ...typography.bodyMedium, color: colors.textHeading },
  rowKind: { ...typography.caption, color: colors.primary },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  metaText: { ...typography.caption, fontSize: 13, lineHeight: 18, flex: 1, color: colors.textSecondary },
  notice: { ...typography.caption, fontSize: 13, lineHeight: 18, color: colors.textMuted },
});
