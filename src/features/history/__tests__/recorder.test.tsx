import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, render } from '@testing-library/react-native';

import { HISTORY_KEY, resetHistoryStore, useConversationRecorder, type ConversationRecorderOptions } from '@/features/history';
import { DEFAULT_SETTINGS, type Settings } from '@/features/settings';
import { SettingsProvider } from '@/features/settings/SettingsProvider';
import type { TranscriptMessage } from '@/features/voice/types';

function Recorder(props: ConversationRecorderOptions) {
  useConversationRecorder(props);
  return null;
}

const withHistory = (on: boolean): Settings => ({
  ...DEFAULT_SETTINGS,
  privacy: { ...DEFAULT_SETTINGS.privacy, saveConversationHistory: on },
});

const TURN: TranscriptMessage[] = [
  { id: 'u1', role: 'user', text: 'Estou com dor de cabeça.', final: true },
  { id: 'a1', role: 'assistant', text: 'Desde quando?', final: true },
];

async function renderRecorder(settings: Settings, transcript: TranscriptMessage[]) {
  const view = await render(
    <SettingsProvider initialSettings={settings}>
      <Recorder channel="texto" transcript={transcript} suggestedAction={null} />
    </SettingsProvider>,
  );
  await act(async () => {});
  return view;
}

const stored = async () => JSON.parse((await AsyncStorage.getItem(HISTORY_KEY)) ?? 'null');

describe('useConversationRecorder (consentimento)', () => {
  beforeEach(async () => {
    resetHistoryStore();
    await AsyncStorage.clear();
  });

  it('não grava nada com o histórico desligado (padrão)', async () => {
    await renderRecorder(withHistory(false), TURN);
    expect(await stored()).toBeNull();
  });

  it('grava a conversa quando a pessoa permitiu', async () => {
    await renderRecorder(withHistory(true), TURN);
    const list = await stored();
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ channel: 'texto', title: 'Estou com dor de cabeça', outcome: null });
    expect(list[0].messages).toHaveLength(2);
  });

  it('espera a fala terminar e atualiza o mesmo registro', async () => {
    const streaming: TranscriptMessage[] = [TURN[0], { id: 'a1', role: 'assistant', text: 'Des', final: false }];
    const view = await renderRecorder(withHistory(true), streaming);
    expect(await stored()).toBeNull();

    await view.rerender(
      <SettingsProvider initialSettings={withHistory(true)}>
        <Recorder channel="texto" transcript={TURN} suggestedAction={null} />
      </SettingsProvider>,
    );
    await act(async () => {});
    await view.rerender(
      <SettingsProvider initialSettings={withHistory(true)}>
        <Recorder
          channel="texto"
          transcript={[...TURN, { id: 'u2', role: 'user', text: 'Desde ontem.', final: true }]}
          suggestedAction={{ kind: 'cuidar-saude', label: 'Ver opções de atendimento' }}
        />
      </SettingsProvider>,
    );
    await act(async () => {});

    const list = await stored();
    expect(list).toHaveLength(1);
    expect(list[0].messages).toHaveLength(3);
    expect(list[0].outcome).toEqual({ kind: 'cuidar-saude', label: 'Ver opções de atendimento' });
  });
});
