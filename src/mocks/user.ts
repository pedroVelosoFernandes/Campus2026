/** Usuária fictícia usada nas telas enquanto não há autenticação. Dados inventados. */
export type MockUser = {
  firstName: string;
  fullName: string;
  /** Cartão Nacional de Saúde (CNS) fictício, formatado. */
  cns: string;
  birthDate: string;
  city: string;
  referenceUnit: string;
  hasUnreadNotifications: boolean;
};

export const mockUser: MockUser = {
  firstName: 'Ana',
  fullName: 'Ana Souza',
  cns: '700 0000 0000 0000',
  birthDate: '12/03/1991',
  city: 'Recife, PE',
  referenceUnit: 'UBS do seu bairro',
  hasUnreadNotifications: true,
};
