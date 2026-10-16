import type { LiveClientEvent, VoiceTransport } from '@/features/voice/types';

import type { SavedMessage } from './types';

/** Limite do item de texto aceito por /api/assistant-text (MAX_ITEM_CHARS). */
const MAX_CONTEXT_CHARS = 3200;

/** Resumo das últimas falas para o modelo retomar o assunto. */
export function continuationContext(messages: readonly SavedMessage[], maxChars = MAX_CONTEXT_CHARS): string {
  const lines: string[] = [];
  let size = 0;
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    const line = `${message.role === 'user' ? 'Pessoa' : 'Assistente'}: ${message.text}`;
    if (size + line.length > maxChars) break;
    lines.unshift(line);
    size += line.length + 1;
  }
  return lines.join('\n');
}

export function withContext(text: string, context: string): string {
  if (!context) return text;
  return `[Conversa anterior, retomada pela pessoa]\n${context}\n\n[Nova mensagem]\n${text}`;
}

/**
 * Envolve o transporte de texto para "Continuar conversa": a primeira mensagem
 * de cada conexão leva o contexto da conversa salva (o transporte zera o
 * histórico ao conectar). A transcrição na tela mostra só o que a pessoa digitou.
 */
export function createContinuationTransport(base: VoiceTransport, prior: readonly SavedMessage[]): VoiceTransport {
  const context = continuationContext(prior);
  let pending = true;
  return {
    connect(handlers) {
      pending = true;
      return base.connect(handlers);
    },
    send(event: LiveClientEvent) {
      if (event.type === 'app.user_text' && pending) {
        pending = false;
        base.send({ ...event, text: withContext(event.text, context) });
        return;
      }
      base.send(event);
    },
    setMuted: (muted) => base.setMuted(muted),
    disconnect: () => base.disconnect(),
  };
}
