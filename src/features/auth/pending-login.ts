/**
 * Celular em verificação entre a tela de login e a do código. Fica só na
 * memória (não vai para a URL nem para o disco).
 */
export interface PendingLogin {
  phone: string;
  retryAfterSeconds: number;
  hint?: string;
}

let pending: PendingLogin | null = null;

export const setPendingLogin = (value: PendingLogin | null) => {
  pending = value;
};

export const getPendingLogin = () => pending;
