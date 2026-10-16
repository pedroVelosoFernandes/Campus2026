import { createTextTransport, TEXT_FALLBACK_REPLY, trimHistory } from '@/features/voice/text/text-transport';
import type { LiveServerEvent } from '@/features/voice/types';
import { MAX_TEXT_ITEMS, type TextTurnItem } from '@/services/text-assistant/protocol';

function jsonResponse(body: unknown, status = 200) {
  return { ok: status < 300, status, json: async () => body } as Response;
}

async function flush() {
  for (let i = 0; i < 5; i++) await Promise.resolve();
}

function setup(responses: Response[]) {
  const fetchImpl = jest.fn();
  responses.forEach((response) => fetchImpl.mockResolvedValueOnce(response));
  const events: LiveServerEvent[] = [];
  const transport = createTextTransport({ apiUrl: 'https://api.exemplo', fetchImpl });
  const handlers = { onEvent: (event: LiveServerEvent) => events.push(event), onError: jest.fn(), onClose: jest.fn() };
  const bodies = () => fetchImpl.mock.calls.map(([, init]) => JSON.parse(init.body));
  return { transport, handlers, events, fetchImpl, bodies };
}

describe('createTextTransport', () => {
  it('traduz o turno de texto nos mesmos eventos do GPT-Live', async () => {
    const { transport, handlers, events, fetchImpl, bodies } = setup([jsonResponse({ text: 'Vá à UBS.', calls: [] })]);
    await transport.connect(handlers);
    expect(events[0]).toEqual({ type: 'session.started' });

    transport.send({ type: 'app.user_text', event_id: 'e1', text: 'Onde marco consulta?' });
    await flush();

    expect(fetchImpl.mock.calls[0][0]).toBe('https://api.exemplo/api/assistant-text');
    expect(bodies()[0]).toEqual({ input: [{ role: 'user', content: 'Onde marco consulta?' }] });
    expect(events).toContainEqual({ type: 'session.output_transcript.delta', delta: 'Vá à UBS.' });
    expect(events.at(-1)).toEqual({ type: 'app.turn_completed' });
  });

  it('chamadas de função viram envelopes response.event e os resultados voltam no próximo turno', async () => {
    const call = { call_id: 'c1', name: 'buscar_unidades', arguments: '{"servico":"upa"}' };
    const { transport, handlers, events, bodies } = setup([
      jsonResponse({ text: null, calls: [call] }),
      jsonResponse({ text: 'A UPA Centro atende 24h.', calls: [] }),
    ]);
    await transport.connect(handlers);
    transport.send({ type: 'app.user_text', event_id: 'e1', text: 'Preciso de UPA' });
    await flush();

    expect(events).toContainEqual({
      type: 'response.event',
      event: { type: 'response.output_item.done', item: { type: 'function_call', ...call } },
    });
    expect(events.at(-1)).toEqual({ type: 'response.event', event: { type: 'response.completed' } });

    transport.send({
      type: 'response.item.create',
      event_id: 'e2',
      item: { type: 'function_call_output', call_id: 'c1', output: '{"units":[]}' },
    });
    transport.send({ type: 'response.create', event_id: 'e3' });
    await flush();

    expect(bodies()[1].input).toEqual([
      { role: 'user', content: 'Preciso de UPA' },
      { type: 'function_call', ...call },
      { type: 'function_call_output', call_id: 'c1', output: '{"units":[]}' },
    ]);
    expect(events).toContainEqual({ type: 'session.output_transcript.delta', delta: 'A UPA Centro atende 24h.' });
  });

  it('falha do servidor vira resposta segura e não derruba a conversa', async () => {
    const { transport, handlers, events } = setup([jsonResponse({}, 502)]);
    await transport.connect(handlers);
    transport.send({ type: 'app.user_text', event_id: 'e1', text: 'oi' });
    await flush();
    expect(events).toContainEqual({ type: 'session.output_transcript.delta', delta: TEXT_FALLBACK_REPLY });
    expect(events.some((event) => event.type === 'error')).toBe(true);
    expect(handlers.onError).not.toHaveBeenCalled();
  });
});

describe('trimHistory', () => {
  it('limita o tamanho e começa por uma mensagem do usuário', () => {
    const items: TextTurnItem[] = [];
    for (let i = 0; i < 40; i++) {
      items.push({ role: 'user', content: `p${i}` }, { type: 'function_call_output', call_id: `c${i}`, output: '{}' });
    }
    const trimmed = trimHistory(items);
    expect(trimmed.length).toBeLessThanOrEqual(MAX_TEXT_ITEMS);
    expect(trimmed[0]).toMatchObject({ role: 'user' });
    expect(trimHistory(items.slice(0, 4))).toHaveLength(4);
  });
});
