import type { FetchLike } from '@/services/health-units/http';

/**
 * `fetch` autenticado do app (token de sessão), carregado só quando usado: o
 * módulo de autenticação depende de armazenamento nativo, que não deve ser
 * inicializado só por abrir a tela ou nos testes que não fazem rede.
 */
export const authFetch: FetchLike = async (url, init) => {
  const { apiFetch } = await import('@/features/auth/api-fetch');
  return apiFetch(url, init);
};
