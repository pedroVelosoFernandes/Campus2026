import { Building2, LocateFixed, MapPin, Phone, Search } from 'lucide-react-native';
import { memo, useCallback, useState } from 'react';
import { Linking } from 'react-native';

import type { DeviceLocationState } from '@/features/location/use-device-location';

import { CityField } from './CityField';
import { StatusCard } from './StatusCard';
import { UnitCard, type UnitCardProps } from './UnitCard';
import type { CardMode } from './use-nearby-search';

export type NearbyCardProps = {
  mode: CardMode;
  location: DeviceLocationState;
  /** Dados do cartão de unidade (modos `loading` e `unit`). */
  unit: Omit<UnitCardProps, 'name'> & { name: string | null };
  /** Permite trocar a cidade no estado vazio (só com dados oficiais). */
  canChangeCity: boolean;
  /** Explicação da busca vazia (ex.: aviso do CNES); há um texto padrão. */
  emptyMessage?: string;
};

const DEFAULT_EMPTY =
  'Não encontramos unidades com esse serviço nos dados disponíveis. Confirme pelo Disque Saúde 136.';

const callDisqueSaude = () => {
  Linking.openURL('tel:136').catch(() => {});
};

function CityPrompt({ location }: { location: DeviceLocationState }) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = useCallback(async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    const ok = await location.submitCity(text);
    setBusy(false);
    setError(ok ? null : 'Não entendi a cidade. Escreva como "Campinas, SP".');
  }, [busy, location, text]);
  const message = location.denied
    ? 'A localização está desativada para o app. Diga sua cidade e o estado para buscarmos unidades do SUS.'
    : 'Diga sua cidade e o estado para buscarmos unidades do SUS.';
  return (
    <StatusCard
      icon={MapPin}
      title="Em qual cidade você está?"
      message={message}
      primary={{ label: busy ? 'Buscando…' : 'Buscar unidades', icon: Search, onPress: submit, disabled: busy || !text.trim() }}
      secondary={{ label: 'Ligar para o Disque Saúde 136', icon: Phone, onPress: callDisqueSaude }}>
      <CityField value={text} onChangeText={setText} onSubmit={submit} error={error} />
    </StatusCard>
  );
}

/** Cartão sobre o mapa: pede localização, cidade, mostra a unidade ou o estado vazio. */
function NearbyCardBase({ mode, location, unit, canChangeCity, emptyMessage }: NearbyCardProps) {
  if (mode === 'ask') {
    return (
      <StatusCard
        icon={LocateFixed}
        title="Usar sua localização?"
        message="Assim mostramos as unidades mais perto de você. Ela é usada só nesta busca e não fica salva."
        primary={{
          label: 'Permitir localização',
          icon: LocateFixed,
          onPress: location.allow,
          hint: 'Abre o pedido de permissão do celular',
        }}
        secondary={{ label: 'Agora não', onPress: location.decline }}
      />
    );
  }
  if (mode === 'city') return <CityPrompt location={location} />;
  if (mode === 'empty') {
    return (
      <StatusCard
        icon={Building2}
        title="Nenhuma unidade encontrada"
        message={emptyMessage || DEFAULT_EMPTY}
        primary={{ label: 'Ligar para o Disque Saúde 136', icon: Phone, onPress: callDisqueSaude }}
        secondary={canChangeCity ? { label: 'Informar outra cidade', onPress: location.changeCity } : undefined}
      />
    );
  }
  return <UnitCard {...unit} name={mode === 'unit' ? unit.name : null} />;
}

export const NearbyCard = memo(NearbyCardBase);
