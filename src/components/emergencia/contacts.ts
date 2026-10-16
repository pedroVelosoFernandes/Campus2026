import { Alert, Linking } from 'react-native';

/** Telefones nacionais gratuitos. SAMU, Bombeiros e CVV atendem 24 horas. */
export type EmergencyContact = {
  number: string;
  name: string;
  description: string;
  /** SAMU fica em destaque: é o primeiro número em risco de vida. */
  urgent?: boolean;
};

export const EMERGENCY_CONTACTS: readonly EmergencyContact[] = [
  { number: '192', name: 'SAMU', description: 'Urgência médica: ambulância e orientação por telefone.', urgent: true },
  { number: '193', name: 'Bombeiros', description: 'Acidentes, incêndios, afogamentos e resgates.' },
  { number: '188', name: 'CVV', description: 'Apoio emocional e prevenção do suicídio, com sigilo.' },
  { number: '136', name: 'Disque Saúde', description: 'Dúvidas sobre o SUS e vacinas. Não atende urgências.' },
];

/** Sinais de alerta em que não se deve esperar: ligar 192 ou ir ao pronto-socorro. */
export const WARNING_SIGNS: readonly string[] = [
  'Dor ou aperto no peito',
  'Falta de ar forte ou lábios arroxeados',
  'Boca torta, fala enrolada ou fraqueza de um lado do corpo',
  'Desmaio, convulsão ou confusão de repente',
  'Sangramento que não para',
  'Febre alta com manchas roxas na pele ou rigidez na nuca',
];

export async function callNumber(number: string) {
  try {
    await Linking.openURL(`tel:${number}`);
  } catch {
    Alert.alert('Não foi possível abrir o telefone', `Disque ${number} pelo seu celular.`);
  }
}
