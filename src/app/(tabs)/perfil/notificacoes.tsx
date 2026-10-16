import { CalendarClock, Megaphone, Syringe } from 'lucide-react-native';
import { useCallback } from 'react';
import { Linking } from 'react-native';

import { Button } from '@/components/Button';
import { InfoNote } from '@/components/InfoNote';
import { ToggleRow } from '@/components/perfil/rows';
import { SettingsGroup } from '@/components/perfil/SettingsGroup';
import { SubScreen } from '@/components/perfil/SubScreen';
import { useSettings, type NotificationPreferences } from '@/features/settings';
import { useNotificationPermission } from '@/features/settings/permissions';

const ROWS = [
  {
    key: 'vaccineReminders',
    icon: Syringe,
    label: 'Lembretes de vacinas',
    detail: 'Próximas doses do seu calendário de vacinação',
  },
  {
    key: 'appointmentReminders',
    icon: CalendarClock,
    label: 'Lembretes de consultas',
    detail: 'Um aviso no dia anterior à consulta marcada',
  },
  {
    key: 'campaignAlerts',
    icon: Megaphone,
    label: 'Campanhas de saúde',
    detail: 'Campanhas de vacinação e mutirões na sua cidade',
  },
] as const satisfies readonly { key: keyof NotificationPreferences; [k: string]: unknown }[];

export default function NotificacoesScreen() {
  const { settings, update } = useSettings();
  const permission = useNotificationPermission();
  const anyOn = Object.values(settings.notifications).some(Boolean);
  const blocked = permission.state === 'denied' && anyOn;

  const toggle = useCallback(
    (key: keyof NotificationPreferences, next: boolean) => {
      update({ notifications: { [key]: next } });
      if (next && permission.state !== 'granted') void permission.request();
    },
    [permission, update],
  );

  return (
    <SubScreen
      title="Notificações"
      intro="Escolha os avisos que quer receber. Você pode mudar quando quiser.">
      <SettingsGroup title="Lembretes" footer="Os avisos chegam pelas notificações do celular.">
        {ROWS.map((row) => (
          <ToggleRow
            key={row.key}
            icon={row.icon}
            label={row.label}
            detail={row.detail}
            value={settings.notifications[row.key]}
            onValueChange={(next) => toggle(row.key, next)}
            testID={`toggle-${row.key}`}
          />
        ))}
      </SettingsGroup>

      {blocked ? (
        <>
          <InfoNote
            title="Notificações bloqueadas no aparelho"
            message="Para receber os lembretes, permita as notificações do Alô Saúde nos Ajustes do celular."
          />
          <Button label="Abrir Ajustes" variant="outline" onPress={() => void Linking.openSettings()} />
        </>
      ) : null}
    </SubScreen>
  );
}
