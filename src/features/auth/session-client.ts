import type { FetchLike } from '@/services/symptom-model/types';

import { apiEndpoint } from './config';
import type { AuthUser, IssuedSession, KeyValueStore, SessionMode, SessionRecord } from './types';

/**
 * Guarda e renova a sessão do app. Todo acesso a `/api` pede o token aqui:
 * - token de acesso válido por mais de `REFRESH_MARGIN_MS` → usa;
 * - senão, renova com o refresh token (`grant: "refresh"`);
 * - sem sessão (convidado, demonstração ou primeira chamada) → pede uma sessão
 *   de convidado (`grant: "guest"`). O assistente funciona sem conta.
 * Chamadas simultâneas compartilham a mesma renovação.
 */

export const SESSION_KEY = 'alo-saude.session';
export const REFRESH_MARGIN_MS = 60_000;

export interface SessionClientOptions {
  apiUrl?: string;
  store: KeyValueStore;
  fetchImpl?: FetchLike;
  now?: () => number;
}

export interface SessionClient {
  load(): Promise<SessionRecord | null>;
  current(): SessionRecord | null;
  /** Grava o modo/usuário e (opcionalmente) a sessão emitida pelo servidor. */
  setSession(mode: SessionMode, issued?: IssuedSession, user?: AuthUser): Promise<void>;
  clear(): Promise<void>;
  /** Token de acesso válido, ou `null` quando não há servidor configurado. */
  getAccessToken(): Promise<string | null>;
  /** Descarta o token de acesso atual (ex.: depois de um 401). */
  invalidateAccessToken(): void;
  /** Avisado quando a sessão de um usuário expira e ele volta a ser convidado. */
  onExpired(listener: () => void): () => void;
}

function parseRecord(raw: string | null): SessionRecord | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as SessionRecord;
    return value.mode === 'user' || value.mode === 'demo' || value.mode === 'guest' ? value : null;
  } catch {
    return null;
  }
}

function isIssuedSession(value: unknown): value is IssuedSession {
  const session = value as Partial<IssuedSession> | null;
  return (
    !!session &&
    typeof session.accessToken === 'string' &&
    typeof session.refreshToken === 'string' &&
    typeof session.expiresAt === 'number'
  );
}

export function createSessionClient(options: SessionClientOptions): SessionClient {
  const doFetch: FetchLike = options.fetchImpl ?? ((url, init) => fetch(url, init));
  const now = options.now ?? Date.now;
  const listeners = new Set<() => void>();
  let record: SessionRecord | null = null;
  let inflight: Promise<string | null> | null = null;

  async function persist(next: SessionRecord | null) {
    record = next;
    if (next) await options.store.setItem(SESSION_KEY, JSON.stringify(next));
    else await options.store.removeItem(SESSION_KEY);
  }

  async function grant(body: Record<string, string>): Promise<IssuedSession | null> {
    if (!options.apiUrl) return null;
    const response = await doFetch(apiEndpoint(options.apiUrl, '/api/auth/session'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { session?: unknown };
    return isIssuedSession(data.session) ? data.session : null;
  }

  async function renew(): Promise<string | null> {
    const base: SessionRecord = record ?? { mode: 'guest' };
    let issued = base.refreshToken ? await grant({ grant: 'refresh', refreshToken: base.refreshToken }) : null;
    if (!issued && base.mode === 'user' && base.refreshToken) {
      // A sessão do usuário venceu: segue como convidado e avisa a interface.
      await persist({ mode: 'guest' });
      listeners.forEach((listener) => listener());
    }
    issued ??= await grant({ grant: 'guest' });
    if (!issued) return null;
    const current = record ?? { mode: 'guest' as const };
    await persist({
      ...current,
      accessToken: issued.accessToken,
      refreshToken: issued.refreshToken,
      expiresAt: issued.expiresAt,
    });
    return issued.accessToken;
  }

  return {
    async load() {
      record = parseRecord(await options.store.getItem(SESSION_KEY));
      return record;
    },
    current: () => record,
    async setSession(mode, issued, user) {
      await persist({
        mode,
        user,
        accessToken: issued?.accessToken,
        refreshToken: issued?.refreshToken,
        expiresAt: issued?.expiresAt,
      });
    },
    async clear() {
      await persist(null);
    },
    async getAccessToken() {
      if (!options.apiUrl) return null;
      if (record?.accessToken && (record.expiresAt ?? 0) - now() > REFRESH_MARGIN_MS) return record.accessToken;
      inflight ??= renew().finally(() => {
        inflight = null;
      });
      return inflight;
    },
    invalidateAccessToken() {
      if (record) record = { ...record, accessToken: undefined, expiresAt: undefined };
    },
    onExpired(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
