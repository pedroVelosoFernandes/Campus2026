import type { FetchLike } from '@/services/symptom-model/types';

import { readAuthEnv } from './config';
import { createSessionClient, type SessionClient } from './session-client';
import { secureStore } from './storage';

/**
 * `fetch` do app para as rotas `/api`: anexa `Authorization: Bearer <token>`
 * e, se o servidor responder 401, renova a sessão e tenta UMA vez de novo.
 */
export function createApiFetch(client: SessionClient, fetchImpl: FetchLike = (url, init) => fetch(url, init)): FetchLike {
  const withToken = (init: RequestInit | undefined, token: string | null): RequestInit => {
    const headers = { ...((init?.headers as Record<string, string> | undefined) ?? {}) };
    if (token) headers.Authorization = `Bearer ${token}`;
    return { ...init, headers };
  };

  return async (url, init) => {
    const token = await client.getAccessToken();
    const response = await fetchImpl(url, withToken(init, token));
    if (response.status !== 401 || init?.signal?.aborted) return response;
    client.invalidateAccessToken();
    const renewed = await client.getAccessToken();
    if (!renewed || renewed === token) return response;
    return fetchImpl(url, withToken(init, renewed));
  };
}

let sharedClient: SessionClient | null = null;

/** Sessão única do app (a mesma usada pelo AuthProvider). */
export function getSessionClient(): SessionClient {
  sharedClient ??= createSessionClient({ apiUrl: readAuthEnv().apiUrl, store: secureStore });
  return sharedClient;
}

/** `fetch` autenticado compartilhado: use em toda chamada às rotas `/api`. */
export const apiFetch: FetchLike = (url, init) => createApiFetch(getSessionClient())(url, init);
