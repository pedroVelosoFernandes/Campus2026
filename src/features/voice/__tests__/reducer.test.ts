import { initialVoiceState, voiceReducer, type VoiceAction, type VoiceState } from '@/features/voice/reducer';
import { SYMPTOM_TOOL_NAME, UNITS_TOOL_NAME } from '@/features/voice/tools';
import type { RealtimeServerEvent } from '@/features/voice/types';
import type { UnitSearchResult } from '@/services/health-units/types';
import { createFallbackResult } from '@/services/symptom-model/parse';
import type { SymptomResult } from '@/services/symptom-model/types';

function run(actions: VoiceAction[], from: VoiceState = initialVoiceState): VoiceState {
  return actions.reduce(voiceReducer, from);
}

const ev = (event: RealtimeServerEvent): VoiceAction => ({ type: 'server_event', event });

function symptomResult(callId: string, result: SymptomResult): VoiceAction {
  return { type: 'tool_result', callId, outcome: { tool: 'analisar_sintomas', result } };
}

const unitsResult: UnitSearchResult = { servico: 'vacinacao', units: [], usedLocation: false, notice: 'confirme' };

const connected = run([{ type: 'start' }, { type: 'connected' }]);

const toolCall = ev({
  type: 'response.function_call_arguments.done',
  call_id: 'call_1',
  name: SYMPTOM_TOOL_NAME,
  arguments: '{"sintomas":["febre"]}',
});

describe('voiceReducer: ciclo de vida', () => {
  it('idle -> connecting -> listening', () => {
    const connecting = voiceReducer(initialVoiceState, { type: 'start' });
    expect(connecting.status).toBe('connecting');
    expect(voiceReducer(connecting, { type: 'connected' }).status).toBe('listening');
    expect(voiceReducer(connecting, ev({ type: 'session.created' })).status).toBe('listening');
  });

  it('ignora start quando já ativo e eventos quando ocioso', () => {
    expect(voiceReducer(connected, { type: 'start' })).toBe(connected);
    const idle = voiceReducer(initialVoiceState, ev({ type: 'input_audio_buffer.speech_started', item_id: 'u1' }));
    expect(idle).toBe(initialVoiceState);
  });

  it('erro de transporte vai para error e start reinicia limpando a conversa', () => {
    const withText = run([ev({ type: 'input_audio_buffer.speech_started', item_id: 'u1' })], connected);
    const failed = voiceReducer(withText, { type: 'transport_error', message: 'caiu' });
    expect(failed).toMatchObject({ status: 'error', error: 'caiu' });
    expect(voiceReducer(failed, { type: 'start' })).toMatchObject({ status: 'connecting', transcript: [], error: null });
  });

  it('stop volta para idle mantendo a transcrição', () => {
    const withText = run([ev({ type: 'input_audio_buffer.speech_started', item_id: 'u1' })], connected);
    const stopped = voiceReducer(withText, { type: 'stop' });
    expect(stopped.status).toBe('idle');
    expect(stopped.transcript).toHaveLength(1);
  });

  it('evento error do servidor registra a mensagem sem derrubar a sessão', () => {
    const next = voiceReducer(connected, ev({ type: 'error', error: { message: 'limite' } }));
    expect(next).toMatchObject({ status: 'listening', error: 'limite' });
  });
});

