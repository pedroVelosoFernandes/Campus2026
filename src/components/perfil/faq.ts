/**
 * Perguntas frequentes da tela Ajuda. Orientação geral sobre o acesso ao SUS;
 * a forma de agendar e os horários variam por município.
 */
export type Faq = {
  key: string;
  question: string;
  answer: string;
};

export const FAQS: readonly Faq[] = [
  {
    key: 'marcar-consulta',
    question: 'Como marco uma consulta na UBS?',
    answer:
      'Vá à UBS de referência do seu endereço com documento com foto, Cartão SUS ou CPF e comprovante de ' +
      'endereço. Se ainda não tiver cadastro, a recepção faz na hora. O agendamento pode ser presencial, por ' +
      'telefone ou por um canal da prefeitura, dependendo da cidade. Para algo que não pode esperar, muitas ' +
      'UBS fazem acolhimento no mesmo dia.',
  },
  {
    key: 'cartao-sus',
    question: 'O que é o Cartão SUS e como faço o meu?',
    answer:
      'É o Cartão Nacional de Saúde (CNS), o número que identifica você no SUS em todo o Brasil. O CPF também ' +
      'é aceito para identificar você. Para fazer o cartão, procure uma UBS com documento com foto e CPF. ' +
      'É gratuito, e o número também aparece no app Meu SUS Digital.',
  },
  {
    key: 'meu-sus-digital',
    question: 'Para que serve o app Meu SUS Digital?',
    answer:
      'É o aplicativo oficial do Ministério da Saúde. Com a conta gov.br você vê sua carteira de vacinação ' +
      'digital, o número do Cartão SUS, atendimentos, exames e medicamentos recebidos pelo SUS. Alguns ' +
      'municípios também oferecem agendamento por ele.',
  },
  {
    key: 'disque-136',
    question: 'O que é o Disque Saúde 136?',
    answer:
      'É a central do Ministério da Saúde. A ligação é gratuita e serve para tirar dúvidas sobre serviços, ' +
      'campanhas e direitos no SUS, além de registrar reclamações, sugestões e elogios na Ouvidoria.',
  },
  {
    key: 'onde-ir',
    question: 'Quando procurar UBS, UPA ou hospital?',
    answer:
      'UBS: consultas de rotina, vacinas, acompanhamento e sintomas leves. UPA 24h: urgências que não podem ' +
      'esperar, como febre alta que não passa, cortes ou falta de ar. Em emergência grave, como dor forte no ' +
      'peito, desmaio ou sinais de AVC, ligue 192 (SAMU).',
  },
  {
    key: 'substitui-medico',
    question: 'O Alô Saúde substitui o médico?',
    answer:
      'Não. O app ajuda você a encontrar o caminho certo no SUS, mas não faz diagnóstico nem receita ' +
      'remédios. Na dúvida, procure sua UBS. Em caso de emergência, ligue 192.',
  },
];
