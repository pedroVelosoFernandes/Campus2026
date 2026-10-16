import type { LucideIcon } from 'lucide-react-native';
import { memo, useState } from 'react';
import { KeyboardAvoidingView, Modal, Pressable, StyleSheet, View, type KeyboardTypeOptions } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useContrastColors } from '@/features/settings';
import { colors, radii, spacing, typography } from '@/theme';

import { AppText } from './AppText';
import { AppTextInput } from './AppTextInput';
import { Button } from './Button';
import { IconTile } from './IconTile';

export type TextFieldSheetProps = {
  visible: boolean;
  icon: LucideIcon;
  title: string;
  message: string;
  /** Rótulo do campo (lido pelo leitor de tela). */
  label: string;
  initialValue?: string;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'words';
  maxLength?: number;
  /** Formata enquanto a pessoa digita (ex.: grupos do Cartão SUS). */
  format?: (text: string) => string;
  /** Mensagem de erro, ou `null` quando o valor pode ser salvo. */
  validate?: (value: string) => string | null;
  saveLabel?: string;
  cancelLabel?: string;
  onSave: (value: string) => void;
  onCancel: () => void;
};

type FieldProps = Omit<TextFieldSheetProps, 'visible' | 'icon' | 'title' | 'message'>;

function SheetForm({
  label,
  initialValue = '',
  placeholder,
  keyboardType,
  autoCapitalize = 'words',
  maxLength,
  format,
  validate,
  saveLabel = 'Salvar',
  cancelLabel = 'Agora não',
  onSave,
  onCancel,
}: FieldProps) {
  const palette = useContrastColors();
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const submit = () => {
    const problem = validate?.(value) ?? null;
    setError(problem);
    if (!problem) onSave(value);
  };
  return (
    <>
      <AppTextInput
        value={value}
        onChangeText={(text) => {
          setValue(format ? format(text) : text);
          setError(null);
        }}
        accessibilityLabel={label}
        placeholder={placeholder}
        placeholderTextColor={palette.textMuted}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        maxLength={maxLength}
        returnKeyType="done"
        onSubmitEditing={submit}
        autoFocus
        style={[styles.input, { borderColor: error ? colors.danger : palette.borderStrong }]}
      />
      {error ? (
        <AppText style={styles.error} accessibilityLiveRegion="polite" accessibilityRole="alert">
          {error}
        </AppText>
      ) : null}
      <View style={styles.actions}>
        <Button label={saveLabel} onPress={submit} />
        <Button label={cancelLabel} variant="secondary" onPress={onCancel} />
      </View>
    </>
  );
}

/** Folha inferior com um campo de texto (nome, Cartão SUS). O formulário reinicia a cada abertura. */
function TextFieldSheetBase({ visible, icon, title, message, ...field }: TextFieldSheetProps) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={field.onCancel}>
      {/* Modais ficam fora da raiz do Gesture Handler: sem isto o primeiro toque pode se perder. */}
      <GestureHandlerRootView style={styles.flex}>
        <KeyboardAvoidingView style={styles.root} behavior="padding">
          <Pressable style={StyleSheet.absoluteFill} onPress={field.onCancel} accessibilityLabel="Fechar" />
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.xl) }]} accessibilityViewIsModal>
            <View style={styles.grabber} />
            <IconTile icon={icon} size={52} />
            <AppText style={styles.title} accessibilityRole="header">
              {title}
            </AppText>
            <AppText style={styles.text}>{message}</AppText>
            {visible ? <SheetForm {...field} /> : null}
          </View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}

export const TextFieldSheet = memo(TextFieldSheetBase);

const styles = StyleSheet.create({
  flex: { flex: 1 },
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
  input: {
    ...typography.bodyLarge,
    minHeight: 54,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 1,
    backgroundColor: colors.surface,
    color: colors.textHeading,
  },
  error: { ...typography.caption, color: colors.dangerText },
  actions: { gap: spacing.md, marginTop: spacing.sm },
});
