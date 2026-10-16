import { appendSpeech, initialVoiceState, voiceReducer, type VoiceAction, type VoiceState } from '@/features/voice/reducer';
import { SYMPTOM_TOOL_NAME, UNITS_TOOL_NAME } from '@/features/voice/tools';
import type { LiveServerEvent } from '@/features/voice/types';
import type { UnitSearchResult } from '@/services/health-units/types';
import { createFallbackResult } from '@/services/symptom-model/parse';
import type { SymptomResult } from '@/services/symptom-model/types';

function run(actions: VoiceAction[], from: VoiceState = initialVoiceState): VoiceState {
  return actions.reduce(voiceReducer, from);
}

const ev = (event: LiveServerEvent): VoiceAction => ({ type: 'server_event', event });
const userSays = (delta: string) => ev({ type: 'session.input_transcript.delta', delta });
const assistantSays = (delta: string) => ev({ type: 'session.output_transcript.delta', delta });
const turnDone = ev({ type: 'app.turn_completed' });

function functionCall(callId: string, name: string, args = '{}'): VoiceAction {
  return ev({
    type: 'response.event',
    delegation_id: 'deleg_1',
    event: { type: 'response.output_item.done', item: { type: 'function_call', call_id: callId, name, arguments: args } },
  });
}

function symptomResult(callId: string, result: SymptomResult): VoiceAction {
  return { type: 'tool_result', callId, outcome: { tool: SYMPTOM_TOOL_NAME, result } };
}

const unitsResult: UnitSearchResult = { servico: 'vacinacao', units: [], usedLocation: false, notice: 'confirme' };
const unitsDone: VoiceAction = { type: 'tool_result', callId: 'call_u', outcome: { tool: UNITS_TOOL_NAME, result: unitsResult } };

const connected = run([{ type: 'start' }, ev({ type: 'session.started' })]);

describe('voiceReducer: ciclo de vida', () => {
  it('idle -> connecting -> listening (session.started ou connected)', () => {
    const connecting = voiceReducer(initialVoiceState, { type: 'start' });
    expect(connecting.status).toBe('connecting');
    expect(voiceReducer(connecting, { type: 'connected' }).status).toBe('listening');
    expect(connected.status).toBe('listening');
  });

  it('ignora start quando já ativo e eventos quando ocioso', () => {
    expect(voiceReducer(connected, { type: 'start' })).toBe(connected);
    expect(voiceReducer(initialVoiceState, userSays('oi'))).toBe(initialVoiceState);
  });

  it('erro de transporte vai para error e start reinicia limpando a conversa', () => {
    const failed = run([userSays('oi'), { type: 'transport_error', message: 'caiu' }], connected);
    expect(failed).toMatchObject({ status: 'error', error: 'caiu' });
    expect(voiceReducer(failed, { type: 'start' })).toMatchObject({ status: 'connecting', transcript: [], error: null });
  });

  it('stop e session.closed voltam para idle mantendo a transcrição finalizada', () => {
    for (const end of [{ type: 'stop' } as VoiceAction, ev({ type: 'session.closed', reason: 'expired' })]) {
      const stopped = run([userSays('oi'), end], connected);
      expect(stopped.status).toBe('idle');
      expect(stopped.transcript).toEqual([{ id: 'user-0', role: 'user', text: 'oi', final: true }]);
    }
  });

  it('evento error registra a mensagem sem derrubar a sessão', () => {
    expect(voiceReducer(connected, ev({ type: 'error', error: { message: 'limite' } }))).toMatchObject({
      status: 'listening',
      error: 'limite',
    });
  });

  it('acks de mudo do servidor atualizam o estado', () => {
    expect(voiceReducer(connected, ev({ type: 'session.input_audio.muted' })).muted).toBe(true);
  });
});

describe('voiceReducer: turnos e transcrição (deltas sem item_id)', () => {
  it('agrupa deltas por falante, preservando espaços', () => {
    const next = run([userSays('Tô com'), userSays(' febre'), assistantSays('Entendi'), assistantSays(', há quanto tempo?')], connected);
    expect(next.transcript).toEqual([
      { id: 'user-0', role: 'user', text: 'Tô com febre', final: true },
      { id: 'assistant-1', role: 'assistant', text: 'Entendi, há quanto tempo?', final: false },
    ]);
    expect(next.status).toBe('assistant_speaking');
  });

  it('silêncio fecha o turno: usuário -> thinking, assistente -> listening', () => {
    const afterUser = run([userSays('oi'), turnDone], connected);
    expect(afterUser.status).toBe('thinking');
    expect(afterUser.transcript[0]).toMatchObject({ final: true });
    expect(run([assistantSays('Olá'), turnDone], afterUser).status).toBe('listening');
  });

  it('um novo turno do mesmo falante após o silêncio vira outra mensagem', () => {
    const next = run([assistantSays('Olá.'), turnDone, assistantSays('Ainda está aí?')], connected);
    expect(next.transcript.map((m) => m.id)).toEqual(['assistant-0', 'assistant-1']);
  });

  it('appendSpeech é pura', () => {
    const before = [{ id: 'user-0', role: 'user' as const, text: 'a', final: false }];
    const after = appendSpeech(before, 'user', 'b');
    expect(before[0].text).toBe('a');
    expect(after[0]).toMatchObject({ text: 'ab' });
  });
});

