import { readElevenLabsConfig } from '../env';

describe('readElevenLabsConfig', () => {
  it('fica desligada quando a chave não foi preenchida', () => {
    expect(readElevenLabsConfig({})).toBeNull();
    expect(readElevenLabsConfig({ ELEVENLABS_API_KEY: '   ' })).toBeNull();
  });

  it('lê a chave, a voz e o modelo sem espaços extras', () => {
    expect(
      readElevenLabsConfig({
        ELEVENLABS_API_KEY: ' sk_teste ',
        ELEVENLABS_VOICE_ID: 'voz-123',
        ELEVENLABS_MODEL_ID: '',
      }),
    ).toEqual({ apiKey: 'sk_teste', voiceId: 'voz-123', modelId: undefined });
  });
});
