import { createToolBatcher, readDelegationEvent } from '@/features/voice/delegation';
import type { LiveClientEvent, LiveServerEvent } from '@/features/voice/types';

const envelope = (event: Record<string, unknown> & { type: string }): LiveServerEvent => ({
  type: 'response.event',
  delegation_id: 'deleg_1',
  event,
});

describe('readDelegationEvent', () => {
  it('lê chamadas de função do response.output_item.done aninhado', () => {
    const signal = readDelegationEvent(
      envelope({
        type: 'response.output_item.done',
        item: { type: 'function_call', call_id: 'call_1', name: 'buscar_unidades', arguments: '{"servico":"upa"}' },
      }),
    );
    expect(signal).toEqual({
      kind: 'function_call',
      call: { type: 'function_call', call_id: 'call_1', name: 'buscar_unidades', arguments: '{"servico":"upa"}' },
    });
  });

  it('reconhece início e fim da resposta do backend', () => {
    expect(readDelegationEvent(envelope({ type: 'response.created' }))).toEqual({ kind: 'response_started' });
    for (const type of ['response.completed', 'response.failed', 'response.incomplete']) {
      expect(readDelegationEvent(envelope({ type }))).toEqual({ kind: 'response_finished' });
    }
  });

  it('ignora o resto', () => {
    expect(readDelegationEvent({ type: 'session.started' })).toBeNull();
    expect(readDelegationEvent(envelope({ type: 'response.output_item.done', item: { type: 'message' } }))).toBeNull();
    expect(readDelegationEvent(envelope({ type: 'response.function_call_arguments.done', arguments: '{}' }))).toBeNull();
  });
});

describe('createToolBatcher', () => {
  function setup() {
    const sent: LiveClientEvent[] = [];
    let id = 0;
    const batcher = createToolBatcher((event) => sent.push(event), () => `e${++id}`);
    return { sent, batcher, types: () => sent.map((event) => event.type) };
  }

  it('um resultado por chamada e um único response.create depois que a resposta terminou', () => {
    const { batcher, sent, types } = setup();
    batcher.responseStarted();
    batcher.callStarted('a');
    batcher.callStarted('b');
    batcher.submit('a', '"A"');
    batcher.responseFinished();
    expect(types()).toEqual(['response.item.create']);
    batcher.submit('b', '"B"');
    expect(types()).toEqual(['response.item.create', 'response.item.create', 'response.create']);
    expect(sent[0]).toEqual({
      type: 'response.item.create',
      event_id: 'e1',
      item: { type: 'function_call_output', call_id: 'a', output: '"A"' },
    });
  });

  it('resultado antes do fim da resposta espera o response.completed', () => {
    const { batcher, types } = setup();
    batcher.responseStarted();
    batcher.callStarted('a');
    batcher.submit('a', '1');
    expect(types()).toEqual(['response.item.create']);
    batcher.responseFinished();
    expect(types()).toEqual(['response.item.create', 'response.create']);
  });

  it('não reenvia resultados duplicados nem continua respostas sem chamadas', () => {
    const { batcher, types } = setup();
    batcher.responseStarted();
    batcher.responseFinished();
    batcher.submit('desconhecida', 'x');
    expect(types()).toEqual([]);
    batcher.responseStarted();
    batcher.callStarted('a');
    batcher.responseFinished();
    batcher.submit('a', '1');
    batcher.submit('a', '1');
    expect(types()).toEqual(['response.item.create', 'response.create']);
  });

  it('reset descarta chamadas pendentes', () => {
    const { batcher, types } = setup();
    batcher.callStarted('a');
    batcher.reset();
    batcher.submit('a', '1');
    expect(types()).toEqual([]);
  });
});