describe('voiceReducer: turnos de fala', () => {
  it('usuário fala -> thinking -> assistente fala -> listening', () => {
    const userSpeaking = run([ev({ type: 'input_audio_buffer.speech_started', item_id: 'u1' })], connected);
    expect(userSpeaking.status).toBe('user_speaking');
    const thinking = run([ev({ type: 'input_audio_buffer.speech_stopped', item_id: 'u1' })], userSpeaking);
    expect(thinking.status).toBe('thinking');
    const speaking = run(
      [
        ev({ type: 'response.created' }),
        ev({ type: 'output_audio_buffer.started' }),
        ev({ type: 'response.output_audio_transcript.delta', item_id: 'a1', delta: 'Olá' }),
        ev({ type: 'response.done', response: { status: 'completed' } }),
      ],
      thinking,
    );
    expect(speaking.status).toBe('assistant_speaking');
    expect(run([ev({ type: 'output_audio_buffer.stopped' })], speaking).status).toBe('listening');
  });

  it('response.done sem áudio tocando volta para listening', () => {
    const next = run(
      [
        ev({ type: 'response.output_audio_transcript.delta', item_id: 'a1', delta: 'Oi' }),
        ev({ type: 'response.done' }),
      ],
      connected,
    );
    expect(next.status).toBe('listening');
  });

  it('interrupção do usuário durante a fala do assistente', () => {
    const next = run(
      [
        ev({ type: 'output_audio_buffer.started' }),
        ev({ type: 'input_audio_buffer.speech_started', item_id: 'u2' }),
        ev({ type: 'response.done', response: { status: 'cancelled' } }),
      ],
      connected,
    );
    expect(next).toMatchObject({ status: 'user_speaking', audioPlaying: false });
  });
});

describe('voiceReducer: transcrição', () => {
  it('acumula deltas do assistente e finaliza com o texto completo', () => {
    const next = run(
      [
        ev({ type: 'response.output_audio_transcript.delta', item_id: 'a1', delta: 'Olá,' }),
        ev({ type: 'response.output_audio_transcript.delta', item_id: 'a1', delta: ' tudo bem?' }),
      ],
      connected,
    );
    expect(next.transcript).toEqual([{ id: 'a1', role: 'assistant', text: 'Olá, tudo bem?', final: false }]);
    const done = voiceReducer(
      next,
      ev({ type: 'response.output_audio_transcript.done', item_id: 'a1', transcript: 'Olá, tudo bem?' }),
    );
    expect(done.transcript[0]).toMatchObject({ final: true, text: 'Olá, tudo bem?' });
  });

  it('mantém a ordem: mensagem do usuário reservada no speech_started', () => {
    const next = run(
      [
        ev({ type: 'input_audio_buffer.speech_started', item_id: 'u1' }),
        ev({ type: 'input_audio_buffer.speech_stopped', item_id: 'u1' }),
        ev({ type: 'response.output_audio_transcript.delta', item_id: 'a1', delta: 'Certo.' }),
        ev({ type: 'conversation.item.input_audio_transcription.completed', item_id: 'u1', transcript: ' Estou com febre ' }),
      ],
      connected,
    );
    expect(next.transcript.map((m) => m.id)).toEqual(['u1', 'a1']);
    expect(next.transcript[0]).toEqual({ id: 'u1', role: 'user', text: 'Estou com febre', final: true });
  });

  it('transcrição do usuário sem speech_started é anexada ao fim', () => {
    const next = run(
      [ev({ type: 'conversation.item.input_audio_transcription.completed', item_id: 'u9', transcript: 'Oi' })],
      connected,
    );
    expect(next.transcript).toEqual([{ id: 'u9', role: 'user', text: 'Oi', final: true }]);
  });
});

describe('voiceReducer: análise de sintomas', () => {
  it('tool call -> analyzing_symptoms -> resultado anexado -> thinking', () => {
    const analyzing = run([toolCall, ev({ type: 'response.done' })], connected);
    expect(analyzing).toMatchObject({ status: 'analyzing_symptoms', pendingTools: [{ callId: 'call_1' }] });
    const result = createFallbackResult();
    const after = voiceReducer(analyzing, symptomResult('call_1', result));
    expect(after).toMatchObject({ status: 'thinking', pendingTools: [] });
    expect(after.transcript.at(-1)).toEqual({ id: 'analisar_sintomas-call_1', role: 'analysis', result });
  });

  it('ignora chamadas de outras funções', () => {
    const next = voiceReducer(
      connected,
      ev({ type: 'response.function_call_arguments.done', call_id: 'c', name: 'outra', arguments: '{}' }),
    );
    expect(next.status).toBe('listening');
  });

  it('descarta resultado que chega depois do stop', () => {
    const stopped = run([toolCall, { type: 'stop' }], connected);
    expect(voiceReducer(stopped, symptomResult('call_1', createFallbackResult()))).toBe(stopped);
  });
});

