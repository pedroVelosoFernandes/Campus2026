import type { SavedMessage } from './types';

const TITLE_MAX = 60;

const clean = (text: string) => text.replace(/\s+/g, ' ').trim();

/** Título curto a partir da primeira fala da pessoa (corta na palavra, com reticências). */
export function deriveTitle(messages: readonly SavedMessage[], fallback = 'Conversa'): string {
  const first = messages.find((message) => message.role === 'user' && clean(message.text));
  if (!first) return fallback;
  const text = clean(first.text).replace(/[.!?…]+$/, '');
  if (text.length <= TITLE_MAX) return text;
  const cut = text.slice(0, TITLE_MAX);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 30 ? cut.slice(0, lastSpace) : cut).replace(/[,;:]$/, '')}…`;
}

const MONTHS = ['jan.', 'fev.', 'mar.', 'abr.', 'maio', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'];

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

function clock(date: Date): string {
  const minutes = date.getMinutes();
  return `${date.getHours()}h${minutes ? String(minutes).padStart(2, '0') : ''}`;
}

/** "Hoje, 14h05", "Ontem, 9h", "12 de out." ou "12 de out. de 2025". */
export function formatConversationDate(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const days = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
  if (days === 0) return `Hoje, ${clock(date)}`;
  if (days === 1) return `Ontem, ${clock(date)}`;
  const label = `${date.getDate()} de ${MONTHS[date.getMonth()]}`;
  return date.getFullYear() === now.getFullYear() ? label : `${label} de ${date.getFullYear()}`;
}

/** Id local e não sequencial (não identifica a pessoa). */
export function createConversationId(now: number = Date.now()): string {
  return `conv_${now.toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
