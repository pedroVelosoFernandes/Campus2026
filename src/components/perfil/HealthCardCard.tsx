import { Eye, EyeOff, IdCard, Plus } from 'lucide-react-native';
import { memo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { PressableScale } from '@/components/PressableScale';
import { TextFieldSheet } from '@/components/TextFieldSheet';
import { cnsError, CNS_LENGTH, formatCns, maskCns, useHealthCard } from '@/features/settings/health-card';
import { useContrastColors } from '@/features/settings';
import { colors, radii, spacing, typography } from '@/theme';

function confirmRemove(onConfirm: () => void) {
  Alert.alert('Remover Cartão SUS?', 'O número será apagado deste celular.', [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Remover', style: 'destructive', onPress: onConfirm },
  ]);
}

type LinkProps = { label: string; onPress: () => void; tone?: 'danger' };

function CardLink({ label, onPress, tone }: LinkProps) {
  return (
    <PressableScale onPress={onPress} hitSlop={8} pressedScale={0.96} style={styles.link}>
      <AppText style={[styles.linkText, tone === 'danger' && styles.linkDanger]}>{label}</AppText>
    </PressableScale>
  );
}

function FilledCard({ cns, onEdit, onRemove }: { cns: string; onEdit: () => void; onRemove: () => void }) {
  const palette = useContrastColors();
  const [revealed, setRevealed] = useState(false);
  const Toggle = revealed ? EyeOff : Eye;
  return (
    <View style={[styles.card, { borderColor: palette.border }]} testID="cns-card">
      <View style={styles.header}>
        <IdCard size={22} color={colors.primary} strokeWidth={1.6} />
        <AppText style={styles.label}>Cartão SUS</AppText>
        <PressableScale
          onPress={() => setRevealed((value) => !value)}
          accessibilityLabel={revealed ? 'Ocultar número' : 'Mostrar número'}
          hitSlop={8}
          containerStyle={styles.eyeContainer}
          style={styles.eye}>
          <Toggle size={20} color={colors.primary} strokeWidth={1.7} />
        </PressableScale>
      </View>
      <AppText
        style={styles.number}
        accessibilityLabel={revealed ? `Número ${formatCns(cns)}` : `Número terminado em ${cns.slice(-4)}`}>
        {revealed ? formatCns(cns) : maskCns(cns)}
      </AppText>
      <View style={styles.links}>
        <CardLink label="Alterar" onPress={onEdit} />
        <CardLink label="Remover" tone="danger" onPress={() => confirmRemove(onRemove)} />
      </View>
    </View>
  );
}

/** Cartão SUS digitado pela pessoa (opcional), guardado no armazenamento seguro e exibido mascarado. */
function HealthCardCardBase() {
  const { cns, ready, save, remove } = useHealthCard();
  const palette = useContrastColors();
  const [editing, setEditing] = useState(false);
  if (!ready) return null;

  return (
    <>
      {cns ? (
        <FilledCard cns={cns} onEdit={() => setEditing(true)} onRemove={() => void remove()} />
      ) : (
        <PressableScale
          onPress={() => setEditing(true)}
          accessibilityLabel="Adicionar Cartão SUS. Opcional, fica só neste celular"
          style={[styles.empty, { borderColor: palette.borderStrong }]}>
          <Plus size={22} color={colors.primary} strokeWidth={1.8} />
          <View style={styles.emptyTexts}>
            <AppText style={styles.label}>Adicionar Cartão SUS</AppText>
            <AppText style={styles.hint}>Opcional. Fica guardado só neste celular.</AppText>
          </View>
        </PressableScale>
      )}
      <TextFieldSheet
        visible={editing}
        icon={IdCard}
        title={cns ? 'Alterar Cartão SUS' : 'Adicionar Cartão SUS'}
        message="Digite os 15 números do Cartão Nacional de Saúde. Ele fica guardado com segurança só neste celular."
        label="Número do Cartão SUS"
        placeholder="000 0000 0000 0000"
        keyboardType="number-pad"
        autoCapitalize="none"
        maxLength={CNS_LENGTH + 3}
        format={formatCns}
        validate={cnsError}
        cancelLabel="Cancelar"
        onSave={(value) => {
          void save(value);
          setEditing(false);
        }}
        onCancel={() => setEditing(false)}
      />
    </>
  );
}

export const HealthCardCard = memo(HealthCardCardBase);

const styles = StyleSheet.create({
  card: { gap: spacing.sm, padding: spacing.lg, borderRadius: radii.lg, borderWidth: 1, backgroundColor: colors.mint },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  label: { ...typography.bodyMedium, flexShrink: 1, color: colors.textHeading },
  eyeContainer: { marginLeft: 'auto', marginVertical: -spacing.md },
  eye: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  number: { ...typography.headline, fontSize: 22, lineHeight: 28, letterSpacing: 1, color: colors.primary },
  links: { flexDirection: 'row', gap: spacing.xl },
  link: { minHeight: 44, justifyContent: 'center' },
  linkText: { ...typography.bodyMedium, fontSize: 15, color: colors.primary },
  linkDanger: { color: colors.dangerText },
  empty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 72,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    backgroundColor: colors.mint,
  },
  emptyTexts: { flex: 1, gap: spacing.xxs },
  hint: { ...typography.caption, color: colors.textSecondary },
});
