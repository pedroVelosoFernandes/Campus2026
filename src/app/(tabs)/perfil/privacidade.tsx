import * as WebBrowser from 'expo-web-browser';
import { Database, Download, FileText, LocateFixed, Mail, MessageSquareText, Mic, Trash2, type LucideIcon } from 'lucide-react-native';
import { useCallback } from 'react';
import { Alert, Linking } from 'react-native';

import { InfoNote } from '@/components/InfoNote';
import { ActionRow, InfoRow, ToggleRow } from '@/components/perfil/rows';
import { SettingsGroup } from '@/components/perfil/SettingsGroup';
import { SubScreen } from '@/components/perfil/SubScreen';
import {
  DATA_PROTECTION_OFFICER,
  PRIVACY_POLICY_URL,
  PROCESSED_DATA,
  shareMyData,
} from '@/features/privacy';
import { useEraseMyData } from '@/features/privacy/use-erase';
import { useSettings } from '@/features/settings';
import { useLocationPermission } from '@/features/settings/permissions';

const DATA_ICONS: Record<string, LucideIcon> = {
  conversas: MessageSquareText,
  voz: Mic,
  localizacao: LocateFixed,
  preferencias: Database,
};

function confirmErase(onConfirm: () => void) {
  Alert.alert(
    'Apagar meus dados?',
    'Isso remove deste aparelho suas preferências, consentimentos, Cartão SUS e qualquer histórico salvo, e sai da sua conta. Não dá para desfazer.',
    [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Apagar', style: 'destructive', onPress: onConfirm },
    ],
  );
}

function exportData() {
  shareMyData().catch(() => Alert.alert('Não foi possível exportar', 'Tente novamente em instantes.'));
}

function eraseAll(eraseEverything: () => Promise<void>) {
  eraseEverything()
    .then(() => Alert.alert('Dados apagados', 'O app voltou ao início, como no primeiro uso.'))
    .catch(() => Alert.alert('Não foi possível apagar', 'Tente novamente em instantes.'));
}

export default function PrivacidadeScreen() {
  const { settings, update } = useSettings();
  const eraseEverything = useEraseMyData();
  const location = useLocationPermission();
  const erase = useCallback(() => confirmErase(() => eraseAll(eraseEverything)), [eraseEverything]);
  const locationBlocked = settings.privacy.useLocation === false && location.state === 'denied';

  const toggleLocation = useCallback(
    async (next: boolean) => {
      if (!next) return update({ privacy: { useLocation: false } });
      const granted = location.state === 'granted' || (await location.request());
      update({ privacy: { useLocation: granted } });
    },
    [location, update],
  );

  return (
    <SubScreen
      title="Privacidade e dados"
      intro="Seguimos a Lei Geral de Proteção de Dados (LGPD). Usamos só o necessário para orientar você, e você decide o que fica salvo.">
      <SettingsGroup title="Suas permissões" footer="Você pode desligar a qualquer momento.">
        <ToggleRow
          icon={MessageSquareText}
          label="Salvar histórico de conversas"
          detail="Guarda as conversas neste aparelho para você rever depois"
          value={settings.privacy.saveConversationHistory}
          onValueChange={(saveConversationHistory) => update({ privacy: { saveConversationHistory } })}
          testID="toggle-saveConversationHistory"
        />
        <ToggleRow
          icon={LocateFixed}
          label="Usar minha localização"
          detail="Para mostrar unidades de saúde perto de você"
          value={settings.privacy.useLocation}
          onValueChange={(next) => void toggleLocation(next)}
          testID="toggle-useLocation"
        />
      </SettingsGroup>

      {locationBlocked ? (
        <InfoNote
          title="Localização bloqueada no aparelho"
          message="Para usar, permita a localização do Alô Saúde nos Ajustes do celular."
        />
      ) : null}

      <SettingsGroup title="Seus direitos">
        <ActionRow
          icon={Download}
          label="Baixar meus dados"
          detail="Arquivo com o que o app guarda neste aparelho"
          onPress={exportData}
          trailing="none"
        />
        <ActionRow icon={Trash2} label="Apagar meus dados" detail="Remove tudo deste aparelho" onPress={erase} tone="danger" trailing="none" />
        <ActionRow
          icon={FileText}
          label="Política de privacidade"
          onPress={() => void WebBrowser.openBrowserAsync(PRIVACY_POLICY_URL).catch(() => {})}
          trailing="external"
        />
        <ActionRow
          icon={Mail}
          label="Falar com o encarregado de dados"
          detail={DATA_PROTECTION_OFFICER.email}
          onPress={() => void Linking.openURL(`mailto:${DATA_PROTECTION_OFFICER.email}`).catch(() => {})}
          trailing="external"
        />
      </SettingsGroup>
      <SettingsGroup title="O que usamos e por quê">
        {PROCESSED_DATA.map((item) => (
          <InfoRow key={item.key} icon={DATA_ICONS[item.key] ?? Database} label={item.title} detail={item.description} />
        ))}
      </SettingsGroup>

    </SubScreen>
  );
}
