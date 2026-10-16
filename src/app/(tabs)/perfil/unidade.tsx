import { useCallback, useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet, View } from 'react-native';

import { InfoNote } from '@/components/InfoNote';
import { ReferenceUnitCard } from '@/components/perfil/ReferenceUnitCard';
import {
  directionsUrl,
  displayName,
  ROUTINE_STEPS,
  unitCoordinates,
  useReferenceUnit,
} from '@/components/perfil/reference-unit';
import { SettingsGroup } from '@/components/perfil/SettingsGroup';
import { StepList } from '@/components/perfil/StepList';
import { SubScreen } from '@/components/perfil/SubScreen';
import { UnitsSheet } from '@/components/vacinacao/UnitsSheet';
import { colors } from '@/theme';

const SHEET_NOTICE =
  'A UBS de referência é definida pelo seu endereço. Se mudou de casa, confirme na nova unidade ' +
  'ou pelo Disque Saúde 136. Unidades de exemplo.';

export default function UnidadeReferenciaScreen() {
  const { units, current, select, loading } = useReferenceUnit();
  const [sheetOpen, setSheetOpen] = useState(false);
  const coords = current ? unitCoordinates(current) : null;

  const openDirections = useCallback(() => {
    if (!current || !coords) return;
    Linking.openURL(directionsUrl(coords, displayName(current.name))).catch(() => {});
  }, [coords, current]);

  const choose = useCallback(
    (unitId: string) => {
      select(unitId);
      setSheetOpen(false);
    },
    [select],
  );

  return (
    <SubScreen
      title="Unidade de referência"
      intro="É a UBS que acompanha você pelo endereço onde mora: consultas de rotina, vacinas, exames e encaminhamentos.">
      {loading || !current ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} accessibilityLabel="Carregando unidade" />
        </View>
      ) : (
        <ReferenceUnitCard
          unit={current}
          onDirections={openDirections}
          onChange={() => setSheetOpen(true)}
          directionsDisabled={!coords}
        />
      )}

      <SettingsGroup title="Como funciona a consulta de rotina">
        <StepList steps={ROUTINE_STEPS} />
      </SettingsGroup>

      <InfoNote
        title="Leve no dia"
        message="Documento com foto, Cartão SUS ou CPF e comprovante de endereço. Horários podem mudar: confirme pelo Disque Saúde 136."
      />

      <UnitsSheet
        visible={sheetOpen}
        title="Escolha sua UBS"
        units={units}
        selectedId={current?.id ?? null}
        notice={SHEET_NOTICE}
        onSelect={choose}
        onClose={() => setSheetOpen(false)}
      />
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  loading: { minHeight: 200, alignItems: 'center', justifyContent: 'center' },
});
