/**
 * Protocolo do modo texto (`POST /api/assistant-text`). O GPT-Live não aceita
 * texto digitado, então o chat chama a MESMA Responses API do backend de
 * delegação (mesmo modelo, instruções e ferramentas) pelo nosso servidor.
 */

export const MAX_TEXT_ITEMS = 60;
export const MAX_ITEM_CHARS = 4000;

export type TextTurnItem =
  | { role: 'user' | 'assistant'; content: string }
  | { type: 'function_call'; call_id: string; name: string; arguments: string }
  | { type: 'function_call_output'; call_id: string; output: string };

export interface TextTurnRequest {
  input: TextTurnItem[];
}

export interface TextTurnResponse {
  /** Texto final do assistente, quando houver. */
  text: string | null;
  /** Funções que o app deve executar antes do próximo turno. */
  calls: { call_id: string; name: string; arguments: string }[];
}

function isShortString(value: unknown): value is string {
  return typeof value === 'string' && value.length <= MAX_ITEM_CHARS;
}

function parseItem(raw: unknown): TextTurnItem | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const item = raw as Record<string, unknown>;
  if ((item.role === 'user' || item.role === 'assistant') && isShortString(item.content) && item.content.trim()) {
    return { role: item.role, content: item.content };
  }
  if (item.type === 'function_call' && isShortString(item.call_id) && isShortString(item.name)) {
    if (!isShortString(item.arguments)) return null;
    return { type: 'function_call', call_id: item.call_id, name: item.name, arguments: item.arguments };
  }
  if (item.type === 'function_call_output' && isShortString(item.call_id) && isShortString(item.output)) {
    return { type: 'function_call_output', call_id: item.call_id, output: item.output };
  }
  return null;
}

/** Valida o corpo enviado pelo app. Retorna `null` se inválido. */
export function parseTextTurnRequest(raw: unknown): TextTurnRequest | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const input = (raw as { input?: unknown }).input;
  if (!Array.isArray(input) || input.length === 0 || input.length > MAX_TEXT_ITEMS) return null;
  const items = input.map(parseItem);
  if (items.some((item) => item === null)) return null;
  return { input: items as TextTurnItem[] };
}

interface ResponsesOutputItem {
  type?: string;
  call_id?: string;
  name?: string;
  arguments?: string;
  content?: { type?: string; text?: string }[];
}

/** Extrai texto e chamadas de função do retorno bruto da Responses API. */
export function extractTextTurn(payload: { output?: ResponsesOutputItem[] }): TextTurnResponse {
  const texts: string[] = [];
  const calls: TextTurnResponse['calls'] = [];
  for (const item of payload.output ?? []) {
    if (item.type === 'message') {
      for (const part of item.content ?? []) {
        if (part.type === 'output_text' && part.text) texts.push(part.text);
      }
    } else if (item.type === 'function_call' && item.call_id && item.name) {
      calls.push({ call_id: item.call_id, name: item.name, arguments: item.arguments ?? '{}' });
    }
  }
  return { text: texts.length > 0 ? texts.join('\n') : null, calls };
}
