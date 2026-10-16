import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  buildConversation,
  clearConversations,
  continuationContext,
  createContinuationTransport,
  deleteConversation,
  deriveTitle,
  formatConversationDate,
  getConversation,
  HISTORY_KEY,
  hydrateHistory,
  loadConversations,
  MAX_CONVERSATIONS,
  resetHistoryStore,
  sanitizeConversation,
  upsertConversation,
  type SavedConversation,
} from '@/features/history';
import type { VoiceTransport } from '@/features/voice/types';

const flush = () => new Promise<void>((resolve) => setImmediate(() => resolve()));
const saved = async () => JSON.parse((await AsyncStorage.getItem(HISTORY_KEY)) ?? 'null');

function conversation(id: string, updatedAt = '2026-10-16T12:00:00.000Z'): SavedConversation {
  return {
    id,
    channel: 'texto',
    title: `Conversa ${id}`,
    startedAt: updatedAt,
    updatedAt,
    messages: [{ role: 'user', text: 'Estou com febre.' }],
    outcome: null,
  };
}

describe('título e data', () => {
  it('usa a primeira fala da pessoa, sem pontuação final', () => {
    expect(
      deriveTitle([
        { role: 'assistant', text: 'Olá!' },
        { role: 'user', text: '  Estou com dor de garganta   desde ontem. ' },
      ]),
    ).toBe('Estou com dor de garganta desde ontem');
  });

  it('corta títulos longos na palavra e usa reticências', () => {
    const title = deriveTitle([{ role: 'user', text: 'palavra '.repeat(20) }]);
    expect(title.length).toBeLessThanOrEqual(61);
    expect(title.endsWith('palavra…')).toBe(true);
  });

  it('sem fala da pessoa usa o padrão', () => {
    expect(deriveTitle([{ role: 'assistant', text: 'Oi' }], 'Conversa por voz')).toBe('Conversa por voz');
  });

  it('formata a data relativa', () => {
    const now = new Date(2026, 9, 16, 18, 0);
    expect(formatConversationDate(new Date(2026, 9, 16, 14, 5).toISOString(), now)).toBe('Hoje, 14h05');
    expect(formatConversationDate(new Date(2026, 9, 15, 9, 0).toISOString(), now)).toBe('Ontem, 9h');
    expect(formatConversationDate(new Date(2026, 9, 2, 9, 0).toISOString(), now)).toBe('2 de out.');
    expect(formatConversationDate(new Date(2025, 4, 2, 9, 0).toISOString(), now)).toBe('2 de maio de 2025');
  });
});

describe('buildConversation', () => {
  const base = { id: 'c1', channel: 'texto' as const, startedAt: '2026-10-16T10:00:00.000Z', suggestedAction: null };

  it('não cria registro antes de a pessoa falar', () => {
    expect(buildConversation({ ...base, transcript: [{ id: 'a', role: 'assistant', text: 'Oi', final: true }] })).toBeNull();
  });

  it('guarda só falas finais, título e o próximo passo sugerido', () => {
    const record = buildConversation({
      ...base,
      now: new Date('2026-10-16T10:05:00.000Z'),
      transcript: [
        { id: 'u', role: 'user', text: 'Quero vacinar.', final: true },
        { id: 'r', role: 'analysis', result: {} as never },
        { id: 'a', role: 'assistant', text: 'Vou ajudar', final: false },
      ],
      suggestedAction: { kind: 'vacinacao', label: 'Ver locais de vacinação' },
    });
    expect(record).toEqual({
      id: 'c1',
      channel: 'texto',
      title: 'Quero vacinar',
      startedAt: '2026-10-16T10:00:00.000Z',
      updatedAt: '2026-10-16T10:05:00.000Z',
      messages: [{ role: 'user', text: 'Quero vacinar.' }],
      outcome: { kind: 'vacinacao', label: 'Ver locais de vacinação' },
    });
  });

  it('ao continuar, mantém título, início e falas anteriores', () => {
    const prior = { ...conversation('antiga'), title: 'Febre', startedAt: '2026-10-01T10:00:00.000Z' };
    const record = buildConversation({
      ...base,
      prior,
      transcript: [{ id: 'u', role: 'user', text: 'Melhorei.', final: true }],
    });
    expect(record?.id).toBe('c1');
    expect(record?.title).toBe('Febre');
    expect(record?.startedAt).toBe('2026-10-01T10:00:00.000Z');
    expect(record?.messages.map((m) => m.text)).toEqual(['Estou com febre.', 'Melhorei.']);
  });
});