describe('voiceReducer: delegação e ferramentas', () => {
  it('delegação -> thinking; chamada -> analyzing_symptoms; resultado -> mensagem analysis', () => {
    const thinking = voiceReducer(connected, ev({ type: 'session.delegation.created', delegation: { id: 'd1' } }));
    expect(thinking.status).toBe('thinking');
    const analyzing = voiceReducer(thinking, functionCall('call_1', SYMPTOM_TOOL_NAME));
    expect(analyzing).toMatchObject({ status: 'analyzing_symptoms', pendingTools: [{ callId: 'call_1' }] });
    const result = createFallbackResult();
    const after = voiceReducer(analyzing, symptomResult('call_1', result));
    expect(after).toMatchObject({ status: 'thinking', pendingTools: [] });
    expect(after.transcript.at(-1)).toEqual({ id: `${SYMPTOM_TOOL_NAME}-call_1`, role: 'analysis', result });
  });

  it('ignora outros eventos aninhados, funções desconhecidas e chamadas repetidas', () => {
    const textDelta = ev({ type: 'response.event', event: { type: 'response.output_text.delta', delta: 'x' } });
    expect(voiceReducer(connected, textDelta)).toBe(connected);
    expect(voiceReducer(connected, functionCall('c', 'outra')).status).toBe('listening');
    const once = voiceReducer(connected, functionCall('c1', UNITS_TOOL_NAME));
    expect(voiceReducer(once, functionCall('c1', UNITS_TOOL_NAME))).toBe(once);
  });

  it('não interrompe a fala com status de ferramenta e assenta depois', () => {
    const speaking = run([assistantSays('Um momento'), functionCall('call_u', UNITS_TOOL_NAME)], connected);
    expect(speaking.status).toBe('assistant_speaking');
    expect(voiceReducer(speaking, turnDone).status).toBe('searching_units');
  });

  it('descarta resultado que chega depois do stop', () => {
    const stopped = run([functionCall('call_1', SYMPTOM_TOOL_NAME), { type: 'stop' }], connected);
    expect(voiceReducer(stopped, symptomResult('call_1', createFallbackResult()))).toBe(stopped);
  });
});

describe('voiceReducer: sugestão de tela', () => {
  it('buscar_unidades de vacinação sugere a tela de vacinação', () => {
    const after = run([functionCall('call_u', UNITS_TOOL_NAME), unitsDone], connected);
    expect(after.transcript.at(-1)).toEqual({ id: `${UNITS_TOOL_NAME}-call_u`, role: 'units', result: unitsResult });
    expect(after.suggestedAction).toMatchObject({ kind: 'vacinacao' });
  });

  it('emergência não é substituída por sugestão menos urgente', () => {
    const emergency: SymptomResult = { ...createFallbackResult(), urgency: 'emergencia', recommendedCare: 'samu' };
    const next = run(
      [functionCall('call_1', SYMPTOM_TOOL_NAME), symptomResult('call_1', emergency), functionCall('call_u', UNITS_TOOL_NAME), unitsDone],
      connected,
    );
    expect(next.suggestedAction).toMatchObject({ kind: 'cuidar-saude', emergency: true });
  });

  it('teleconsulta recomendada sugere a tela de teleconsulta', () => {
    const tele: SymptomResult = { ...createFallbackResult(), urgency: 'nao_urgente', recommendedCare: 'teleconsulta' };
    expect(run([symptomResult('call_1', tele)], connected).suggestedAction?.kind).toBe('teleconsulta');
  });

  it('ao encerrar sem sugestão oferece rever a conversa; start limpa', () => {
    const stopped = run([userSays('oi'), { type: 'stop' }], connected);
    expect(stopped.suggestedAction?.kind).toBe('conversas');
    expect(run([{ type: 'stop' }], connected).suggestedAction).toBeNull();
    expect(voiceReducer(stopped, { type: 'start' }).suggestedAction).toBeNull();
  });
});

describe('voiceReducer: modo texto', () => {
  it('mensagem digitada entra como turno final do usuário', () => {
    const next = run([{ type: 'user_text', text: ' Onde tomo vacina? ' }, assistantSays('Na UBS.'), turnDone], connected);
    expect(next.status).toBe('listening');
    expect(next.transcript).toEqual([
      { id: 'user-0', role: 'user', text: 'Onde tomo vacina?', final: true },
      { id: 'assistant-1', role: 'assistant', text: 'Na UBS.', final: true },
    ]);
  });

  it('user_text é ignorado sem sessão ativa', () => {
    expect(voiceReducer(initialVoiceState, { type: 'user_text', text: 'oi' })).toBe(initialVoiceState);
  });
});
