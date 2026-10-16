import { act, renderHook } from '@testing-library/react-native';
import * as Speech from 'expo-speech';
import type { ReactNode } from 'react';

import { useReadAloudAssistant } from '@/features/read-aloud';
import { resetVoiceCache } from '@/features/read-aloud/speech';
import { toSpeakableText } from '@/features/read-aloud/text';
import { DEFAULT_SETTINGS, type Settings } from '@/features/settings';
import { SettingsProvider } from '@/features/settings/SettingsProvider';
import type { TranscriptMessage } from '@/features/voice/types';

jest.mock('expo-speech', () => ({
  speak: jest.fn(),
  stop: jest.fn(async () => {}),
  getAvailableVoicesAsync: jest.fn(async () => [
    { identifier: 'en-voice', language: 'en-US', quality: 'Default', name: 'Samantha' },
    { identifier: 'pt-basic', language: 'pt-BR', quality: 'Default', name: 'Luciana' },
    { identifier: 'pt-enhanced', language: 'pt_BR', quality: 'Enhanced', name: 'Luciana (Melhorada)' },
  ]),
  VoiceQuality: { Default: 'Default', Enhanced: 'Enhanced' },
}));

const speak = jest.mocked(Speech.speak);
const stop = jest.mocked(Speech.stop);

const settingsWith = (readAloud: boolean): Settings => ({
  ...DEFAULT_SETTINGS,
  accessibility: { ...DEFAULT_SETTINGS.accessibility, readAloud },
});

function wrapperFor(readAloud: boolean) {
  const initial = settingsWith(readAloud);
  function Wrapper({ children }: { children: ReactNode }) {
    return <SettingsProvider initialSettings={initial}>{children}</SettingsProvider>;
  }
  return Wrapper;
}

const user = (id: string, text = 'Oi'): TranscriptMessage => ({ id, role: 'user', text, final: true });
const assistant = (id: string, text: string, final = true): TranscriptMessage => ({ id, role: 'assistant', text, final });

type Props = { transcript: TranscriptMessage[]; active?: boolean };

async function setup(readAloud: boolean, transcript: TranscriptMessage[] = []) {
  return renderHook(({ transcript: t, active }: Props) => useReadAloudAssistant(t, { active }), {
    initialProps: { transcript },
    wrapper: wrapperFor(readAloud),
  });
}

/** Deixa a promessa da escolha de voz terminar. */
const flush = () => act(async () => {});

describe('Ler respostas em voz alta', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetVoiceCache();
  });

  it('lê em pt-BR (voz melhorada) cada resposta concluída, uma vez', async () => {
    const hook = await setup(true);
    await hook.rerender({ transcript: [user('u1'), assistant('a1', 'Proc', false)] });
    await flush();
    expect(speak).not.toHaveBeenCalled();

    await hook.rerender({ transcript: [user('u1'), assistant('a1', 'Procure a **UBS** mais perto.')] });
    await flush();
    expect(speak).toHaveBeenCalledTimes(1);
    expect(speak).toHaveBeenCalledWith(
      'Procure a UBS mais perto.',
      expect.objectContaining({ language: 'pt-BR', voice: 'pt-enhanced' }),
    );

    await hook.rerender({ transcript: [user('u1'), assistant('a1', 'Procure a **UBS** mais perto.')] });
    await flush();
    expect(speak).toHaveBeenCalledTimes(1);
  });

  it('não lê o que já estava na tela nem fala com a opção desligada', async () => {
    const hook = await setup(true, [user('u0'), assistant('a0', 'Resposta antiga')]);
    await flush();
    expect(speak).not.toHaveBeenCalled();

    const off = await setup(false);
    await off.rerender({ transcript: [user('u1'), assistant('a1', 'Nova resposta')] });
    await flush();
    expect(speak).not.toHaveBeenCalled();
    expect(off.result.current.enabled).toBe(false);
    await hook.unmount();
  });

  it('para quando a pessoa manda outra mensagem, ao sair da tela e ao desmontar', async () => {
    const hook = await setup(true);
    await hook.rerender({ transcript: [user('u1'), assistant('a1', 'Primeira')] });
    await flush();
    stop.mockClear();

    await hook.rerender({ transcript: [user('u1'), assistant('a1', 'Primeira'), user('u2', 'E agora?')] });
    expect(stop).toHaveBeenCalledTimes(1);

    await hook.rerender({ transcript: [user('u1'), assistant('a1', 'Primeira'), user('u2')], active: false });
    expect(stop).toHaveBeenCalledTimes(2);
    expect(hook.result.current.enabled).toBe(false);

    await hook.unmount();
    expect(stop).toHaveBeenCalledTimes(3);
  });

  it('expõe speaking pelos eventos da fala e permite parar', async () => {
    const hook = await setup(true);
    await hook.rerender({ transcript: [user('u1'), assistant('a1', 'Olá')] });
    await flush();
    const options = speak.mock.calls[0][1];
    await act(async () => options?.onStart?.());
    expect(hook.result.current.speaking).toBe(true);
    await act(async () => hook.result.current.stop());
    expect(stop).toHaveBeenCalled();
    expect(hook.result.current.speaking).toBe(false);
  });

  it('deixa o texto bom de ouvir', () => {
    expect(toSpeakableText('# Dica\n- Leve o [cartão](https://sus.gov.br) e *documento*. Veja https://x.y')).toBe(
      'Dica Leve o cartão e documento. Veja',
    );
  });
});
