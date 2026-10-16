import { UserRound } from 'lucide-react-native';
import { memo } from 'react';

import { MAX_NAME_LENGTH, sanitizeName, useSettings } from '@/features/settings';

import { TextFieldSheet } from './TextFieldSheet';

export type NameSheetProps = { visible: boolean; onClose: () => void };

/**
 * "Como podemos te chamar?": nome opcional da saudação. Fica só neste aparelho
 * (o login por SMS não traz nome). Salvar vazio apaga o nome.
 */
function NameSheetBase({ visible, onClose }: NameSheetProps) {
  const { settings, update } = useSettings();
  return (
    <TextFieldSheet
      visible={visible}
      icon={UserRound}
      title="Como podemos te chamar?"
      message="É opcional e fica só neste celular. Usamos apenas para cumprimentar você."
      label="Seu nome"
      placeholder="Seu nome ou apelido"
      initialValue={settings.profile.name}
      maxLength={MAX_NAME_LENGTH}
      onSave={(value) => {
        update({ profile: { name: sanitizeName(value), namePromptDone: true } });
        onClose();
      }}
      onCancel={() => {
        update({ profile: { namePromptDone: true } });
        onClose();
      }}
    />
  );
}

export const NameSheet = memo(NameSheetBase);
