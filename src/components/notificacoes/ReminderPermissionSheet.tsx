import { BellRing } from 'lucide-react-native';
import { memo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { IconTile } from '@/components/IconTile';
import { colors, radii, spacing, typography } from '@/theme';

export type ReminderPermissionSheetProps = {
  visible: boolean;
  onAllow: () => void;
  onClose: () => void;
};

/** Explica o lembrete ANTES do pedido de permissão do sistema (pode ser recusado sem prejuízo). */
function ReminderPermissionSheetBase({ visible, onAllow, onClose }: ReminderPermissionSheetProps) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Fechar" />
        <View
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.xl) }]}
          accessibilityViewIsModal>
          <View style={styles.grabber} />
          <IconTile icon={BellRing} size={56} />
          <Text style={styles.title} accessibilityRole="header">
            Quer um lembrete da vacina?
          </Text>
          <Text style={styles.text}>
            Avisamos amanhã às 9h, quando a UBS já está aberta. Para isso, o celular vai pedir permissão
            para o Alô Saúde enviar notificações. Você pode mudar isso quando quiser nos Ajustes.
          </Text>
          <View style={styles.actions}>
            <Button label="Permitir lembretes" onPress={onAllow} />
            <Button label="Agora não" variant="secondary" onPress={onClose} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

export const ReminderPermissionSheet = memo(ReminderPermissionSheetBase);

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(11, 27, 46, 0.32)' },
  sheet: {
    gap: spacing.md,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderTopLeftRadius: radii.xl + 8,
    borderTopRightRadius: radii.xl + 8,
    backgroundColor: colors.surface,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    marginBottom: spacing.sm,
    backgroundColor: colors.borderStrong,
  },
  title: { ...typography.title, fontSize: 24, lineHeight: 30, marginTop: spacing.xs, color: colors.textHeading },
  text: { ...typography.body, color: colors.textSecondary },
  actions: { gap: spacing.md, marginTop: spacing.md },
});