describe('armazenamento e store', () => {
  beforeEach(async () => {
    resetHistoryStore();
    await AsyncStorage.clear();
  });

  it('descarta registros corrompidos', () => {
    expect(sanitizeConversation({ id: 'x' })).toBeNull();
    expect(sanitizeConversation({ ...conversation('x'), messages: [{ role: 'tool', text: 'a' }] })).toBeNull();
    expect(sanitizeConversation({ ...conversation('x'), outcome: { kind: 'hack', label: 'a' } })?.outcome).toBeNull();
  });

  it('dados ilegíveis voltam vazios', async () => {
    await AsyncStorage.setItem(HISTORY_KEY, '{nada');
    expect(await loadConversations()).toEqual([]);
  });

  it('salva, atualiza pelo id e limita a quantidade', async () => {
    for (let index = 0; index < MAX_CONVERSATIONS + 5; index += 1) {
      upsertConversation(conversation(`c${index}`, new Date(Date.UTC(2026, 0, 1, 0, index)).toISOString()));
    }
    upsertConversation({ ...conversation('c54', '2026-12-01T00:00:00.000Z'), title: 'Atualizada' });
    await flush();
    const list = await saved();
    expect(list).toHaveLength(MAX_CONVERSATIONS);
    expect(list[0]).toMatchObject({ id: 'c54', title: 'Atualizada' });
    expect(list.some((item: SavedConversation) => item.id === 'c0')).toBe(false);
  });

  it('apaga uma e apaga todas', async () => {
    upsertConversation(conversation('a'));
    upsertConversation(conversation('b'));
    deleteConversation('a');
    await flush();
    expect((await saved()).map((item: SavedConversation) => item.id)).toEqual(['b']);
    expect(getConversation('a')).toBeNull();

    clearConversations();
    await flush();
    expect(await AsyncStorage.getItem(HISTORY_KEY)).toBeNull();
  });

  it('o que foi apagado antes de carregar o disco não volta', async () => {
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify([conversation('a'), conversation('b')]));
    deleteConversation('a');
    await hydrateHistory();
    await flush();
    expect(getConversation('a')).toBeNull();
    expect(getConversation('b')).not.toBeNull();
  });
});

describe('continuar conversa', () => {
  it('a primeira mensagem de cada conexão leva o contexto anterior', async () => {
    const sent: unknown[] = [];
    const base: VoiceTransport = {
      connect: jest.fn(async () => {}),
      send: (event) => sent.push(event),
      setMuted: jest.fn(),
      disconnect: jest.fn(async () => {}),
    };
    const transport = createContinuationTransport(base, [
      { role: 'user', text: 'Estou com febre.' },
      { role: 'assistant', text: 'Há quanto tempo?' },
    ]);
    await transport.connect({ onEvent: jest.fn(), onError: jest.fn(), onClose: jest.fn() });
    transport.send({ type: 'app.user_text', event_id: '1', text: 'Dois dias.' });
    transport.send({ type: 'app.user_text', event_id: '2', text: 'Sem tosse.' });

    expect(sent[0]).toMatchObject({ text: expect.stringContaining('Pessoa: Estou com febre.\nAssistente: Há quanto tempo?') });
    expect((sent[0] as { text: string }).text.endsWith('Dois dias.')).toBe(true);
    expect(sent[1]).toMatchObject({ text: 'Sem tosse.' });
  });

  it('o contexto fica dentro do limite, priorizando as falas recentes', () => {
    const messages = Array.from({ length: 50 }, (_, i) => ({ role: 'user' as const, text: `fala ${i} ${'x'.repeat(80)}` }));
    const context = continuationContext(messages, 500);
    expect(context.length).toBeLessThanOrEqual(500);
    expect(context).toContain('fala 49');
    expect(context).not.toContain('fala 0 ');
  });
});
