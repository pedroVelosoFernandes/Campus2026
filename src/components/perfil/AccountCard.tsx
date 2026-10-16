import { LogOut, Smartphone, UserRoundCheck } from 'lucide-react-native';
import { memo } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { IconTile } from '@/components/IconTile';
import { useAuth } from '@/features/auth';
import { useContrastColors } from '@/features/settings';
import { colors, radii, shadows, spacing, typography } from '@/theme';

function confirmSignOut(onConfirm: () => void) {
  Alert.alert('Sair da conta?', 'Você continua usando o app como convidado. Suas preferências ficam neste celular.', [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Sair', style: 'destructive', onPress: onConfirm },
  ]);
}

/** Estado da conta no Perfil: convite para entrar (convidado) ou celular mascarado + "Sair". */
function AccountCardBase() {
  const { status, user, isDemo, signIn, signOut } = useAuth();
  const palette = useContrastColors();
  const signedIn = status === 'signedIn' && !!user;

  if (!signedIn) {
    return (
      <View style={[styles.card, { borderColor: palette.border }]} testID="account-guest">
        <View style={styles.header}>
          <IconTile icon={Smartphone} size={44} />
          <View style={styles.texts}>
            <AppText style={styles.title}>Você está como convidado</AppText>
            <AppText style={styles.detail}>
              Entre com seu celular para guardar seu histórico e seu perfil com segurança.
            </AppText>
          </View>
        </View>
        <Button label="Entrar com celular" icon={Smartphone} onPress={signIn} />
      </View>
    );
  }

  return (
    <View style={[styles.card, { borderColor: palette.border }]} testID="account-signed-in">
      <View style={styles.header}>
        <IconTile icon={UserRoundCheck} size={44} />
        <View style={styles.texts}>
          <AppText style={styles.title}>Conta conectada</AppText>
          <AppText style={styles.phone} accessibilityLabel={`Celular terminado em ${user.phoneMasked.slice(-4)}`}>
            {user.phoneMasked}
          </AppText>
          {isDemo ? <AppText style={styles.detail}>Modo demonstração: nada sai do aparelho.</AppText> : null}
        </View>
      </View>
      <Button label="Sair" icon={LogOut} variant="outline" onPress={() => confirmSignOut(() => void signOut())} />
    </View>
  );
}

export const AccountCard = memo(AccountCardBase);

const styles = StyleSheet.create({
  card: {
    gap: spacing.lg,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  texts: { flex: 1, gap: spacing.xxs },
  title: { ...typography.bodyMedium, fontFamily: typography.label.fontFamily, color: colors.textHeading },
  phone: { ...typography.body, letterSpacing: 0.5, color: colors.textBody },
  detail: { ...typography.caption, color: colors.textSecondary },
});
