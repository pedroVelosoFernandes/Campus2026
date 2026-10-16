import type { LegalDoc } from './legal-links';

export interface LegalSection {
  heading: string;
  text: string;
}

/**
 * Resumo dos documentos exibido no app. A versão jurídica completa deve ser
 * publicada e configurada em EXPO_PUBLIC_TERMS_URL / EXPO_PUBLIC_PRIVACY_URL.
 */
export const LEGAL_CONTENT: Record<LegalDoc, { title: string; sections: LegalSection[] }> = {
  termos: {
    title: 'Termos de uso',
    sections: [
      {
        heading: 'O que o Alô Saúde faz',
        text: 'Orienta você sobre como acessar serviços do SUS: qual unidade procurar, o que levar e quais canais usar.',
      },
      {
        heading: 'O que ele não faz',
        text: 'Não faz diagnóstico, não receita remédios e não substitui consulta com profissional de saúde. Em emergência, ligue 192 (SAMU).',
      },
      {
        heading: 'Informações dos serviços',
        text: 'Horários e serviços mudam entre municípios. Quando não houver certeza, o app indica como confirmar nos canais oficiais, como o Disque Saúde 136.',
      },
      {
        heading: 'Uso sem conta',
        text: 'Você pode usar o assistente sem entrar. A conta, por celular, serve para guardar seu histórico e seu perfil.',
      },
    ],
  },
  privacidade: {
    title: 'Política de privacidade',
    sections: [
      {
        heading: 'Dados que usamos',
        text: 'O que você conta ao assistente, para orientar você; a localização, só quando você permite; e o celular, se você criar uma conta.',
      },
      {
        heading: 'Para que usamos',
        text: 'Somente para indicar o serviço de saúde adequado e manter seu histórico, com base no seu consentimento (LGPD, art. 7º e 11).',
      },
      {
        heading: 'Como protegemos',
        text: 'A sessão fica guardada com criptografia no aparelho. No servidor, seu celular é identificado por um código irreversível, não pelo número.',
      },
      {
        heading: 'Seus direitos',
        text: 'Você pode pedir acesso, correção ou exclusão dos seus dados e retirar o consentimento a qualquer momento, pelo Perfil ou pela Ajuda.',
      },
    ],
  },
};
