import { Keyboard, Mic, MicOff, Phone, type LucideIcon } from 'lucide-react-native';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { PressableScale } from '@/components/PressableScale';
import { colors, fontFamily, spacing } from '@/theme';

const SIDE = 70;
const MAIN = 96;

type ControlProps = {
  icon: LucideIcon;
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
  size: number;
  background: string;
  foreground: string;
  iconRotation?: string;
  selected?: boolean;
};

function Control({ icon: Icon, label, accessibilityLabel, onPress, size, background, foreground, iconRotation, selected }: ControlProps) {
  return (
    <PressableScale
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={selected === undefined ? undefined : { selected }}
      pressedScale={0.92}
      style={styles.control}>
      <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: background }]}>
        <Icon
          size={Math.round(size * 0.36)}
          color={foreground}
          strokeWidth={1.75}
          style={iconRotation ? { transform: [{ rotate: iconRotation }] } : undefined}
        />
      </View>
      <AppText style={styles.label}>{label}</AppText>
    </PressableScale>
  );
}

export type CallControlsProps = {
  muted: boolean;
  onKeyboard: () => void;
  onToggleMute: () => void;
  onEnd: () => void;
};

/** Controles inferiores da chamada: teclado, microfone (mudo) e encerrar. */
function CallControlsBase({ muted, onKeyboard, onToggleMute, onEnd }: CallControlsProps) {
  return (
    <View style={styles.row}>
      <Control
        icon={Keyboard}
        label="Teclado"
        accessibilityLabel="Teclado: continuar por texto"
        onPress={onKeyboard}
        size={SIDE}
        background={colors.bubbleAssistant}
        foreground={colors.textBody}
      />
      <Control
        icon={muted ? MicOff : Mic}
        label={muted ? 'Mudo' : 'Ouvindo'}
        accessibilityLabel={muted ? 'Microfone desligado. Toque para ativar' : 'Microfone ligado. Toque para silenciar'}
        onPress={onToggleMute}
        size={MAIN}
        background={muted ? colors.mintStrong : colors.primary}
        foreground={muted ? colors.primary : colors.onPrimary}
        selected={muted}
      />
      <Control
        icon={Phone}
        label="Encerrar"
        accessibilityLabel="Encerrar conversa"
        onPress={onEnd}
        size={SIDE}
        background={colors.danger}
        foreground={colors.onPrimary}
        iconRotation="135deg"
      />
    </View>
  );
}

export const CallControls = memo(CallControlsBase);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly' },
  control: { alignItems: 'center', gap: spacing.sm, minWidth: SIDE },
  circle: { alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: fontFamily.medium, fontSize: 14, lineHeight: 18, color: colors.textBody },
});
