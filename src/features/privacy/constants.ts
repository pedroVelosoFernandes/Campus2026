/**
 * Textos e contatos da tela "Privacidade e dados" (LGPD, Lei 13.709/2018).
 * URL e contato do encarregado são PROVISÓRIOS: substituir pelos oficiais
 * antes de publicar o app.
 */
export const PRIVACY_POLICY_URL = 'https://alosaude.example.org/politica-de-privacidade';

export const DATA_PROTECTION_OFFICER = {
  /** Encarregado pelo tratamento de dados pessoais (art. 41 da LGPD). */
  name: 'Encarregado de dados do Alô Saúde (a definir)',
  email: 'privacidade@alosaude.example.org',
} as const;

export type ProcessedData = {
  key: string;
  title: string;
  description: string;
};

/** O que o app trata, por quê e por quanto tempo, em linguagem simples. */
export const PROCESSED_DATA: readonly ProcessedData[] = [
  {
    key: 'conversas',
    title: 'Conversas com o assistente',
    description:
      'O que você escreve ou fala é enviado ao nosso servidor só para gerar a resposta. ' +
      'Não guardamos as conversas, a não ser que você permita salvar o histórico.',
  },
  {
    key: 'voz',
    title: 'Voz',
    description: 'O áudio é transmitido em tempo real para ser entendido e não é gravado pelo app.',
  },
  {
    key: 'localizacao',
    title: 'Localização',
    description: 'Usada só com sua permissão, para indicar unidades de saúde perto de você. Não é armazenada.',
  },
  {
    key: 'preferencias',
    title: 'Preferências do app',
    description: 'Tamanho do texto, notificações e unidade de referência ficam salvos apenas neste aparelho.',
  },
];
