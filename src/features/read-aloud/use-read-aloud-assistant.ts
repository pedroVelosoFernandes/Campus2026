import { useCallback, useEffect, useRef, useState } from 'react';

import { useReadAloud } from '@/features/settings';
import type { TranscriptMessage } from '@/features/voice/types';

import { speakPtBr, stopSpeaking } from './speech';
import { finalAssistantIds, latestUserId, toSpeakableText, unreadAssistantMessages } from './text';

export type ReadAloudOptions = {
  /**
   * `false` pausa a leitura (ex.: a tela perdeu o foco). Padrão: `true`.
   * Com o expo-router: `useReadAloudAssistant(transcript, { active: useIsFocused() })`.
   */
  active?: boolean;
};

export type ReadAloudAssistant = {
  /** `true` enquanto uma resposta está sendo lida. */
  speaking: boolean;
  /** Interrompe a leitura atual (ex.: botão "parar"). */
  stop: () => void;
  /** Se "Ler respostas em voz alta" está ligado (e a tela ativa). */
  enabled: boolean;
};

/**
 * "Ler respostas em voz alta" (Perfil > Acessibilidade) no chat por texto:
 * fala, em pt-BR, cada resposta do assistente assim que ela termina.
 * - Mensagens que já estavam na tela ao abrir (ou ao ligar a opção) não são lidas.
 * - Uma nova mensagem da pessoa, sair da tela ou desligar a opção interrompem a fala.
 */
export function useReadAloudAssistant(
  transcript: readonly TranscriptMessage[],
  { active = true }: ReadAloudOptions = {},
): ReadAloudAssistant {
  const enabled = useReadAloud() && active;
  const [speaking, setSpeaking] = useState(false);
  const handled = useRef<Set<string> | null>(null);
  const lastUser = useRef<string | null>(null);

  const stop = useCallback(() => {
    stopSpeaking();
    setSpeaking(false);
  }, []);

  useEffect(() => {
    const userId = latestUserId(transcript);
    if (handled.current === null) {
      handled.current = new Set(finalAssistantIds(transcript));
      lastUser.current = userId;
      return;
    }
    if (userId !== lastUser.current) {
      lastUser.current = userId;
      // A pessoa mandou outra mensagem: a resposta anterior deixa de importar.
      stopSpeaking();
    }
    const fresh = unreadAssistantMessages(transcript, handled.current);
    for (const message of fresh) handled.current.add(message.id);
    if (!enabled || fresh.length === 0) return;
    const text = toSpeakableText(fresh.map((message) => message.text).join('\n'));
    if (!text) return;
    stopSpeaking();
    void speakPtBr(text, { onStart: () => setSpeaking(true), onEnd: () => setSpeaking(false) });
  }, [transcript, enabled]);

  // Desligar a opção ou sair da tela interrompe a fala (o `onStopped` zera `speaking`).
  useEffect(() => {
    if (!enabled) stopSpeaking();
  }, [enabled]);

  useEffect(() => stopSpeaking, []);

  return { speaking: speaking && enabled, stop, enabled };
}