describe('voiceReducer: busca de unidades e sugestão de tela', () => {
  const unitsCall = ev({
    type: 'response.function_call_arguments.done',
    call_id: 'call_u',
    name: UNITS_TOOL_NAME,
    arguments: '{"servico":"vacinacao"}',
  });

  it('buscar_unidades -> searching_units -> mensagem units + sugestão vacinação', () => {
    const searching = voiceReducer(connected, unitsCall);
    expect(searching.status).toBe('searching_units');
    const after = voiceReducer(searching, {
      type: 'tool_result',
      callId: 'call_u',
      outcome: { tool: 'buscar_unidades', result: unitsResult },
    });
    expect(after.transcript.at(-1)).toEqual({ id: 'buscar_unidades-call_u', role: 'units', result: unitsResult });
    expect(after.suggestedAction).toMatchObject({ kind: 'vacinacao' });
  });

  it('emergência não é substituída por sugestão menos urgente', () => {
    const emergency: SymptomResult = { ...createFallbackResult(), urgency: 'emergencia', recommendedCare: 'samu' };
    const next = run(
      [
        toolCall,
        symptomResult('call_1', emergency),
        unitsCall,
        { type: 'tool_result', callId: 'call_u', outcome: { tool: 'buscar_unidades', result: unitsResult } },
      ],
      connected,
    );
    expect(next.suggestedAction).toMatchObject({ kind: 'cuidar-saude', emergency: true });
  });

  it('teleconsulta recomendada sugere a tela de teleconsulta', () => {
    const tele: SymptomResult = { ...createFallbackResult(), urgency: 'nao_urgente', recommendedCare: 'teleconsulta' };
    expect(run([toolCall, symptomResult('call_1', tele)], connected).suggestedAction?.kind).toBe('teleconsulta');
  });

  it('ao encerrar sem sugestão, oferece rever a conversa', () => {
    const next = run([ev({ type: 'input_audio_buffer.speech_started', item_id: 'u1' }), { type: 'stop' }], connected);
    expect(next.suggestedAction?.kind).toBe('conversas');
    expect(run([{ type: 'stop' }], connected).suggestedAction).toBeNull();
  });

  it('start limpa a sugestão anterior', () => {
    const stopped = run([ev({ type: 'input_audio_buffer.speech_started', item_id: 'u1' }), { type: 'stop' }], connected);
    expect(voiceReducer(stopped, { type: 'start' }).suggestedAction).toBeNull();
  });
});

describe('voiceReducer: modo texto', () => {
  it('mensagem digitada entra na transcrição e a resposta em texto é acumulada', () => {
    const next = run(
      [
        { type: 'user_text', id: 'local_1', text: ' Onde tomo vacina? ' },
        ev({ type: 'response.output_text.delta', item_id: 'a1', delta: 'Na' }),
        ev({ type: 'response.output_text.delta', item_id: 'a1', delta: ' UBS.' }),
      ],
      connected,
    );
    expect(next.status).toBe('assistant_speaking');
    const done = run([ev({ type: 'response.output_text.done', item_id: 'a1', text: 'Na UBS.' }), ev({ type: 'response.done' })], next);
    expect(done.status).toBe('listening');
    expect(done.transcript).toEqual([
      { id: 'local_1', role: 'user', text: 'Onde tomo vacina?', final: true },
      { id: 'a1', role: 'assistant', text: 'Na UBS.', final: true },
    ]);
  });

  it('user_text é ignorado sem sessão ativa', () => {
    expect(voiceReducer(initialVoiceState, { type: 'user_text', id: 'x', text: 'oi' })).toBe(initialVoiceState);
  });
});
