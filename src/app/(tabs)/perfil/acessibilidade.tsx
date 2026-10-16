import { CirclePause, Contrast, Volume2 } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { FontScaleSlider } from '@/components/perfil/FontScaleSlider';
import { ToggleRow } from '@/components/perfil/rows';
import { SettingsGroup } from '@/components/perfil/SettingsGroup';
import { SubScreen } from '@/components/perfil/SubScreen';
import { FONT_SCALE_LABELS, useContrastColors, useScaledTypography, useSettings } from '@/features/settings';
import { colors, radii, spacing } from '@/theme';

function TextSizePreview() {
  const type = useScaledTypography();
  const palette = useContrastColors();
  return (
    <View style={[styles.preview, { borderColor: palette.border }]} testID="font-preview">
      <Text style={[type.headline, { color: palette.textHeading }]}>Vacina da gripe</Text>
      <Text style={[type.body, { color: palette.textBody }]}>
        Procure a sala de vacina da sua UBS com documento com foto e a caderneta de vacinação.
      </Text>
    </View>
  );
}

export default function AcessibilidadeScreen() {
  const { settings, update } = useSettings();
  const systemReducesMotion = useReducedMotion();
  const type = useScaledTypography();
  const palette = useContrastColors();
  const a11y = settings.accessibility;

  return (
    <SubScreen title="Acessibilidade" intro="Ajuste o app para ler e ouvir com mais conforto.">
      <SettingsGroup title="Tamanho do texto" footer="Vale para as telas do app que já se adaptam ao novo tamanho.">
        <View style={styles.sizeBox}>
          <TextSizePreview />
          <FontScaleSlider value={a11y.fontScale} onChange={(fontScale) => update({ accessibility: { fontScale } })} />
          <Text style={[type.caption, styles.sizeLabel, { color: palette.textSecondary }]} accessibilityElementsHidden>
            {FONT_SCALE_LABELS[a11y.fontScale]}
          </Text>
        </View>
      </SettingsGroup>

      <SettingsGroup title="Leitura e visual">
        <ToggleRow
          icon={Volume2}
          label="Ler respostas em voz alta"
          detail="O assistente fala as respostas escritas"
          value={a11y.readAloud}
          onValueChange={(readAloud) => update({ accessibility: { readAloud } })}
          testID="toggle-readAloud"
        />
        <ToggleRow
          icon={Contrast}
          label="Alto contraste"
          detail="Textos e bordas mais escuros"
          value={a11y.highContrast}
          onValueChange={(highContrast) => update({ accessibility: { highContrast } })}
          testID="toggle-highContrast"
        />
        <ToggleRow
          icon={CirclePause}
          label="Reduzir animações"
          detail={systemReducesMotion ? 'Já ativado nos ajustes do celular' : 'Menos movimento ao trocar de tela'}
          value={a11y.reduceMotion || systemReducesMotion}
          disabled={systemReducesMotion}
          onValueChange={(reduceMotion) => update({ accessibility: { reduceMotion } })}
          testID="toggle-reduceMotion"
        />
      </SettingsGroup>
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  sizeBox: { padding: spacing.lg, gap: spacing.lg },
  preview: {
    gap: spacing.xs,
    padding: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 1,
    backgroundColor: colors.mint,
  },
  sizeLabel: { textAlign: 'center', marginTop: -spacing.sm },
});
