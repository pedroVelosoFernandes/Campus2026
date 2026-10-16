/**
 * Notificações FICTÍCIAS da demonstração (campanha, lembrete de consulta e aviso da UBS).
 * Datas e unidades são ilustrativas; num app real viriam da Secretaria de Saúde.
 */
export type AppNotificationKind = 'vacina' | 'consulta' | 'ubs';

export type AppNotification = {
  id: string;
  kind: AppNotificationKind;
  title: string;
  body: string;
  /** Rótulo relativo já pronto para exibição ("Hoje, 8h"). */
  when: string;
  /** Oferece agendar um lembrete local (expo-notifications). */
  reminder?: { title: string; body: string };
};

export const MOCK_NOTIFICATIONS: readonly AppNotification[] = [
  {
    id: 'campanha-gripe-2026',
    kind: 'vacina',
    title: 'Campanha de vacinação contra a gripe',
    body: 'A vacina está disponível nas UBS do seu bairro até 30 de novembro. Leve documento com foto e o Cartão SUS.',
    when: 'Hoje, 8h',
    reminder: {
      title: 'Lembrete: vacina da gripe',
      body: 'A campanha segue nas UBS do seu bairro. Leve documento com foto e o Cartão SUS.',
    },
  },
  {
    id: 'consulta-rotina-ubs',
    kind: 'consulta',
    title: 'Consulta de rotina na terça',
    body: 'Terça-feira, 20 de outubro, às 9h30, na UBS do seu bairro. Chegue 15 minutos antes.',
    when: 'Ontem',
  },
  {
    id: 'aviso-ubs-horario',
    kind: 'ubs',
    title: 'Aviso da UBS do seu bairro',
    body: 'No feriado de 2 de novembro a unidade estará fechada. Em urgência, procure a UPA 24h.',
    when: '12 de out.',
  },
];
