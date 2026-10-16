/** Pessoa autenticada no app. Nunca guarda CPF: `id` é um pseudônimo do servidor. */
export interface AuthUser {
  id: string;
  /** Celular mascarado para exibição, ex.: `(11) •••••-4321`. Nunca o número inteiro. */
  phoneMasked: string;
  /** Login de demonstração (sem servidor): tudo local, código fixo. */
  demo?: boolean;
}

/** `loading` só no boot; `signedOut` = ainda não escolheu entrar ou seguir como convidado. */
export type AuthStatus = 'loading' | 'signedOut' | 'guest' | 'signedIn';

/** Como a pessoa está usando o app (persistido no armazenamento seguro). */
export type SessionMode = 'user' | 'demo' | 'guest';

/** Sessão emitida pelo servidor (`/api/auth/*`). */
export interface IssuedSession {
  accessToken: string;
  refreshToken: string;
  /** Expiração do token de acesso (ms desde a época). */
  expiresAt: number;
  kind: 'user' | 'guest';
}

export interface SessionRecord {
  mode: SessionMode;
  user?: AuthUser;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
}

/** Armazenamento chave-valor assíncrono (SecureStore no app, memória nos testes). */
export interface KeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}
