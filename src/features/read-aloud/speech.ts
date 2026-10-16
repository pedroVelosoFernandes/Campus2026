import * as Speech from 'expo-speech';

/** Idioma das respostas lidas em voz alta. */
export const READ_ALOUD_LANGUAGE = 'pt-BR';

const isPtBr = (language: string) => language.replace('_', '-').toLowerCase() === 'pt-br';

let voicePromise: Promise<string | undefined> | null = null;

/**
 * Melhor voz em português do Brasil instalada no aparelho (prefere a de
 * qualidade "Enhanced"). Sem nenhuma, o sistema escolhe pela língua.
 */
export function resolvePtBrVoice(): Promise<string | undefined> {
  voicePromise ??= Speech.getAvailableVoicesAsync()
    .then((voices) => {
      const ptBr = voices.filter((voice) => isPtBr(voice.language));
      const best = ptBr.find((voice) => voice.quality === Speech.VoiceQuality.Enhanced) ?? ptBr[0];
      return best?.identifier;
    })
    .catch(() => undefined);
  return voicePromise;
}

/** Só para testes: esquece a voz escolhida. */
export function resetVoiceCache(): void {
  voicePromise = null;
}

export type SpeakCallbacks = { onStart?: () => void; onEnd?: () => void };

export async function speakPtBr(text: string, { onStart, onEnd }: SpeakCallbacks = {}): Promise<void> {
  const voice = await resolvePtBrVoice();
  Speech.speak(text, {
    language: READ_ALOUD_LANGUAGE,
    voice,
    rate: 1,
    onStart,
    onDone: onEnd,
    onStopped: onEnd,
    onError: onEnd,
  });
}

export function stopSpeaking(): void {
  Speech.stop().catch(() => {});
}
